/**
 * delete-stubborn.mjs — Deletes the remaining docpharaon account
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../apps/doctor-web/.env.local') });
config({ path: resolve(__dirname, '../apps/admin/.env.local') });
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 100 });
const target = allUsers?.users?.find(u => u.email === 'docpharaon@gmail.com');

if (!target) {
    console.log('✅ docpharaon@gmail.com not found — already deleted');
    process.exit(0);
}

const uid = target.id;
console.log(`Found: ${uid}`);

// Aggressively clean all possible FK references
const tables = [
    { table: 'token_transactions', col: 'user_id' },
    { table: 'protocol_logs', col: 'patient_id' },
    { table: 'patient_notifications', col: 'patient_id' },
    { table: 'audit_log', col: 'user_id' },
    { table: 'patient_favorite_doctors', col: 'patient_id' },
];

for (const { table, col } of tables) {
    const { error } = await supabase.from(table).delete().eq(col, uid);
    if (!error) console.log(`  Cleaned ${table}`);
}

// Clean doctor-related data
const { data: doc } = await supabase.from('doctors').select('id').eq('user_id', uid).single();
if (doc) {
    await supabase.from('doctor_notifications').delete().eq('doctor_id', doc.id);
    await supabase.from('consultations').update({ doctor_id: null, requested_doctor_id: null }).eq('doctor_id', doc.id);
    await supabase.from('patient_favorite_doctors').delete().eq('doctor_id', doc.id);
    await supabase.from('doctors').delete().eq('user_id', uid);
    console.log('  Cleaned doctor record');
}

// Clean consultations
const { data: consults } = await supabase.from('consultations').select('id').eq('patient_id', uid);
if (consults?.length) {
    for (const c of consults) {
        await supabase.from('messages').delete().eq('consultation_id', c.id);
        await supabase.from('ai_sessions').delete().eq('consultation_id', c.id);
        await supabase.from('protocol_logs').delete().eq('consultation_id', c.id);
    }
    await supabase.from('consultations').delete().eq('patient_id', uid);
    console.log(`  Cleaned ${consults.length} consultations`);
}

// Delete user profile
await supabase.from('users').delete().eq('id', uid);
console.log('  Deleted user profile');

// Delete auth user
const { error } = await supabase.auth.admin.deleteUser(uid);
if (error) console.error('❌ Auth delete failed:', error.message);
else console.log('✅ docpharaon@gmail.com fully deleted');
