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
    
    // Check what node_type values exist
    const { data } = await s
        .from('prompt_sequence_nodes')
        .select('node_type')
        .not('node_type', 'is', null);
    
    const types = [...new Set(data?.map(d => d.node_type))];
    console.log('Existing node_type values:', types);
    
    // Check the legacy photo node's node_type
    const { data: legacy } = await s
        .from('prompt_sequence_nodes')
        .select('node_type, step_key')
        .eq('step_key', 'photo_capture')
        .single();
    console.log('Legacy photo_capture node_type:', legacy?.node_type);
});
