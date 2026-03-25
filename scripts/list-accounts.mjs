/**
 * list-accounts.mjs
 * Lists all auth users in the Supabase project
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../apps/doctor-web/.env.local') });
config({ path: resolve(__dirname, '../apps/admin/.env.local') });
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// List all auth users
const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100 });

if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

const familyEmails = [
    'momen@cliniq.one', 'mohd@cliniq.one', 'mazen@cliniq.one',
    'moustafa@cliniq.one', 'sawsan@cliniq.one', 'noor@cliniq.one', 'mulham@cliniq.one'
];

console.log(`\n📋 All Auth Users (${data.users.length} total)\n`);
console.log('─'.repeat(90));
console.log(`${'Email'.padEnd(35)} ${'ID'.padEnd(12)} ${'Created'.padEnd(20)} ${'Status'}`);
console.log('─'.repeat(90));

const oldUsers = [];
const newUsers = [];

for (const u of data.users) {
    const isNew = familyEmails.includes(u.email);
    const label = isNew ? '✅ NEW' : '⚠️ OLD';
    const created = new Date(u.created_at).toISOString().slice(0, 16).replace('T', ' ');
    console.log(`${(u.email || 'no-email').padEnd(35)} ${u.id.slice(0, 10)}.. ${created.padEnd(20)} ${label}`);
    
    if (isNew) newUsers.push(u);
    else oldUsers.push(u);
}

console.log('─'.repeat(90));
console.log(`\n📊 Summary: ${newUsers.length} new (keep), ${oldUsers.length} old (to delete)`);

if (oldUsers.length > 0) {
    console.log('\n⚠️  OLD accounts to delete:');
    for (const u of oldUsers) {
        // Check if they have public.users data
        const { data: profile } = await supabase
            .from('users')
            .select('nickname, role, tokens_balance')
            .eq('id', u.id)
            .single();
        
        const { count: consultCount } = await supabase
            .from('consultations')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', u.id);

        console.log(`  - ${u.email} (${u.id.slice(0, 8)}...) | Profile: ${profile ? `${profile.nickname} [${profile.role}] ${profile.tokens_balance} tokens` : 'none'} | Consultations: ${consultCount || 0}`);
    }
}
