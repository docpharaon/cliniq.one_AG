// ─────────────────────────────────────────────────────
// Supabase Edge Function: approve-tester
// Sends an approval email to the tester with their
// unique download link containing a token.
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

serve(async (req: Request) => {
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
        const { name, email, download_token } = await req.json();

        if (!name || !email || !download_token) {
            return new Response(JSON.stringify({ error: 'Missing fields' }), {
                status: 400,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const downloadUrl = `${LANDING_URL}/#download?token=${download_token}`;

        const htmlBody = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f1a; color: #e0e0e0; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #0d9488, #2dd4bf); padding: 32px 24px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; color: #0a0f1a;">🎉 You're Approved!</h1>
                    <p style="margin: 8px 0 0; color: #0a0f1a; opacity: 0.8;">cliniq.one Early Access Program</p>
                </div>
                <div style="padding: 32px 24px;">
                    <p style="font-size: 16px; color: #f1f5f9; margin-bottom: 16px;">
                        Hi <strong>${escapeHtml(name)}</strong>,
                    </p>
                    <p style="color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">
                        Great news! Your application to the cliniq.one tester program has been approved.
                        You can now download the beta apps using the link below.
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${downloadUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0d9488, #2dd4bf); color: #0a0f1a; font-weight: bold; font-size: 16px; text-decoration: none; border-radius: 12px;">
                            ⬇️ Download Apps
                        </a>
                    </div>
                    <div style="margin-top: 24px; padding: 16px; background: #1e293b; border-radius: 12px;">
                        <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">Your personal download link:</p>
                        <p style="margin: 0; font-size: 12px; color: #2dd4bf; word-break: break-all;">${downloadUrl}</p>
                    </div>
                    <div style="margin-top: 24px; padding: 16px; background: #1e293b; border-radius: 12px;">
                        <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                            ⚠️ <strong>Installation note:</strong> Since these are beta APKs, you may need to enable
                            "Install from unknown sources" in your Android settings.
                        </p>
                    </div>
                </div>
                <div style="padding: 16px 24px; border-top: 1px solid #1e293b; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #64748b;">
                        © ${new Date().getFullYear()} cliniq.one · Powered by Momencrafts
                    </p>
                </div>
            </div>
        `;

        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY not set');
            return new Response(JSON.stringify({ error: 'Email service not configured' }), {
                status: 500,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'cliniq.one <admin@cliniq.one>',
                to: [email],
                subject: '🎉 You\'re approved! Download cliniq.one beta apps',
                html: htmlBody,
            }),
        });

        if (!resp.ok) {
            const text = await resp.text();
            console.error('Resend error:', resp.status, text);
            return new Response(JSON.stringify({ error: 'Email send failed' }), {
                status: 500,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('approve-tester error:', err);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: err instanceof Error ? err.message : String(err),
        }), {
            status: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
});
