/**
 * Upload signed APKs to Supabase Storage (public bucket)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = 'https://uabbndansgxpvogteyxc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYmJuZGFuc2d4cHZvZ3RleXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjI4OCwiZXhwIjoyMDg2ODQ4Mjg4fQ.aUy9f1jsnNx2PomakTNBkGNeZIq8yxtMEeE_3xaU544';
const BUCKET = 'apk-releases';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const APK_DIR = resolve('dist/apk');
const VERSION = '1.0.0-beta';

const apks = [
  { file: 'cliniq-admin.apk',   storagePath: `v${VERSION}/cliniq-admin.apk` },
  { file: 'cliniq-doctor.apk',  storagePath: `v${VERSION}/cliniq-doctor.apk` },
  { file: 'cliniq-locum.apk',   storagePath: `v${VERSION}/cliniq-locum.apk` },
  { file: 'cliniq-patient.apk', storagePath: `v${VERSION}/cliniq-patient.apk` },
];

async function main() {
  // 1. Create public bucket if it doesn't exist
  console.log(`Creating bucket "${BUCKET}" (public)...`);
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ['application/vnd.android.package-archive', 'application/octet-stream'],
    fileSizeLimit: 100 * 1024 * 1024, // 100 MB
  });
  if (bucketErr && !bucketErr.message.includes('already exists')) {
    console.error('Bucket creation failed:', bucketErr.message);
    process.exit(1);
  }
  console.log('✅ Bucket ready');

  // 2. Upload each APK
  for (const apk of apks) {
    const filePath = resolve(APK_DIR, apk.file);
    console.log(`\nUploading ${apk.file} → ${apk.storagePath} ...`);
    const fileData = readFileSync(filePath);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(apk.storagePath, fileData, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true,
      });

    if (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    } else {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(apk.storagePath);
      console.log(`  ✅ Uploaded → ${urlData.publicUrl}`);
    }
  }

  // 3. Also upload as "latest" (symlink-like)
  console.log('\n--- Creating "latest" copies ---');
  for (const apk of apks) {
    const filePath = resolve(APK_DIR, apk.file);
    const latestPath = `latest/${apk.file}`;
    console.log(`Uploading ${apk.file} → ${latestPath} ...`);
    const fileData = readFileSync(filePath);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(latestPath, fileData, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true,
      });

    if (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    } else {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(latestPath);
      console.log(`  ✅ Uploaded → ${urlData.publicUrl}`);
    }
  }

  console.log('\n🎉 All APKs uploaded!');
}

main().catch(console.error);
