// Quick script to check which tables exist in Supabase
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/check_tables.js
//   — or set the vars in .env at the repo root and run:  node -r dotenv/config scripts/check_tables.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌  Missing env vars. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
    // 1. Check what tables exist
    const { data: tables, error: tablesErr } = await supabase.rpc('exec_sql', {
        query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    });

    if (tablesErr) {
        console.log('Cannot use exec_sql RPC, trying alternative...');

        // Try to list tables by querying each one
        const tableNames = [
            'users', 'doctors', 'consultations', 'token_transactions', 'protocol_logs',
            'doctor_ratings', 'doctor_schedules', 'ai_prompt_templates', 'news_articles',
            'advertisements', 'error_reports', 'platform_settings', 'token_packages',
            'consultation_audit_log', 'interventions', 'service_catalog', 'service_providers'
        ];

        console.log('Checking which tables exist...');
        for (const t of tableNames) {
            const { error } = await supabase.from(t).select('*').limit(0);
            console.log(`  ${t}: ${error ? '❌ ' + error.message : '✅ exists'}`);
        }
    } else {
        console.log('Tables:', tables);
    }
}

main().catch(console.error);
