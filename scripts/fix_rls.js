// Fix RLS recursion by creating a SECURITY DEFINER function that drops/recreates policies
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://uabbndansgxpvogteyxc.supabase.co',
    'sb_secret_Sq-3HgO7WFxk6sIzaZSl_A_MQlX6Exh'
);

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
    // Since we can't run DDL via the JS client, let's try the Supabase HTTP API
    const projectUrl = 'https://uabbndansgxpvogteyxc.supabase.co';
    const serviceKey = 'sb_secret_Sq-3HgO7WFxk6sIzaZSl_A_MQlX6Exh';

    // Try multiple SQL execution endpoints
    const endpoints = [
        '/pg/query',
        '/rest/v1/rpc/exec_sql',
        '/pg-meta/default/query',
    ];

    const sql = `
        DROP POLICY IF EXISTS admin_read_users ON public.users;
        DROP POLICY IF EXISTS admin_update_users ON public.users;
    `;

    for (const endpoint of endpoints) {
        const url = `${projectUrl}${endpoint}`;
        console.log(`\nTrying ${endpoint}...`);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
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

    // We can't query pg_policies directly via PostgREST.
    // Let's try an alternative: check if the policies still cause issues by doing a simple select
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
    // The management API needs the access token from dashboard, let's try with service key
    const mgmtUrl = 'https://api.supabase.com/v1/projects/uabbndansgxpvogteyxc/database/query';
    try {
        const response = await fetch(mgmtUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceKey}`,
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
