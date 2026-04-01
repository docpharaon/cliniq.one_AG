// ─────────────────────────────────────────────────────
// Supabase Edge Function: application-notification
// Sends transactional emails to doctors at each stage
// of their application pipeline via Resend.
// ─────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const LANDING_URL = 'https://cliniq.one';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

type NotificationType =
    | 'application_received'
    | 'interview_scheduled'
    | 'approved'
    | 'rejected'
    | 'resubmission_requested';

interface NotificationPayload {
    type: NotificationType;
    doctor_name: string;
    doctor_email: string;
    // Optional fields used by specific notification types
    interview_date?: string;
    interview_type?: string;
    interview_url?: string;
    interview_phone?: string;
    rejection_reason?: string;
    resubmission_feedback?: string;
}

function buildEmailContent(payload: NotificationPayload): { subject: string; html: string } {
    const name = escapeHtml(payload.doctor_name);

    const header = (emoji: string, title: string, gradient: string) => `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, ${gradient}); padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; color: #ffffff;">${emoji} ${title}</h1>
                <p style="margin: 8px 0 0; color: #ffffff; opacity: 0.9;">cliniq.one Doctor Portal</p>
            </div>
            <div style="padding: 32px 24px;">
                <p style="font-size: 16px; color: #1e293b; margin-bottom: 16px;">Hi <strong>${name}</strong>,</p>`;

    const footer = `
                <div style="margin-top: 32px; text-align: center;">
                    <a href="${LANDING_URL}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0d9488, #2dd4bf); color: #ffffff; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 12px;">
                        Visit cliniq.one
                    </a>
                </div>
            </div>
            <div style="padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                    © ${new Date().getFullYear()} cliniq.one · Powered by Momencrafts
                </p>
            </div>
        </div>`;

    switch (payload.type) {
        case 'application_received':
            return {
                subject: `📋 Application Received — ${name}`,
                html: `
                    ${header('📋', 'Application Received', '#0d9488, #2dd4bf')}
                    <p style="color: #475569; line-height: 1.6;">
                        Thank you for submitting your doctor application to cliniq.one! 
                        Our team will review your credentials and documents. This typically takes 1–2 business days.
                    </p>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 24px 0;">
                        <p style="margin: 0; font-size: 14px; color: #475569;">
                            📌 <strong>What happens next?</strong><br>
                            1. We review your documents<br>
                            2. We may schedule a brief interview<br>
                            3. You'll receive an email with our decision
                        </p>
                    </div>
                    ${footer}`,
            };

        case 'interview_scheduled': {
            const date = payload.interview_date
                ? new Date(payload.interview_date).toLocaleString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                })
                : 'TBD';
            const typeLabel = payload.interview_type === 'video_call' ? '📹 Video Call' : '📞 Phone Call';
            return {
                subject: `📅 Interview Scheduled — ${date}`,
                html: `
                    ${header('📅', 'Interview Scheduled', '#7c3aed, #a855f7')}
                    <p style="color: #475569; line-height: 1.6;">
                        Great news! We'd like to schedule a brief interview with you as part of the application process.
                    </p>
                    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; margin: 24px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;">📆 Date & Time</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${escapeHtml(date)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Type</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${typeLabel}</td>
                            </tr>
                            ${payload.interview_url ? `
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Meeting Link</td>
                                <td style="padding: 8px 0;"><a href="${escapeHtml(payload.interview_url)}" style="color: #7c3aed; font-weight: 600; font-size: 14px;">Join Meeting →</a></td>
                            </tr>` : ''}
                            ${payload.interview_phone ? `
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Phone</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${escapeHtml(payload.interview_phone)}</td>
                            </tr>` : ''}
                        </table>
                    </div>
                    ${footer}`,
            };
        }

        case 'approved':
            return {
                subject: `🎉 Application Approved — Welcome to cliniq.one!`,
                html: `
                    ${header('🎉', 'You\'re Approved!', '#059669, #34d399')}
                    <p style="color: #475569; line-height: 1.6;">
                        Congratulations! Your doctor application has been <strong>approved</strong>.
                        You can now sign in to the Doctor app and start accepting consultations.
                    </p>
                    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin: 24px 0;">
                        <p style="margin: 0; font-size: 14px; color: #065f46;">
                            ✅ Your account is now <strong>active</strong>. Sign in with the same Google/Apple account you used to register.
                        </p>
                    </div>
                    ${footer}`,
            };

        case 'rejected':
            return {
                subject: `❌ Application Update — cliniq.one`,
                html: `
                    ${header('📋', 'Application Update', '#dc2626, #f87171')}
                    <p style="color: #475569; line-height: 1.6;">
                        We've reviewed your application and unfortunately, we are unable to approve it at this time.
                    </p>
                    ${payload.rejection_reason ? `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 24px 0;">
                        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #dc2626;">Reason:</p>
                        <p style="margin: 0; font-size: 14px; color: #475569;">${escapeHtml(payload.rejection_reason)}</p>
                    </div>` : ''}
                    <p style="color: #475569; line-height: 1.6;">
                        If you believe this was in error, please contact us at <a href="mailto:admin@cliniq.one" style="color: #0d9488;">admin@cliniq.one</a>.
                    </p>
                    ${footer}`,
            };

        case 'resubmission_requested':
            return {
                subject: `🔄 Changes Requested — cliniq.one Application`,
                html: `
                    ${header('🔄', 'Changes Requested', '#ea580c, #fb923c')}
                    <p style="color: #475569; line-height: 1.6;">
                        Our team has reviewed your application and would like you to make some changes before we can proceed.
                    </p>
                    ${payload.resubmission_feedback ? `
                    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin: 24px 0;">
                        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #ea580c;">Feedback:</p>
                        <p style="margin: 0; font-size: 14px; color: #475569;">${escapeHtml(payload.resubmission_feedback)}</p>
                    </div>` : ''}
                    <p style="color: #475569; line-height: 1.6;">
                        Please update your application in the Doctor app and resubmit.
                    </p>
                    ${footer}`,
            };

        default:
            return { subject: 'cliniq.one Application Update', html: '<p>Status update for your application.</p>' };
    }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }

    try {
        const payload: NotificationPayload = await req.json();

        if (!payload.doctor_email || !payload.doctor_name || !payload.type) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY not set');
            return new Response(JSON.stringify({ error: 'Email service not configured' }), {
                status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const { subject, html } = buildEmailContent(payload);

        const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'cliniq.one <admin@cliniq.one>',
                to: [payload.doctor_email],
                subject,
                html,
            }),
        });

        if (!resp.ok) {
            const text = await resp.text();
            console.error('Resend error:', resp.status, text);
            return new Response(JSON.stringify({ error: 'Email send failed' }), {
                status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('application-notification error:', err);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: err instanceof Error ? err.message : String(err),
        }), {
            status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
});
