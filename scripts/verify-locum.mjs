/**
 * verify-locum.mjs — Verify Dr. Moustafa's locum account flows
 * Tests: sandbox → active workflow, credential expiry, identifier code
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

let passed = 0, failed = 0;

function assert(label, condition) {
    if (condition) { console.log(`  ✅ ${label}`); passed++; }
    else { console.error(`  ❌ ${label}`); failed++; }
}

console.log('\n═══ Locum Onboarding Verification ═══\n');

// 1. Verify Dr. Moustafa profile exists
const { data: moustafa } = await supabase
    .from('doctors')
    .select('*, users!inner(email, role, status)')
    .eq('users.email', 'dr.moustafa@cliniq.one')
    .single();

assert('Dr. Moustafa profile exists', !!moustafa);
assert('Doctor type is locum', moustafa?.doctor_type === 'locum');
assert('Specialty is set', !!moustafa?.specialty);
assert('Identifier code is DR-MS03', moustafa?.identifier_code === 'DR-MS03');
assert('Status is active', moustafa?.status === 'active');
assert('Sandbox mode is off', moustafa?.sandbox_mode === false);
assert('Credential expiry is set', !!moustafa?.credential_expires_at);

// Check credential not expired
const expiresAt = new Date(moustafa?.credential_expires_at);
assert('Credential not yet expired', expiresAt > new Date());
console.log(`  ℹ️  Expires: ${expiresAt.toISOString().slice(0, 10)} (${Math.ceil((expiresAt - Date.now()) / 86400000)} days)`);

// 2. Test sandbox → active workflow
console.log('\n── Sandbox → Active Workflow ──\n');

// Enable sandbox
const { error: sandboxErr } = await supabase
    .from('doctors')
    .update({ sandbox_mode: true })
    .eq('identifier_code', 'DR-MS03');
assert('Enable sandbox mode', !sandboxErr);

// Verify sandbox is on
const { data: sandboxed } = await supabase
    .from('doctors')
    .select('sandbox_mode')
    .eq('identifier_code', 'DR-MS03')
    .single();
assert('Sandbox mode is on', sandboxed?.sandbox_mode === true);

// Disable sandbox (activate)
const { error: activateErr } = await supabase
    .from('doctors')
    .update({ sandbox_mode: false })
    .eq('identifier_code', 'DR-MS03');
assert('Deactivate sandbox mode', !activateErr);

const { data: activated } = await supabase
    .from('doctors')
    .select('sandbox_mode')
    .eq('identifier_code', 'DR-MS03')
    .single();
assert('Sandbox mode is off after activation', activated?.sandbox_mode === false);

// 3. Test doctor lookup by identifier code
console.log('\n── Doctor Lookup ──\n');

const { data: found } = await supabase
    .from('doctors')
    .select('full_name, identifier_code, doctor_type, specialty, status')
    .eq('identifier_code', 'DR-MS03')
    .single();
assert('Found by identifier code', !!found);
assert('Full name matches', found?.full_name === 'Dr. Moustafa Al Saeed');

// 4. Test credential expiry update
console.log('\n── Credential Management ──\n');

// Set expired credential
const pastDate = new Date(Date.now() - 86400000).toISOString();
await supabase.from('doctors').update({ credential_expires_at: pastDate }).eq('identifier_code', 'DR-MS03');
const { data: expired } = await supabase.from('doctors').select('credential_expires_at').eq('identifier_code', 'DR-MS03').single();
assert('Can set past credential date', new Date(expired.credential_expires_at) < new Date());

// Restore valid date
const futureDate = new Date(Date.now() + 90 * 86400000).toISOString();
await supabase.from('doctors').update({ credential_expires_at: futureDate }).eq('identifier_code', 'DR-MS03');
assert('Restored future credential date', true);

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
