// ─────────────────────────────────────────────────────
// Supabase Edge Function: wa-notify
// Processes queued booking notifications via Meta Cloud API
// Supports WhatsApp (primary) + SMS (fallback via Twilio)
// Markets: KSA (+966) / UAE (+971)
// ─────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Meta credentials (resolved from platform_settings)
let META_PHONE_NUMBER_ID = Deno.env.get('META_WA_PHONE_NUMBER_ID') || '';
let META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN') || '';

// Twilio credentials (only for SMS fallback)
let TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
let TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
let TWILIO_SMS_FROM = Deno.env.get('TWILIO_SMS_FROM') || '';

async function loadSettingsFromDb(supabase: ReturnType<typeof createClient>) {
    const keys = [
        'meta_wa_phone_number_id', 
        'meta_wa_access_token', 
        'twilio_account_sid', 
        'twilio_auth_token', 
        'twilio_sms_from'
    ];
    const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', keys);

    if (!data) return;
    const map = new Map(data.map((r: { key: string; value: string }) => [r.key, r.value]));
    
    if (!META_PHONE_NUMBER_ID) META_PHONE_NUMBER_ID = map.get('meta_wa_phone_number_id') || '';
    if (!META_ACCESS_TOKEN)     META_ACCESS_TOKEN     = map.get('meta_wa_access_token') || '';
    if (!TWILIO_ACCOUNT_SID)    TWILIO_ACCOUNT_SID    = map.get('twilio_account_sid') || '';
    if (!TWILIO_AUTH_TOKEN)     TWILIO_AUTH_TOKEN     = map.get('twilio_auth_token') || '';
    if (!TWILIO_SMS_FROM)       TWILIO_SMS_FROM       = map.get('twilio_sms_from') || '';
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

// ── Template Mapping ─────────────────────────────────

function getTemplateData(
    type: string,
    lang: string,
    booking: BookingRow,
    doctor: DoctorRow,
    location: LocationRow,
): { name: string; params: string[] } {
    const docName = lang === 'ar' ? `د. ${doctor.full_name || doctor.display_name}` : `Dr. ${doctor.display_name}`;
    const locName = lang === 'ar' ? (location.name_ar || location.name) : location.name;
    const date = lang === 'ar' ? formatDateAr(booking.booking_date) : formatDateEn(booking.booking_date);
    const time = formatTime12(booking.booking_time, lang);

    switch (type) {
        case 'confirmation':
            return {
                name: 'booking_confirmation',
                params: [docName, locName, date, time]
            };
        case 'reminder_24h':
        case 'reminder_2h':
            return {
                name: 'booking_reminder',
                params: [docName, locName, time]
            };
        case 'cancellation':
            return {
                name: 'booking_cancellation',
                params: [docName, date, time]
            };
        case 'report_ready':
            return {
                name: 'report_ready_notification',
                params: [docName, `https://www.cliniq.one/reports/${booking.id}`]
            };
        case 'lab_results':
            return {
                name: 'lab_results_notification',
                params: [`https://www.cliniq.one/reports/${booking.id}`]
            };
        default:
            return { name: 'booking_notification', params: [docName] };
    }
}

// ── Meta Cloud API Calls ────────────────────────────

async function sendWhatsAppTemplate(
    to: string, 
    templateName: string, 
    lang: string, 
    parameters: string[]
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const url = `https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`;
    
    const body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace('+', ''), // Meta usually wants no +
        type: "template",
        template: {
            name: templateName,
            language: { code: lang === 'ar' ? 'ar' : 'en' },
            components: [
                {
                    type: "body",
                    parameters: parameters.map(p => ({ type: "text", text: p }))
                }
            ]
        }
    };

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await resp.json();
        if (resp.ok && data.messages?.[0]?.id) {
            return { ok: true, messageId: data.messages[0].id };
        }
        return { ok: false, error: JSON.stringify(data.error) || `HTTP ${resp.status}` };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
}

async function sendWhatsAppText(
    to: string, 
    text: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const url = `https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`;
    
    const body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace('+', ''),
        type: "text",
        text: { body: text }
    };

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await resp.json();
        if (resp.ok && data.messages?.[0]?.id) {
            return { ok: true, messageId: data.messages[0].id };
        }
        return { ok: false, error: JSON.stringify(data.error) || `HTTP ${resp.status}` };
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
            let booking: BookingRow | null = null;
            let doctor: DoctorRow | null = null;
            let location: LocationRow | null = null;
            let lang = 'ar';

            if (notif.booking_id) {
                // Fetch booking details
                const { data: bData } = await supabase
                    .from('wa_bookings')
                    .select('*')
                    .eq('id', notif.booking_id)
                    .single();
                booking = bData;

                if (booking) {
                    lang = booking.patient_language || 'ar';
                    // Fetch doctor
                    const { data: dData } = await supabase
                        .from('doctors')
                        .select('display_name, full_name')
                        .eq('id', booking.doctor_id)
                        .single();
                    doctor = dData;

                    // Fetch location
                    const { data: lData } = await supabase
                        .from('doctor_locations')
                        .select('name, name_ar, address, address_ar')
                        .eq('id', booking.location_id)
                        .single();
                    location = lData;
                }
            } else if (notif.consultation_id) {
                // Fetch consultation details
                const { data: cData } = await supabase
                    .from('consultations')
                    .select('*, patient:users(phone, language), doctor:doctors(display_name, full_name)')
                    .eq('id', notif.consultation_id)
                    .single();
                
                if (cData) {
                    // Mock a booking-like object for getTemplateData compatibility
                    booking = {
                        id: cData.id,
                        booking_date: cData.created_at.split('T')[0],
                        booking_time: cData.created_at.split('T')[1].substring(0, 5),
                        patient_language: cData.patient?.language || 'ar'
                    } as any;
                    lang = cData.patient?.language || 'ar';
                    doctor = cData.doctor;
                    location = { name: 'cliniq.one', name_ar: 'cliniq.one' } as any; 
                }
            }

            if (!booking || !doctor || !location) {
                await supabase
                    .from('wa_notification_log')
                    .update({ status: 'failed', error_message: 'Related record (booking/consultation/doctor) not found' })
                    .eq('id', notif.id);
                result.failed++;
                continue;
            }

            // Route by notification type
            let sendResult;
            let channel: 'whatsapp' | 'sms' = 'whatsapp';

            if (notif.notification_type === 'manual_text') {
                // Send raw text if within 24h window (or if Meta allows)
                sendResult = await sendWhatsAppText(notif.recipient_phone, notif.message_body || 'Hello from cliniq.one');
            } else {
                // Get template data
                const { name: templateName, params } = getTemplateData(
                    notif.notification_type,
                    lang,
                    booking,
                    doctor,
                    location,
                );
                // Try WhatsApp via Meta Cloud API
                sendResult = await sendWhatsAppTemplate(notif.recipient_phone, templateName, lang, params);
            }

            // Fallback to Twilio SMS if Meta fails (or if we want to retain SMS logic)
            if (!sendResult.ok && TWILIO_SMS_FROM) {
                console.log(`[wa-notify] Meta WhatsApp failed for ${notif.id}, trying SMS: ${sendResult.error}`);
                // Fallback requires a raw body as SMS doesn't use these templates
                const legacyBody = `Notification from cliniq.one. Please check your app.`; 
                const smsResult = await sendTwilioSms(notif.recipient_phone, legacyBody);
                if (smsResult.ok) {
                    sendResult = { ok: true, messageId: smsResult.sid };
                    channel = 'sms';
                }
            }

            if (sendResult.ok) {
                await supabase
                    .from('wa_notification_log')
                    .update({
                        status: 'sent',
                        channel,
                        message_body: `Template: ${templateName}`,
                        message_sid: sendResult.messageId || null,
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
                        message_body: `Template: ${templateName}`,
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

        // Load credentials from DB if env vars not set
        if (!META_PHONE_NUMBER_ID || !META_ACCESS_TOKEN || !TWILIO_ACCOUNT_SID) {
            await loadSettingsFromDb(supabase);
        }

        // Validate Meta credentials (minimum for WhatsApp)
        if (!META_PHONE_NUMBER_ID || !META_ACCESS_TOKEN) {
            return new Response(JSON.stringify({
                error: 'Meta WhatsApp credentials not configured',
                hint: 'Set meta_wa_phone_number_id and meta_wa_access_token in platform_settings',
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
