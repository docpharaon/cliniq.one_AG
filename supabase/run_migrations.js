// Run migrations using the Supabase database connection string
// Supabase projects expose a PostgreSQL connection at:
// postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node supabase/run_migrations.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL     = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌  Missing env vars. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: 'public' },
    auth: { persistSession: false },
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const migrationFiles = [
    '001_core_tables.sql',
    '002_admin_tables.sql',
    '003_doctor_workflow.sql',
    '004_intervention_management.sql',
];

// Split SQL into individual statements and run them one by one
function splitStatements(sql) {
    // Remove comments and split by semicolons, being careful with function bodies
    const statements = [];
    let current = '';
    let inDollarQuote = false;

    const lines = sql.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        // Skip pure comment lines
        if (trimmed.startsWith('--') && !inDollarQuote) {
            current += line + '\n';
            continue;
        }

        // Track $$ dollar quoting for function bodies
        const dollarMatches = line.match(/\$\$/g);
        if (dollarMatches) {
            for (const _ of dollarMatches) {
                inDollarQuote = !inDollarQuote;
            }
        }

        current += line + '\n';

        // If we hit a semicolon and we're not inside a function body
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

async function runMigration(fileName) {
    const filePath = path.join(MIGRATIONS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping (not found): ${fileName}`);
        return true;
    }

    console.log(`\n🔄 Running: ${fileName}...`);
    const sql = fs.readFileSync(filePath, 'utf-8');
    const statements = splitStatements(sql);
    console.log(`   Found ${statements.length} statements`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        // Skip pure comments
        if (stmt.replace(/--[^\n]*/g, '').trim() === '') continue;

        try {
            const { error } = await supabase.rpc('exec_raw_sql', { sql_text: stmt });
            if (error) {
                // Check if it's an "already exists" error — safe to skip
                if (error.message.includes('already exists') ||
                    error.message.includes('duplicate key') ||
                    error.message.includes('relation') && error.message.includes('already exists')) {
                    skipCount++;
                    continue;
                }
                console.error(`   ❌ Statement ${i + 1}: ${error.message}`);
                console.error(`      SQL: ${stmt.slice(0, 100)}...`);
                return false;
            }
            successCount++;
        } catch (err) {
            console.error(`   ❌ Statement ${i + 1}: ${err.message}`);
            return false;
        }
    }

    console.log(`   ✅ ${successCount} executed, ${skipCount} skipped (already exist)`);
    return true;
}

// Derive the Supabase project ref from the URL for dashboard link
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

async function main() {
    console.log('🚀 Applying Supabase migrations...');
    console.log(`   URL: ${SUPABASE_URL}`);

    // First, try a simple query to verify connectivity
    const { data, error } = await supabase.from('_dummy_test_').select('*').limit(1);
    if (error && !error.message.includes('does not exist') && !error.message.includes('not found')) {
        console.error('❌ Cannot connect to Supabase:', error.message);
        return;
    }
    console.log('✅ Connected to Supabase');

    for (const file of migrationFiles) {
        const ok = await runMigration(file);
        if (!ok) {
            console.log(`\n⛔ Stopping due to error in: ${file}`);
            console.log('\n💡 The rpc approach may not be available.');
            console.log('   Please run the SQL manually in the Supabase Dashboard SQL Editor.');
            console.log(`   URL: https://supabase.com/dashboard/project/${projectRef}/sql`);
            break;
        }
    }

    console.log('\n🏁 Done!');
}

main().catch(console.error);
