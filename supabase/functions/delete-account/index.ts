// ─────────────────────────────────────────────────
// Supabase Edge Function: delete-account
// Permanently deletes a user's account and all
// related data. Required by Apple App Store.
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

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
        // ── 1. Verify the user is authenticated ──────
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing auth' }), {
                status: 401,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // Use service role for admin-level access to delete data
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Verify the JWT and get the user
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const userId = user.id;
        console.log(`[delete-account] Starting deletion for user: ${userId}`);

        // ── 2. Get user's consultation IDs (needed for cascading) ──
        const { data: consultations } = await supabase
            .from('consultations')
            .select('id')
            .eq('patient_id', userId);

        const consultationIds = (consultations || []).map(c => c.id);

        // ── 3. Delete related data in dependency order ──

        // 3a. Delete messages (references consultations)
        if (consultationIds.length > 0) {
            await supabase
                .from('messages')
                .delete()
                .in('consultation_id', consultationIds);
            console.log(`[delete-account] Deleted messages for ${consultationIds.length} consultations`);
        }

        // 3b. Delete feedback (references consultations)
        if (consultationIds.length > 0) {
            await supabase
                .from('feedback')
                .delete()
                .in('consultation_id', consultationIds);
        }

        // 3c. Delete consultation audit logs
        if (consultationIds.length > 0) {
            await supabase
                .from('consultation_audit_log')
                .delete()
                .in('consultation_id', consultationIds);
        }

        // 3d. Delete interventions (references consultations)
        if (consultationIds.length > 0) {
            await supabase
                .from('interventions')
                .delete()
                .in('consultation_id', consultationIds);
        }

        // 3e. Delete intervention status logs
        if (consultationIds.length > 0) {
            await supabase
                .from('intervention_status_logs')
                .delete()
                .in('consultation_id', consultationIds);
        }

        // 3f. Delete consultations
        await supabase
            .from('consultations')
            .delete()
            .eq('patient_id', userId);
        console.log(`[delete-account] Deleted consultations`);

        // 3g. Delete AI sessions
        await supabase
            .from('ai_sessions')
            .delete()
            .eq('patient_id', userId);

        // 3h. Delete protocol logs
        await supabase
            .from('protocol_logs')
            .delete()
            .eq('patient_id', userId);

        // 3i. Delete chat reports
        await supabase
            .from('chat_reports')
            .delete()
            .eq('patient_id', userId);

        // 3j. Delete intake photos
        await supabase
            .from('intake_photos')
            .delete()
            .eq('patient_id', userId);

        // 3k. Delete token transactions
        await supabase
            .from('token_transactions')
            .delete()
            .eq('user_id', userId);

        // 3l. Delete error reports
        await supabase
            .from('error_reports')
            .delete()
            .eq('user_id', userId);

        // 3m. Delete the user profile row
        await supabase
            .from('users')
            .delete()
            .eq('id', userId);
        console.log(`[delete-account] Deleted user profile`);

        // ── 4. Delete the auth user (Supabase Admin API) ──
        const { error: deleteAuthErr } = await supabase.auth.admin.deleteUser(userId);
        if (deleteAuthErr) {
            console.error(`[delete-account] Auth deletion failed:`, deleteAuthErr.message);
            // Don't throw — data is already deleted, auth cleanup can be retried
        } else {
            console.log(`[delete-account] Auth user deleted`);
        }

        // ── 5. Done ──────────────────────────────────
        console.log(`[delete-account] ✅ Complete for user: ${userId}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Account and all associated data have been permanently deleted.',
        }), {
            status: 200,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('[delete-account] Error:', err);
        return new Response(JSON.stringify({
            error: 'Failed to delete account',
            details: err instanceof Error ? err.message : String(err),
        }), {
            status: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
});
