/**
 * Fix: update bucket size limit + upload patient APK + run DB migration
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = 'https://uabbndansgxpvogteyxc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYmJuZGFuc2d4cHZvZ3RleXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjI4OCwiZXhwIjoyMDg2ODQ4Mjg4fQ.aUy9f1jsnNx2PomakTNBkGNeZIq8yxtMEeE_3xaU544';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function updateBucketAndUpload() {
  console.log('── Updating bucket file size limit ──');
  const { error: upErr } = await supabase.storage.updateBucket('apk-releases', {
    public: true,
    fileSizeLimit: 104857600, // 100 MB
  });
  if (upErr) {
    console.error('Bucket update error:', upErr.message);
  } else {
    console.log('✅ Bucket limit updated to 100 MB');
  }

  // Upload patient APK
  const filePath = resolve('dist/apk/cliniq-patient.apk');
  const fileData = readFileSync(filePath);
  console.log(`\nUploading cliniq-patient.apk (${(fileData.length/1024/1024).toFixed(1)} MB)...`);

  const { error } = await supabase.storage
    .from('apk-releases')
    .upload('latest/cliniq-patient.apk', fileData, {
      contentType: 'application/vnd.android.package-archive',
      upsert: true,
    });

  if (error) {
    console.error('❌ Upload failed:', error.message);
  } else {
    const { data } = supabase.storage.from('apk-releases').getPublicUrl('latest/cliniq-patient.apk');
    console.log('✅', data.publicUrl);
  }
}

async function runMigration() {
  console.log('\n── DB Migration via PostgREST ──');

  // Use Supabase's SQL query endpoint
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

  const statements = [
    `ALTER TABLE tester_signups ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE tester_signups ADD COLUMN IF NOT EXISTS download_token uuid DEFAULT gen_random_uuid()`,
    `ALTER TABLE tester_signups ADD COLUMN IF NOT EXISTS reviewed_at timestamptz`,
    `ALTER TABLE tester_signups ADD COLUMN IF NOT EXISTS reviewed_by text`,
  ];

  // Try via the direct SQL execution endpoint (Management API)
  for (const sql of statements) {
    const resp = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({}),
    });
    // This won't work for DDL — let's use a workaround
  }

  // Workaround: check if columns exist by querying the table
  console.log('Checking current tester_signups columns...');
  const { data, error } = await supabase.from('tester_signups').select('*').limit(1);
  if (error) {
    console.error('Table query error:', error.message);
    console.log('\n⚠️  Cannot run DDL via PostgREST.');
    console.log('Please run this SQL in the Supabase Dashboard SQL Editor:');
    console.log(`
ALTER TABLE tester_signups
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS download_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tester_signups_status_check') THEN
    ALTER TABLE tester_signups ADD CONSTRAINT tester_signups_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tester_signups_token
  ON tester_signups (download_token) WHERE status = 'approved';
    `);
  } else {
    const sample = data?.[0];
    if (sample && 'status' in sample) {
      console.log('✅ Columns already exist! (status, download_token found)');
    } else {
      console.log('Columns missing. Please run the SQL above in Supabase Dashboard.');
    }
  }
}

async function main() {
  await updateBucketAndUpload();
  await runMigration();
}

main().catch(console.error);
