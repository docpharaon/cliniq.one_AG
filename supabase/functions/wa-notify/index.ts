// ─────────────────────────────────────────────────────
// Supabase Edge Function: wa-notify
// Processes queued booking notifications via Twilio
// Supports WhatsApp (primary) + SMS (fallback)
// Markets: KSA (+966) / UAE (+971)
// ─────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Twilio credentials — resolved at runtime:
//   1. Supabase secrets (env vars via `npx supabase secrets set`)
//   2. Fallback: platform_settings table (set via Admin Panel → Settings)
let TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
let TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
let TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') || '';
let TWILIO_SMS_FROM = Deno.env.get('TWILIO_SMS_FROM') || '';

async function loadTwilioFromDb(supabase: ReturnType<typeof createClient>) {
    const keys = ['twilio_account_sid', 'twilio_auth_token', 'twilio_whatsapp_from', 'twilio_sms_from'];
    const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', keys);

    if (!data) return;
    const map = new Map(data.map((r: { key: string; value: string }) => [r.key, r.value]));
    if (!TWILIO_ACCOUNT_SID) TWILIO_ACCOUNT_SID = map.get('twilio_account_sid') || '';
    if (!TWILIO_AUTH_TOKEN)   TWILIO_AUTH_TOKEN  = map.get('twilio_auth_token') || '';
    if (!TWILIO_WHATSAPP_FROM) TWILIO_WHATSAPP_FROM = map.get('twilio_whatsapp_from') || 'whatsapp:+14155238886';
    if (!TWILIO_SMS_FROM)     TWILIO_SMS_FROM    = map.get('twilio_sms_from') || '';
}

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// ── Types ────────────────────────────────────────────

interface NotificationRow {
    id: string;
    booking_id: string;
    channel: 'whatsapp' | 'sms';
    notification_type: 'confirmation' | 'reminder_24h' | 'reminder_2h' | 'cancellation';
    recipient_phone: string;
    message_body: string | null;
    message_sid: string | null;
    status: string;
}

interface BookingRow {
    id: string;
    doctor_id: string;
    location_id: string;
    patient_name: string;
    patient_phone: string;
    patient_language: string;
    booking_date: string;
    booking_time: string;
    status: string;
}

interface LocationRow {
    name: string;
    name_ar: string;
    address: string;
    address_ar: string;
}

interface DoctorRow {
    display_name: string;
    full_name: string;
}

// ── Phone Number Formatting ─────────────────────────

function normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Saudi: 05x → +9665x
    if (cleaned.startsWith('05') && cleaned.length === 10) {
        cleaned = '+966' + cleaned.substring(1);
    }
    // UAE: 05x → +9715x
    if (cleaned.startsWith('0') && cleaned.length === 10 && !cleaned.startsWith('+')) {
        cleaned = '+971' + cleaned.substring(1);
    }
    // Ensure + prefix
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    return cleaned;
}

// ── Day Names ───────────────────────────────────────

const DAY_NAMES_AR: Record<string, string> = {
    'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء',
    'Wednesday': 'الأربعاء', 'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت',
};

const MONTH_NAMES_AR: Record<number, string> = {
    1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل', 5: 'مايو', 6: 'يونيو',
    7: 'يوليو', 8: 'أغسطس', 9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر',
};

function formatDateAr(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const dayName = DAY_NAMES_AR[d.toLocaleDateString('en-US', { weekday: 'long' })] || '';
    const day = d.getDate();
    const month = MONTH_NAMES_AR[d.getMonth() + 1] || '';
    return `${dayName} ${day} ${month}`;
}

function formatDateEn(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime12(timeStr: string, lang: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── Message Templates ───────────────────────────────

function buildMessage(
    type: string,
    lang: string,
    booking: BookingRow,
    doctor: DoctorRow,
    location: LocationRow,
    cancelLink?: string,
): string {
    const docName = lang === 'ar' ? `د. ${doctor.full_name || doctor.display_name}` : `Dr. ${doctor.display_name}`;
    const locName = lang === 'ar' ? (location.name_ar || location.name) : location.name;
    const date = lang === 'ar' ? formatDateAr(booking.booking_date) : formatDateEn(booking.booking_date);
    const time = formatTime12(booking.booking_time, lang);

    switch (type) {
        case 'confirmation':
            if (lang === 'ar') {
                return `✅ تم تأكيد موعدك

👨‍⚕️ ${docName}
📍 ${locName}
📅 ${date}
🕐 ${time}

بتوصلك رسالة تذكير قبل الموعد.${cancelLink ? `\n\nللإلغاء: ${cancelLink}` : ''}`;
            }
            return `✅ Appointment Confirmed

👨‍⚕️ ${docName}
📍 ${locName}
📅 ${date}
🕐 ${time}

You'll receive a reminder before your appointment.${cancelLink ? `\n\nTo cancel: ${cancelLink}` : ''}`;

        case 'reminder_24h':
            if (lang === 'ar') {
                return `⏰ تذكير: لديك موعد غداً

👨‍⚕️ ${docName}
📍 ${locName}
🕐 ${time}${cancelLink ? `\n\nللإلغاء: ${cancelLink}` : ''}`;
            }
            return `⏰ Reminder: You have an appointment tomorrow

👨‍⚕️ ${docName}
📍 ${locName}
🕐 ${time}${cancelLink ? `\n\nTo cancel: ${cancelLink}` : ''}`;

        case 'reminder_2h':
            if (lang === 'ar') {
                return `🔔 موعدك بعد ساعتين

👨‍⚕️ ${docName}
📍 ${locName}
🕐 ${time}`;
            }
            return `🔔 Your appointment is in 2 hours

👨‍⚕️ ${docName}
📍 ${locName}
🕐 ${time}`;

        case 'cancellation':
            if (lang === 'ar') {
                return `❌ تم إلغاء موعدك

👨‍⚕️ ${docName}
📅 ${date}
🕐 ${time}

لحجز موعد جديد، تواصل مع عيادة طبيبك.`;
            }
            return `❌ Appointment Cancelled

👨‍⚕️ ${docName}
📅 ${date}
🕐 ${time}

To book a new appointment, contact your doctor's clinic.`;

        default:
            return `Notification from cliniq.one`;
    }
}

// ── Twilio API Calls ────────────────────────────────

async function sendTwilioWhatsApp(to: string, body: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${normalizePhone(to)}`;
    
    const params = new URLSearchParams({
        From: TWILIO_WHATSAPP_FROM,
        To: toFormatted,
        Body: body,
    });

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const data = await resp.json();
        if (resp.ok && data.sid) {
            return { ok: true, sid: data.sid };
        }
        return { ok: false, error: data.message || `HTTP ${resp.status}` };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
}

async function sendTwilioSms(to: string, body: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
    if (!TWILIO_SMS_FROM) {
        return { ok: false, error: 'SMS_FROM not configured' };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const params = new URLSearchParams({
        From: TWILIO_SMS_FROM,
        To: normalizePhone(to),
        Body: body,
    });

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const data = await resp.json();
        if (resp.ok && data.sid) {
            return { ok: true, sid: data.sid };
        }
        return { ok: false, error: data.message || `HTTP ${resp.status}` };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
}

// ── Process Queue ───────────────────────────────────

async function processQueue(supabase: ReturnType<typeof createClient>): Promise<{
    processed: number;
    sent: number;
    failed: number;
    errors: string[];
}> {
    const result = { processed: 0, sent: 0, failed: 0, errors: [] as string[] };

    // Fetch queued notifications (limit batch to 50)
    const { data: queue, error: qErr } = await supabase
        .from('wa_notification_log')
        .select('*')
        .eq('status', 'queued')
        .order('sent_at', { ascending: true })
        .limit(50);

    if (qErr || !queue || queue.length === 0) {
        return result;
    }

    for (const notif of queue as NotificationRow[]) {
        result.processed++;

        try {
            // Fetch booking details
            const { data: booking } = await supabase
                .from('wa_bookings')
                .select('*')
                .eq('id', notif.booking_id)
                .single();

            if (!booking) {
                await supabase
                    .from('wa_notification_log')
                    .update({ status: 'failed', error_message: 'Booking not found' })
                    .eq('id', notif.id);
                result.failed++;
                continue;
            }

            // Fetch doctor
            const { data: doctor } = await supabase
                .from('doctors')
                .select('display_name, full_name')
                .eq('id', booking.doctor_id)
                .single();

            // Fetch location
            const { data: location } = await supabase
                .from('doctor_locations')
                .select('name, name_ar, address, address_ar')
                .eq('id', booking.location_id)
                .single();

            if (!doctor || !location) {
                await supabase
                    .from('wa_notification_log')
                    .update({ status: 'failed', error_message: 'Doctor or location not found' })
                    .eq('id', notif.id);
                result.failed++;
                continue;
            }

            // Build message
            const lang = booking.patient_language || 'ar';
            const messageBody = buildMessage(
                notif.notification_type,
                lang,
                booking as BookingRow,
                doctor as DoctorRow,
                location as LocationRow,
            );

            // Try WhatsApp first
            let sendResult = await sendTwilioWhatsApp(notif.recipient_phone, messageBody);
            let channel: 'whatsapp' | 'sms' = 'whatsapp';

            // Fallback to SMS if WhatsApp fails
            if (!sendResult.ok && TWILIO_SMS_FROM) {
                console.log(`[wa-notify] WhatsApp failed for ${notif.id}, trying SMS: ${sendResult.error}`);
                sendResult = await sendTwilioSms(notif.recipient_phone, messageBody);
                channel = 'sms';
            }

            if (sendResult.ok) {
                await supabase
                    .from('wa_notification_log')
                    .update({
                        status: 'sent',
                        channel,
                        message_body: messageBody,
                        message_sid: sendResult.sid || null,
                    })
                    .eq('id', notif.id);

                // Update booking notification flags
                const flagUpdate: Record<string, boolean> = {};
                if (notif.notification_type === 'confirmation') flagUpdate.confirmation_sent = true;
                if (notif.notification_type === 'reminder_24h') flagUpdate.reminder_24h_sent = true;
                if (notif.notification_type === 'reminder_2h') flagUpdate.reminder_2h_sent = true;

                if (Object.keys(flagUpdate).length > 0) {
                    await supabase
                        .from('wa_bookings')
                        .update(flagUpdate)
                        .eq('id', notif.booking_id);
                }

                result.sent++;
            } else {
                await supabase
                    .from('wa_notification_log')
                    .update({
                        status: 'failed',
                        message_body: messageBody,
                        error_message: sendResult.error || 'Unknown error',
                    })
                    .eq('id', notif.id);
                result.failed++;
                result.errors.push(`${notif.id}: ${sendResult.error}`);
            }
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            await supabase
                .from('wa_notification_log')
                .update({ status: 'failed', error_message: errMsg })
                .eq('id', notif.id);
            result.failed++;
            result.errors.push(`${notif.id}: ${errMsg}`);
        }
    }

    return result;
}

// ── Main Handler ────────────────────────────────────

serve(async (req: Request) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Load Twilio creds from DB if env vars not set
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
            await loadTwilioFromDb(supabase);
        }

        // Validate Twilio credentials are set (from env or DB)
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
            return new Response(JSON.stringify({
                error: 'Twilio credentials not configured',
                hint: 'Set via Admin Panel → Settings → Twilio/WhatsApp, or use supabase secrets set',
            }), {
                status: 500,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // Parse optional body for manual actions
        let action = 'process_queue';
        try {
            const body = await req.json();
            if (body.action) action = body.action;

            // Manual: send a specific notification
            if (action === 'send_single' && body.notification_id) {
                await supabase
                    .from('wa_notification_log')
                    .update({ status: 'queued' })
                    .eq('id', body.notification_id);
            }

            // Manual: flag reminders
            if (action === 'flag_reminders') {
                const { data: reminderResult } = await supabase.rpc('wa_send_reminders');
                return new Response(JSON.stringify({
                    action: 'flag_reminders',
                    result: reminderResult,
                }), {
                    status: 200,
                    headers: { ...CORS, 'Content-Type': 'application/json' },
                });
            }
        } catch {
            // No body or invalid JSON — just process queue
        }

        // Process the notification queue
        const result = await processQueue(supabase);

        return new Response(JSON.stringify({
            action,
            ...result,
            timestamp: new Date().toISOString(),
        }), {
            status: 200,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('[wa-notify] Error:', err);
        return new Response(JSON.stringify({
            error: 'Internal error',
            details: err instanceof Error ? err.message : String(err),
        }), {
            status: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
});
