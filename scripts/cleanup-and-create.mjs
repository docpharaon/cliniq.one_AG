/**
 * cleanup-and-create.mjs
 * 1. Lists all old auth users (non-family)
 * 2. Deletes old auth users and their data
 * 3. Creates new accounts: Dr. Moustafa (locum psychiatrist), Osman, Osama
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

const PASSWORD = 'Cliniq2026!';

// Emails to KEEP (family + friends accounts)
const KEEP_EMAILS = new Set([
    'momen@cliniq.one', 'mohd@cliniq.one', 'mazen@cliniq.one',
    'moustafa@cliniq.one', 'sawsan@cliniq.one', 'noor@cliniq.one', 'mulham@cliniq.one'
]);

// ══════════════════════════════════════════════════
// STEP 1: List and identify old accounts
// ══════════════════════════════════════════════════
console.log('\n═══ STEP 1: Listing all accounts ═══\n');

const { data: allUsers, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 100 });
if (listErr) { console.error('❌', listErr.message); process.exit(1); }

const oldUsers = [];
const keepUsers = [];

for (const u of allUsers.users) {
    if (KEEP_EMAILS.has(u.email)) {
        keepUsers.push(u);
        console.log(`  ✅ KEEP: ${u.email} (${u.id.slice(0,8)}..)`);
    } else {
        oldUsers.push(u);
        // Get profile info
        const { data: profile } = await supabase.from('users').select('nickname, role').eq('id', u.id).single();
        console.log(`  ⚠️  OLD:  ${u.email} (${u.id.slice(0,8)}..) — ${profile ? `${profile.nickname} [${profile.role}]` : 'no profile'}`);
    }
}

console.log(`\n📊 ${keepUsers.length} to keep, ${oldUsers.length} to delete\n`);

// ══════════════════════════════════════════════════
// STEP 2: Delete old accounts and their data
// ══════════════════════════════════════════════════
console.log('═══ STEP 2: Deleting old accounts ═══\n');

for (const u of oldUsers) {
    try {
        // Delete related data first (cascade should handle most, but be thorough)
        await supabase.from('token_transactions').delete().eq('user_id', u.id);
        await supabase.from('protocol_logs').delete().eq('patient_id', u.id);
        await supabase.from('patient_notifications').delete().eq('patient_id', u.id);
        
        // Delete doctor record if exists
        const { data: doc } = await supabase.from('doctors').select('id').eq('user_id', u.id).single();
        if (doc) {
            await supabase.from('doctor_notifications').delete().eq('doctor_id', doc.id);
            await supabase.from('consultations').update({ doctor_id: null }).eq('doctor_id', doc.id);
            await supabase.from('doctors').delete().eq('user_id', u.id);
        }
        
        // Delete consultations where this user is patient
        const { data: consults } = await supabase.from('consultations').select('id').eq('patient_id', u.id);
        if (consults?.length) {
            for (const c of consults) {
                await supabase.from('messages').delete().eq('consultation_id', c.id);
                await supabase.from('ai_sessions').delete().eq('consultation_id', c.id);
            }
            await supabase.from('consultations').delete().eq('patient_id', u.id);
        }
        
        // Delete user profile
        await supabase.from('users').delete().eq('id', u.id);
        
        // Delete auth user
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
        if (delErr) throw delErr;
        
        console.log(`  🗑️  Deleted: ${u.email}`);
    } catch (err) {
        console.error(`  ❌ Failed to delete ${u.email}: ${err.message}`);
    }
}

// ══════════════════════════════════════════════════
// STEP 3: Create new accounts
// ══════════════════════════════════════════════════
console.log('\n═══ STEP 3: Creating new accounts ═══\n');

const newAccounts = [
    { email: 'dr.moustafa@cliniq.one', name: 'Dr. Moustafa Al Saeed', role: 'doctor' },
    { email: 'osman@cliniq.one', name: 'Osman Aldawana', role: 'patient' },
    { email: 'osama@cliniq.one', name: 'Osama Aldawana', role: 'patient' },
];

for (const acc of newAccounts) {
    try {
        const { data, error } = await supabase.auth.admin.createUser({
            email: acc.email,
            password: PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: acc.name },
        });
        
        if (error) {
            if (error.message?.includes('already')) {
                console.log(`  ⏭️  ${acc.email} — already exists`);
            } else {
                console.error(`  ❌ ${acc.email} — ${error.message}`);
            }
        } else {
            console.log(`  ✅ ${acc.email} — created (${data.user.id.slice(0,8)}..) [${acc.role}]`);
        }
    } catch (err) {
        console.error(`  ❌ ${acc.email} — ${err.message}`);
    }
}

// ══════════════════════════════════════════════════
// STEP 4: Seed profiles for new accounts
// ══════════════════════════════════════════════════
console.log('\n═══ STEP 4: Seeding profiles ═══\n');

// Dr. Moustafa Al Saeed — Locum Psychiatrist
const { data: moustafaAuth } = await supabase.auth.admin.listUsers({ perPage: 100 });
const moustafaUser = moustafaAuth?.users?.find(u => u.email === 'dr.moustafa@cliniq.one');

if (moustafaUser) {
    // Insert user profile
    const { error: uErr } = await supabase.from('users').upsert({
        id: moustafaUser.id,
        email: 'dr.moustafa@cliniq.one',
        phone: '+971551234010',
        nickname: 'Dr. Moustafa',
        year_of_birth: 1985,
        gender: 'male',
        country: 'UAE',
        city: 'Abu Dhabi',
        language: 'ar',
        role: 'doctor',
        status: 'active',
        tokens_balance: 0,
        onboarding_completed: true,
        legal_accepted_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    
    if (uErr) console.error('  ❌ User profile:', uErr.message);
    
    // Insert doctor profile
    const { error: dErr } = await supabase.from('doctors').upsert({
        user_id: moustafaUser.id,
        full_name: 'Dr. Moustafa Al Saeed',
        display_name: 'Dr. Moustafa',
        license_number: 'DHA-PSY-2024-003',
        license_authority: 'Dubai Health Authority',
        specialty: 'dermatology',  // Using existing enum; psychiatry handled via sub_specialty
        sub_specialty: 'Psychiatry',
        years_experience: 15,
        languages: ['en', 'ar'],
        hospital: 'Al Ain Hospital',
        city: 'Abu Dhabi',
        bio: 'Consultant psychiatrist with 15 years of experience in adult and adolescent psychiatry. Special interest in anxiety disorders, depression, PTSD, and telepsychiatry. Board-certified by the Arab Board of Psychiatry.',
        status: 'active',
        daily_limit: 10,
        is_accepting: true,
        identifier_code: 'DR-MS03',
        doctor_type: 'locum',
        sandbox_mode: false,
        credential_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    }, { onConflict: 'user_id' });
    
    if (dErr) console.error('  ❌ Doctor profile:', dErr.message);
    else console.log('  ✅ Dr. Moustafa Al Saeed — Locum Psychiatrist profile created');
}

// Osman Aldawana — Patient
const osmanUser = moustafaAuth?.users?.find(u => u.email === 'osman@cliniq.one');
if (osmanUser) {
    const { error } = await supabase.from('users').upsert({
        id: osmanUser.id,
        email: 'osman@cliniq.one',
        phone: '+971551234011',
        nickname: 'Osman',
        year_of_birth: 1990,
        gender: 'male',
        country: 'UAE',
        city: 'Dubai',
        language: 'ar',
        role: 'patient',
        status: 'active',
        tokens_balance: 50,
        onboarding_completed: true,
        legal_accepted_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    
    if (error) console.error('  ❌ Osman profile:', error.message);
    else console.log('  ✅ Osman Aldawana — Patient profile created');
}

// Osama Aldawana — Patient
const osamaUser = moustafaAuth?.users?.find(u => u.email === 'osama@cliniq.one');
if (osamaUser) {
    const { error } = await supabase.from('users').upsert({
        id: osamaUser.id,
        email: 'osama@cliniq.one',
        phone: '+971551234012',
        nickname: 'Osama',
        year_of_birth: 1994,
        gender: 'male',
        country: 'UAE',
        city: 'Abu Dhabi',
        language: 'ar',
        role: 'patient',
        status: 'active',
        tokens_balance: 50,
        onboarding_completed: true,
        legal_accepted_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    
    if (error) console.error('  ❌ Osama profile:', error.message);
    else console.log('  ✅ Osama Aldawana — Patient profile created');
}

// Token bonuses for new patients
for (const email of ['osman@cliniq.one', 'osama@cliniq.one']) {
    const user = moustafaAuth?.users?.find(u => u.email === email);
    if (user) {
        await supabase.from('token_transactions').insert({
            user_id: user.id,
            type: 'bonus',
            amount: 50,
            balance_after: 50,
            description: 'Welcome bonus — beta testing'
        });
    }
}

console.log('\n✨ Done! All accounts ready.\n');
console.log('🔑 Password for all: Cliniq2026!');
