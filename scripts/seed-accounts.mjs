/**
 * seed-accounts.mjs
 * Creates auth users for family & friends testing via Supabase Admin API
 * 
 * Usage: node scripts/seed-accounts.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try loading env from multiple locations
config({ path: resolve(__dirname, '../apps/doctor-web/.env.local') });
config({ path: resolve(__dirname, '../apps/admin/.env.local') });
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.error('   Found URL:', supabaseUrl ? '✓' : '✗');
    console.error('   Found Key:', supabaseServiceKey ? '✓' : '✗');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const PASSWORD = 'Cliniq2026!';

const users = [
    { email: 'momen@cliniq.one', name: 'Dr. Momen Pharaon', role: 'admin' },
    { email: 'mohd@cliniq.one', name: 'Dr. Mohd Pharaon', role: 'doctor' },
    { email: 'mazen@cliniq.one', name: 'Mazen Noor', role: 'patient' },
    { email: 'moustafa@cliniq.one', name: 'Moustafa Mohdalsaeed', role: 'patient' },
    { email: 'sawsan@cliniq.one', name: 'Sawsan Yasmin', role: 'patient' },
    { email: 'noor@cliniq.one', name: 'Noor Majzoub', role: 'patient' },
    { email: 'mulham@cliniq.one', name: 'Mulham Ahmadsultan', role: 'patient' },
];

console.log('🔧 Creating auth users...\n');

let created = 0;
let skipped = 0;
let failed = 0;

for (const user of users) {
    try {
        // Check if user already exists
        const { data: existing } = await supabase.auth.admin.listUsers();
        const exists = existing?.users?.find(u => u.email === user.email);
        
        if (exists) {
            console.log(`  ⏭️  ${user.email} — already exists (${exists.id.slice(0, 8)}...)`);
            skipped++;
            continue;
        }

        const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: user.name },
        });

        if (error) {
            // User might already exist
            if (error.message?.includes('already been registered') || error.message?.includes('duplicate')) {
                console.log(`  ⏭️  ${user.email} — already registered`);
                skipped++;
            } else {
                console.error(`  ❌ ${user.email} — ${error.message}`);
                failed++;
            }
        } else {
            console.log(`  ✅ ${user.email} — created (${data.user.id.slice(0, 8)}...) [${user.role}]`);
            created++;
        }
    } catch (err) {
        console.error(`  ❌ ${user.email} — ${err.message}`);
        failed++;
    }
}

console.log(`\n📊 Results: ${created} created, ${skipped} skipped, ${failed} failed`);
console.log(`🔑 Password for all: ${PASSWORD}`);

if (created > 0) {
    console.log('\n📌 Next: push the seed migration to populate user profiles:');
    console.log('   npx supabase db push --linked');
}

process.exit(failed > 0 ? 1 : 0);
