const fs = require('fs');
const path = require('path');
const envContent = fs.readFileSync(path.join(__dirname, 'apps/admin/.env'), 'utf-8');
const vars = {};
for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) vars[m[1]] = m[2];
}

import('@supabase/supabase-js').then(async ({ createClient }) => {
    const s = createClient(vars.VITE_SUPABASE_URL, vars.VITE_SUPABASE_SERVICE_ROLE_KEY);

    const DERM_SEQ_ID = '282d0490-0c08-4b26-b96a-fb0a43586464';
    const PHOTO_PROMPT_ID = '331c310a-9327-406b-8dcf-2e6eb0a11347';

    // Insert photo_capture node at sort_order 25 (after HPI at 20, before triggers at 30)
    const { data, error } = await s
        .from('prompt_sequence_nodes')
        .insert({
            sequence_id: DERM_SEQ_ID,
            step_key: 'photo_capture',
            label: 'Photo Upload',
            emoji: '📸',
            prompt_id: PHOTO_PROMPT_ID,
            sort_order: 25,
            node_type: 'photo',
        })
        .select()
        .single();

    if (error) {
        console.error('Error inserting photo_capture node:', error.message);
    } else {
        console.log('✅ Photo capture node added to Dermatology sequence!');
        console.log('   ID:', data.id);
        console.log('   Position: after HPI (sort 20), before Triggers (sort 30)');
    }
});
