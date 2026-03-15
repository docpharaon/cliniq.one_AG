// Quick script to fix RLS recursion by talking directly to Supabase
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://uabbndansgxpvogteyxc.supabase.co',
    'sb_secret_Sq-3HgO7WFxk6sIzaZSl_A_MQlX6Exh'
);

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
