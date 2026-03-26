// ─────────────────────────────────────────────────────
// Supabase Edge Function: approve-tester
// Creates a Supabase Auth user with a temporary
// password (15-day expiry), assigns the platform role,
// and sends credential email to the tester.
// ─────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
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

/** Generate a cryptographically secure random password */
function generatePassword(length = 16): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, (b) => chars[b % chars.length]).join('');
}

/** Map tester assigned_role to platform users.role */
function mapToPlatformRole(assignedRole: string): string {
    switch (assignedRole) {
        case 'Doctor':
        case 'Locum':
            return 'doctor';
        case 'Admin':
            return 'admin';
        case 'Patient':
        default:
            return 'patient';
    }
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
        const { name, email, download_token, assigned_role, tester_id } = await req.json();

        if (!name || !email || !assigned_role) {
            return new Response(JSON.stringify({ error: 'Missing required fields: name, email, assigned_role' }), {
                status: 400,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // ── 1. Generate credentials ──
        const tempPassword = generatePassword(16);
        const platformRole = mapToPlatformRole(assigned_role);
        const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days

        // ── 2. Create Supabase Auth user ──
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                role: platformRole,
                is_tester: true,
                tester_signup_id: tester_id || null,
                assigned_role,
            },
        });

        if (authError) {
            console.error('Auth createUser error:', authError);
            return new Response(JSON.stringify({
                error: 'Failed to create auth user',
                details: authError.message,
            }), {
                status: 500,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const authUserId = authData.user.id;

        // ── 3. Create public.users row ──
        const { error: userInsertError } = await supabase.from('users').insert({
            id: authUserId,
            email,
            nickname: name,
            role: platformRole,
            status: 'active',
            tokens_balance: 100, // welcome tokens for testing
            onboarding_completed: true,
        });

        if (userInsertError) {
            console.warn('Could not insert users row (may already exist):', userInsertError);
        }

        // ── 4. If Doctor/Locum, create public.doctors row ──
        if (assigned_role === 'Doctor' || assigned_role === 'Locum') {
            const onboardingStatus = assigned_role === 'Locum' ? 'approved' : 'none';
            const { error: doctorInsertError } = await supabase.from('doctors').insert({
                user_id: authUserId,
                full_name: name,
                display_name: `Dr. ${name.split(' ')[0]}`,
                license_number: 'TESTER-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
                license_authority: 'Beta Tester',
                specialty: 'dermatology',
                status: 'active',
                onboarding_status: onboardingStatus,
            });

            if (doctorInsertError) {
                console.warn('Could not insert doctors row:', doctorInsertError);
            }
        }

        // ── 5. Update tester_signups with credentials ──
        if (tester_id) {
            await supabase.from('tester_signups').update({
                assigned_role,
                auth_user_id: authUserId,
                login_email: email,
                temp_password: tempPassword,
                credentials_expire_at: expiresAt.toISOString(),
            }).eq('id', tester_id);
        }

        // ── 6. Build credential email ──
        const downloadUrl = `${LANDING_URL}/#download?token=${download_token || ''}`;
        const expiryFormatted = expiresAt.toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
        });

        const roleEmoji: Record<string, string> = {
            Patient: '🧑‍🤝‍🧑',
            Doctor: '👨‍⚕️',
            Locum: '🩺',
            Admin: '🛡️',
        };

        const htmlBody = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="background: linear-gradient(135deg, #0d9488, #2dd4bf); padding: 32px 24px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; color: #ffffff;">🎉 You're Approved!</h1>
                    <p style="margin: 8px 0 0; color: #ffffff; opacity: 0.9;">cliniq.one Early Access Program</p>
                </div>
                <div style="padding: 32px 24px;">
                    <p style="font-size: 16px; color: #1e293b; margin-bottom: 16px;">
                        Hi <strong>${escapeHtml(name)}</strong>,
                    </p>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
                        Great news! Your application to the cliniq.one tester program has been approved.
                        Here are your login credentials:
                    </p>

                    <!-- Credentials Card -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                            <span style="font-size: 20px;">${roleEmoji[assigned_role] || '🧪'}</span>
                            <span style="font-size: 14px; font-weight: 600; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px;">
                                ${escapeHtml(assigned_role)} Account
                            </span>
                        </div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 100px;">Email</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${escapeHtml(email)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Password</td>
                                <td style="padding: 8px 0;">
                                    <code style="background: #0d9488; color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">
                                        ${escapeHtml(tempPassword)}
                                    </code>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Valid Until</td>
                                <td style="padding: 8px 0; color: #dc2626; font-weight: 600; font-size: 14px;">⏰ ${expiryFormatted}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Download Button -->
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${downloadUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0d9488, #2dd4bf); color: #ffffff; font-weight: bold; font-size: 16px; text-decoration: none; border-radius: 12px;">
                            ⬇️ Download Apps
                        </a>
                    </div>

                    <!-- Warning -->
                    <div style="margin-top: 24px; padding: 16px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 12px;">
                        <p style="margin: 0; font-size: 13px; color: #92400e;">
                            ⚠️ <strong>Important:</strong> Please change your password after first login.
                            These credentials expire on <strong>${expiryFormatted}</strong>.
                        </p>
                    </div>

                    <div style="margin-top: 16px; padding: 16px; background: #f1f5f9; border-radius: 12px;">
                        <p style="margin: 0; font-size: 13px; color: #64748b;">
                            📱 <strong>Installation note:</strong> Since these are beta APKs, you may need to enable
                            "Install from unknown sources" in your Android settings.
                        </p>
                    </div>
                </div>
                <div style="padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                        © ${new Date().getFullYear()} cliniq.one · Powered by Momencrafts
                    </p>
                </div>
            </div>
        `;

        // ── 7. Send email via Resend ──
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
                subject: `🎉 Your cliniq.one beta credentials — ${assigned_role} Access`,
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

        return new Response(JSON.stringify({
            success: true,
            auth_user_id: authUserId,
            credentials_expire_at: expiresAt.toISOString(),
        }), {
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
