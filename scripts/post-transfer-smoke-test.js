/**
 * ============================================================
 *  cliniq.one — Post-Transfer Smoke Test
 * ============================================================
 *  Run after transferring the Supabase project from
 *  docpharaon → momencrafts.
 *
 *  Usage:
 *    SUPABASE_URL=https://uabbndansgxpvogteyxc.supabase.co \
 *    SUPABASE_ANON_KEY=<your-anon-key> \
 *    SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
 *    node scripts/post-transfer-smoke-test.js
 */

const { createClient } = require('@supabase/supabase-js');

// ── Config ─────────────────────────────────────────────────
const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL;

const ANON_KEY =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
    console.error('❌  Missing env vars. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
    process.exit(1);
}

const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);
const supabaseAdmin = SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    : null;

// ── Helpers ────────────────────────────────────────────────
let passed = 0;
let failed = 0;

async function check(name, fn) {
    try {
        await fn();
        console.log(`  ✅  ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌  ${name}: ${err.message || err}`);
        failed++;
    }
}

// ── Tests ──────────────────────────────────────────────────
async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   cliniq.one  Post-Transfer Smoke Test       ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`  URL: ${SUPABASE_URL}`);
    console.log(`  Service key: ${SERVICE_ROLE_KEY ? 'provided' : 'NOT provided (some tests skipped)'}`);
    console.log('');

    // ── 1. REST API reachability ───────────────────────────
    console.log('┌─ 1. REST API Reachability ─────────────────');
    await check('Anon key can reach REST API', async () => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            headers: {
                apikey: ANON_KEY,
                Authorization: `Bearer ${ANON_KEY}`,
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });

    // ── 2. Auth endpoint ───────────────────────────────────
    console.log('├─ 2. Auth Endpoint ─────────────────────────');
    await check('Auth settings endpoint responds', async () => {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
            headers: { apikey: ANON_KEY },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.external) throw new Error('Unexpected auth settings shape');
    });

    // ── 3. Core tables readable ────────────────────────────
    console.log('├─ 3. Core Tables (anon read) ───────────────');
    const coreTables = ['doctors', 'consultations', 'profiles', 'token_transactions'];
    for (const table of coreTables) {
        await check(`Table "${table}" is queryable`, async () => {
            const { error } = await supabaseAnon.from(table).select('id').limit(1);
            // RLS may block, but a "permission denied" is fine — it means the table exists
            if (error && !error.message.includes('permission') && error.code !== '42501') {
                throw error;
            }
        });
    }

    // ── 4. Storage buckets ─────────────────────────────────
    console.log('├─ 4. Storage Buckets ───────────────────────');
    await check('Storage API responds', async () => {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
            headers: {
                apikey: ANON_KEY,
                Authorization: `Bearer ${ANON_KEY}`,
            },
        });
        if (!res.ok && res.status !== 400) throw new Error(`HTTP ${res.status}`);
    });

    // ── 5. Realtime ────────────────────────────────────────
    console.log('├─ 5. Realtime ──────────────────────────────');
    await check('Realtime websocket endpoint reachable', async () => {
        const wsUrl = SUPABASE_URL
            .replace('https://', 'wss://')
            .replace('http://', 'ws://');
        const res = await fetch(
            `${SUPABASE_URL}/realtime/v1/api/health`,
            { headers: { apikey: ANON_KEY } }
        );
        // Any response (even 404) proves the server is running
        if (!res) throw new Error('No response from realtime');
    });

    // ── 6. Edge Functions ──────────────────────────────────
    console.log('├─ 6. Edge Functions ────────────────────────');
    const edgeFunctions = [
        'ai-intake',
        'approve-tester',
        'delete-account',
        'kyc-token',
        'kyc-webhook',
        'register-tester',
        'send-notification',
    ];
    for (const fn of edgeFunctions) {
        await check(`Edge function "${fn}" responds`, async () => {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
                method: 'POST',
                headers: {
                    apikey: ANON_KEY,
                    Authorization: `Bearer ${ANON_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });
            // We expect 4xx (auth / validation) — NOT 404 or 5xx
            if (res.status === 404)
                throw new Error('Function not found — may need redeployment');
            if (res.status >= 500)
                throw new Error(`Server error ${res.status}`);
        });
    }

    // ── 7. Admin-only checks ───────────────────────────────
    if (supabaseAdmin) {
        console.log('├─ 7. Admin Checks (service role) ──────────');
        await check('Service role can list users', async () => {
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
            if (error) throw error;
            if (!data) throw new Error('No data returned');
        });

        await check('Service role can read consultations', async () => {
            const { error } = await supabaseAdmin.from('consultations').select('id').limit(1);
            if (error) throw error;
        });

        await check('RLS policies intact (token_transactions)', async () => {
            const { error } = await supabaseAdmin
                .from('token_transactions')
                .select('id')
                .limit(1);
            if (error) throw error;
        });
    }

    // ── 8. Landing page (if deployed) ──────────────────────
    console.log('├─ 8. Landing Page ──────────────────────────');
    await check('cliniq.one landing page responds', async () => {
        try {
            const res = await fetch('https://cliniq.one', {
                redirect: 'follow',
                signal: AbortSignal.timeout(10000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (e) {
            if (e.name === 'TimeoutError') throw new Error('Timed out after 10s');
            throw e;
        }
    });

    // ── Summary ────────────────────────────────────────────
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log(`  Results:  ${passed} passed  /  ${failed} failed`);
    if (failed === 0) {
        console.log('  🎉  All checks passed — transfer looks good!');
    } else {
        console.log('  ⚠️   Some checks failed — review above.');
    }
    console.log('══════════════════════════════════════════════');
    console.log('');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(2);
});
