// ─────────────────────────────────────────────────────
// Supabase Edge Function: register-tester
// Receives tester signup form data, sends email via Resend
// to admin@cliniq.one and saves to tester_signups table.
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

// ── Send email via Resend ──
async function sendEmailViaResend(payload: {
    name: string;
    email: string;
    role: string;
    message: string;
}): Promise<{ ok: boolean; error?: string }> {
    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not set');
        return { ok: false, error: 'Email service not configured' };
    }

    const htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f1a; color: #e0e0e0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #0d9488, #2dd4bf); padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; color: #0a0f1a;">🧪 New Tester Registration</h1>
                <p style="margin: 8px 0 0; color: #0a0f1a; opacity: 0.8;">cliniq.one Early Access Program</p>
            </div>
            <div style="padding: 32px 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; width: 120px;">Name</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #f1f5f9; font-weight: 600;">${escapeHtml(payload.name)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #94a3b8;">Email</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b;">
                            <a href="mailto:${escapeHtml(payload.email)}" style="color: #2dd4bf; text-decoration: none;">${escapeHtml(payload.email)}</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #94a3b8;">Role</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; color: #f1f5f9;">${escapeHtml(payload.role)}</td>
                    </tr>
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
            subject: `🧪 New Tester: ${payload.name} — ${payload.role}`,
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

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
        const { name, email, role, message } = body as {
            name: string;
            email: string;
            role: string;
            message?: string;
        };

        // Validate
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

        // Save to DB (optional — if table exists)
        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            await supabase.from('tester_signups').insert({
                name,
                email,
                role,
                message: message || null,
            });
        } catch (dbErr) {
            console.warn('Could not save to tester_signups table:', dbErr);
            // Non-fatal — continue to send email
        }

        // Send email
        const emailResult = await sendEmailViaResend({
            name,
            email,
            role,
            message: message || '',
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
