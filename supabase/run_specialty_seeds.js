/**
 * Run specialty seed migrations against Supabase
 * Reads each SQL file and executes it via the Supabase SQL API
 * 
 * Usage: node supabase/run_specialty_seeds.js
 */

const fs = require('fs');
const path = require('path');

// Read env from apps/admin/.env
const envPath = path.join(__dirname, '..', 'apps', 'admin', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
let currentKey = null;
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed === '') {
        currentKey = null;
        return;
    }
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        envVars[key] = val;
        currentKey = key;
    } else if (currentKey && trimmed) {
        // Continuation of previous value
        envVars[currentKey] += trimmed;
    }
});

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'] || envVars['EXPO_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

console.log('ENV check:');
console.log('  URL:', SUPABASE_URL ? SUPABASE_URL.substring(0, 40) + '...' : 'MISSING');
console.log('  KEY:', SERVICE_ROLE_KEY ? SERVICE_ROLE_KEY.substring(0, 20) + '...' : 'MISSING');


if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in apps/admin/.env');
    process.exit(1);
}

const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];

// Files to run in order
const migrationFiles = [
    '033_seed_dermatology_prompts.sql',
    '034_seed_family_medicine_prompts.sql',
    '035_seed_pediatrics_prompts.sql',
    '037_seed_diet_prompts.sql',
    '043_link_specialty_prompts.sql',  // Re-run linking after seeding
];

// Split SQL into executable statements, respecting $$ blocks
function splitStatements(sql) {
    const statements = [];
    let current = '';
    let inDollarQuote = false;

    const lines = sql.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('--') && !inDollarQuote) {
            current += line + '\n';
            continue;
        }

        const dollarMatches = line.match(/\$\$/g);
        if (dollarMatches) {
            for (const _ of dollarMatches) {
                inDollarQuote = !inDollarQuote;
            }
        }

        current += line + '\n';

        if (trimmed.endsWith(';') && !inDollarQuote) {
            const stmt = current.trim();
            if (stmt && !stmt.match(/^[\s\-]*$/)) {
                statements.push(stmt);
            }
            current = '';
        }
    }

    if (current.trim()) {
        statements.push(current.trim());
    }

    return statements;
}

async function executeSql(sql) {
    // Use Supabase's direct PostgreSQL REST endpoint
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
    });
    return resp;
}

async function runMigration(fileName) {
    const filePath = path.join(__dirname, 'migrations', fileName);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping (not found): ${fileName}`);
        return true;
    }

    console.log(`\n🔄 Running: ${fileName}...`);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    // Try to run the entire file as one statement via pg POST
    // Supabase exposes a pg endpoint at /pg/query for service role
    try {
        const resp = await fetch(`${SUPABASE_URL}/pg/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ query: sql }),
        });

        if (resp.ok) {
            const result = await resp.json();
            console.log(`   ✅ Success!`);
            return true;
        }

        // If /pg/query failed, try statement-by-statement via supabase-js
        console.log(`   ℹ️  /pg/query returned ${resp.status}, trying statement-by-statement...`);
    } catch (e) {
        console.log(`   ℹ️  /pg/query not available, trying statement-by-statement...`);
    }

    // Fallback: use @supabase/supabase-js with rpc
    let supabase;
    try {
        const { createClient } = require('@supabase/supabase-js');
        supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            db: { schema: 'public' },
            auth: { persistSession: false },
        });
    } catch (e) {
        console.error('   ❌ @supabase/supabase-js not found. Install it or run manually.');
        return false;
    }

    const statements = splitStatements(sql);
    console.log(`   Found ${statements.length} statements`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.replace(/--[^\n]*/g, '').trim() === '') continue;

        try {
            const { error } = await supabase.rpc('exec_raw_sql', { sql_text: stmt });
            if (error) {
                if (error.message.includes('already exists') ||
                    error.message.includes('duplicate key') ||
                    error.message.includes('ON CONFLICT DO NOTHING')) {
                    skipCount++;
                    continue;
                }
                // Check if it's a function not found error
                if (error.message.includes('exec_raw_sql')) {
                    console.error(`   ❌ exec_raw_sql function not found. Creating it...`);
                    // Try to create the function
                    const createFn = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_raw_sql`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': SERVICE_ROLE_KEY,
                            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                        },
                        body: JSON.stringify({ sql_text: stmt }),
                    });
                    console.error(`   ❌ Please create exec_raw_sql function first, or run SQL manually.`);
                    return false;
                }
                console.error(`   ❌ Statement ${i + 1}/${statements.length}: ${error.message}`);
                console.error(`      SQL: ${stmt.slice(0, 120)}...`);
                // Continue despite errors (ON CONFLICT DO NOTHING should handle dupes)
                skipCount++;
                continue;
            }
            successCount++;
            if (successCount % 5 === 0) {
                process.stdout.write(`   Progress: ${successCount}/${statements.length}\r`);
            }
        } catch (err) {
            console.error(`   ❌ Statement ${i + 1}: ${err.message}`);
            skipCount++;
        }
    }

    console.log(`   ✅ ${successCount} executed, ${skipCount} skipped`);
    return true;
}

async function main() {
    console.log('🚀 Running specialty seed migrations...');
    console.log(`   Supabase: ${SUPABASE_URL}`);
    console.log(`   Project: ${PROJECT_REF}\n`);

    for (const file of migrationFiles) {
        const ok = await runMigration(file);
        if (!ok) {
            console.log(`\n⛔ Failed on: ${file}`);
            console.log('   You may need to run this SQL manually in the Supabase SQL Editor.');
            console.log(`   Dashboard: https://supabase.com/dashboard/project/${PROJECT_REF}/sql`);
            break;
        }
    }

    console.log('\n🏁 Done!');
}

main().catch(console.error);
