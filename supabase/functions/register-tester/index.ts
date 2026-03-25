// ─────────────────────────────────────────────────────
// Supabase Edge Function: register-tester
// Receives tester signup form data (incl. role-specific
// credentials & file uploads), saves to DB + storage,
// and sends admin notification via Resend.
// ─────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// ── Rate limiter (in-memory, by IP, 5 req/min) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return false;
    }

    entry.count++;
    return entry.count > RATE_LIMIT;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Build role-specific email section ──
function buildRoleSection(payload: Record<string, string | null>): string {
    const { role, country, license_type, license_number, specialty, credential_file_path, linkedin_url, portfolio_url, organization, preferred_call_time, motivation } = payload;

    let rows = '';

    if (role === 'Doctor' || role === 'Both') {
        if (country) rows += `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;width:140px;">Country</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#f1f5f9;">${country === 'SA' ? '🇸🇦 Saudi Arabia' : '🇦🇪 UAE'}</td></tr>`;
        if (license_type) rows += `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">License Type</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#f1f5f9;">${escapeHtml(license_type)}</td></tr>`;
        if (license_number) rows += `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">License #</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#f1f5f9;">${escapeHtml(license_number)}</td></tr>`;
        if (specialty) rows += `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">Specialty</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#f1f5f9;">${escapeHtml(specialty)}</td></tr>`;
        if (credential_file_path) rows += `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">Credential</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#2dd4bf;">📎 Uploaded to storage</td></tr>`;
    }

    if (role === 'Investor') {
        if (organization) rows += `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;width:140px;">Organization</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#f1f5f9;">${escapeHtml(organization)}</td></tr>`;
        if (linkedin_url) rows += `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">LinkedIn</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;"><a href="${escapeHtml(linkedin_url)}" style="color:#2dd4bf;text-decoration:none;">${escapeHtml(linkedin_url)}</a></td></tr>`;
        if (portfolio_url) rows += `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">Portfolio</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;"><a href="${escapeHtml(portfolio_url)}" style="color:#2dd4bf;text-decoration:none;">${escapeHtml(portfolio_url)}</a></td></tr>`;
        if (preferred_call_time) rows += `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">Zoom Availability</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#f1f5f9;">${escapeHtml(preferred_call_time)}</td></tr>`;
    }

    if (role === 'Patient' && motivation) {
        rows += `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;width:140px;">Motivation</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#f1f5f9;">${escapeHtml(motivation)}</td></tr>`;
    }

    return rows;
}

// ── Send email via Resend ──
async function sendEmailViaResend(payload: Record<string, string | null>): Promise<{ ok: boolean; error?: string }> {
    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not set');
        return { ok: false, error: 'Email service not configured' };
    }

    const roleEmoji: Record<string, string> = {
        Patient: '🧑‍🤝‍🧑',
        Doctor: '👨‍⚕️',
        Both: '🔀',
        Investor: '💼',
    };

    const roleSections = buildRoleSection(payload);

    const htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f1a; color: #e0e0e0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #0d9488, #2dd4bf); padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; color: #0a0f1a;">🧪 New Tester Registration</h1>
                <p style="margin: 8px 0 0; color: #0a0f1a; opacity: 0.8;">cliniq.one Early Access Program</p>
            </div>
            <div style="padding: 32px 24px;">
                <div style="display: inline-block; padding: 6px 16px; background: #1e293b; border-radius: 20px; margin-bottom: 20px; font-size: 13px; color: #2dd4bf;">
                    ${roleEmoji[payload.role || ''] || '🧪'} ${escapeHtml(payload.role || 'Unknown')} Application
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; width: 140px;">Name</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #f1f5f9; font-weight: 600;">${escapeHtml(payload.name || '')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #94a3b8;">Email</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b;">
                            <a href="mailto:${escapeHtml(payload.email || '')}" style="color: #2dd4bf; text-decoration: none;">${escapeHtml(payload.email || '')}</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #94a3b8;">Role</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #f1f5f9;">${escapeHtml(payload.role || '')}</td>
                    </tr>
                    ${roleSections}
                    <tr>
                        <td style="padding: 12px 0; color: #94a3b8; vertical-align: top;">Message</td>
                        <td style="padding: 12px 0; color: #f1f5f9;">${payload.message ? escapeHtml(payload.message) : '<em style="color: #64748b;">(none)</em>'}</td>
                    </tr>
                </table>
                <div style="margin-top: 24px; padding: 16px; background: #1e293b; border-radius: 12px; text-align: center;">
                    <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                        Submitted at ${new Date().toISOString().replace('T', ' ').split('.')[0]} UTC
                    </p>
                </div>
            </div>
        </div>
    `;

    const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
            from: 'cliniq.one <admin@cliniq.one>',
            to: ['docpharaon@gmail.com'],
            subject: `🧪 New ${payload.role} Tester: ${payload.name}`,
            html: htmlBody,
            reply_to: payload.email,
        }),
    });

    if (!resp.ok) {
        const text = await resp.text();
        console.error('Resend error:', resp.status, text);
        return { ok: false, error: `Resend API error: ${resp.status}` };
    }

    return { ok: true };
}

// ── Main handler ────────────────────────────────────

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
        // Rate limit by IP
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
        if (isRateLimited(ip)) {
            return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
                status: 429,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // Parse body
        const body = await req.json();
        const {
            name, email, role, message,
            // Doctor fields
            country, license_type, license_number, specialty, credential_file,
            // Investor fields
            linkedin_url, portfolio_url, organization, preferred_call_time,
            // Patient field
            motivation,
        } = body as Record<string, string | undefined>;

        // Validate required fields
        if (!name || !email || !role) {
            return new Response(JSON.stringify({ error: 'Missing required fields: name, email, role' }), {
                status: 400,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // Basic email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return new Response(JSON.stringify({ error: 'Invalid email format' }), {
                status: 400,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // Role-specific validation
        if ((role === 'Doctor' || role === 'Both') && (!country || !license_type)) {
            return new Response(JSON.stringify({ error: 'Doctor applications require country and license type' }), {
                status: 400,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        if (role === 'Investor' && !linkedin_url) {
            return new Response(JSON.stringify({ error: 'Investor applications require a LinkedIn profile URL' }), {
                status: 400,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // ── Handle credential file upload ──
        let credential_file_path: string | null = null;

        if (credential_file && (role === 'Doctor' || role === 'Both')) {
            try {
                // credential_file is expected as base64 data URI: "data:image/png;base64,..."
                const matches = credential_file.match(/^data:(.+?);base64,(.+)$/);
                if (matches) {
                    const mimeType = matches[1];
                    const base64Data = matches[2];
                    const ext = mimeType.split('/')[1] || 'bin';
                    const fileName = `${crypto.randomUUID()}/credential.${ext}`;

                    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

                    const { error: uploadError } = await supabase.storage
                        .from('tester-credentials')
                        .upload(fileName, binaryData, {
                            contentType: mimeType,
                            upsert: false,
                        });

                    if (uploadError) {
                        console.warn('File upload error:', uploadError);
                    } else {
                        credential_file_path = fileName;
                    }
                }
            } catch (fileErr) {
                console.warn('Could not process credential file:', fileErr);
                // Non-fatal — continue
            }
        }

        // ── Save to DB ──
        try {
            await supabase.from('tester_signups').insert({
                name,
                email,
                role,
                message: message || null,
                country: country || null,
                license_type: license_type || null,
                license_number: license_number || null,
                specialty: specialty || null,
                credential_file_path,
                linkedin_url: linkedin_url || null,
                portfolio_url: portfolio_url || null,
                organization: organization || null,
                preferred_call_time: preferred_call_time || null,
                motivation: motivation || null,
            });
        } catch (dbErr) {
            console.warn('Could not save to tester_signups table:', dbErr);
            // Non-fatal — continue to send email
        }

        // ── Send email ──
        const emailResult = await sendEmailViaResend({
            name, email, role,
            message: message || null,
            country: country || null,
            license_type: license_type || null,
            license_number: license_number || null,
            specialty: specialty || null,
            credential_file_path,
            linkedin_url: linkedin_url || null,
            portfolio_url: portfolio_url || null,
            organization: organization || null,
            preferred_call_time: preferred_call_time || null,
            motivation: motivation || null,
        });

        if (!emailResult.ok) {
            return new Response(JSON.stringify({
                error: 'Failed to send notification email',
                details: emailResult.error,
            }), {
                status: 500,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('register-tester error:', err);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: err instanceof Error ? err.message : String(err),
        }), {
            status: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
});
