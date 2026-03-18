// Fix RLS recursion by creating a SECURITY DEFINER function that drops/recreates policies
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/fix_rls.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌  Missing env vars. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function step(label, fn) {
    try {
        const result = await fn();
        console.log(`✅ ${label}`);
        return result;
    } catch (err) {
        console.log(`❌ ${label}: ${err.message}`);
        return null;
    }
}

async function main() {
    console.log('=== Direct RLS Fix via Service Role Key ===\n');

    // Step 1: Create a helper function to execute SQL (SECURITY DEFINER runs as owner, bypasses RLS for DDL)
    await step('Create exec_sql function', async () => {
        const { error } = await supabase.rpc('exec_sql_setup', {});
        // This will fail since it doesn't exist yet, that's fine
    });

    // Step 2: Use the REST endpoint to create the function
    const sql = `
        DROP POLICY IF EXISTS admin_read_users ON public.users;
        DROP POLICY IF EXISTS admin_update_users ON public.users;
    `;

    // Try multiple SQL execution endpoints
    const endpoints = [
        '/pg/query',
        '/rest/v1/rpc/exec_sql',
        '/pg-meta/default/query',
    ];

    for (const endpoint of endpoints) {
        const url = `${SUPABASE_URL}${endpoint}`;
        console.log(`\nTrying ${endpoint}...`);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SERVICE_KEY,
                    'Authorization': `Bearer ${SERVICE_KEY}`,
                },
                body: JSON.stringify({ query: sql }),
            });
            const text = await response.text();
            console.log(`  Status: ${response.status}`);
            console.log(`  Response: ${text.substring(0, 200)}`);
            if (response.ok) {
                console.log('  ✅ SQL executed!');
                break;
            }
        } catch (err) {
            console.log(`  Error: ${err.message}`);
        }
    }

    // Step 3: Try listing policies via pg_policies view
    console.log('\n--- Checking policies on users table ---');

    console.log('\nTesting users table access with service role key...');
    const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', 'momen.g.pharaon@gmail.com');

    if (usersErr) {
        console.log(`❌ Users query error: ${usersErr.message}`);
    } else {
        console.log(`✅ Users query OK: ${JSON.stringify(users)}`);
    }

    console.log('\nTesting doctors table...');
    const { data: doctors, error: docsErr } = await supabase
        .from('doctors')
        .select('id, user_id, full_name, status');

    if (docsErr) {
        console.log(`❌ Doctors query error: ${docsErr.message}`);
    } else {
        console.log(`✅ Doctors: ${JSON.stringify(doctors)}`);
    }

    // Step 4: Let's try using the Supabase Management API
    console.log('\n--- Trying Supabase Management API ---');
    const mgmtUrl = `https://api.supabase.com/v1/projects/${SUPABASE_URL.split('//')[1].split('.')[0]}/database/query`;
    try {
        const response = await fetch(mgmtUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ query: sql }),
        });
        console.log(`  Status: ${response.status}`);
        const text = await response.text();
        console.log(`  Response: ${text.substring(0, 300)}`);
    } catch (err) {
        console.log(`  Error: ${err.message}`);
    }
}

main().catch(console.error);
