const fs = require('fs');
const path = require('path');
const envContent = fs.readFileSync(path.join(__dirname, 'apps/admin/.env'), 'utf-8');
const vars = {};
for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) vars[m[1]] = m[2];
}

import('@supabase/supabase-js').then(({ createClient }) => {
    const s = createClient(vars.VITE_SUPABASE_URL, vars.VITE_SUPABASE_SERVICE_ROLE_KEY);
    
    // Check for photo prompts
    s.from('ai_prompts')
        .select('id, name, specialty, prompt_type, content')
        .or('name.ilike.%photo%,prompt_type.ilike.%photo%')
        .then(r => {
            console.log('=== Photo Prompts ===');
            if (r.data?.length) {
                r.data.forEach(p => console.log(`  ${p.name} (${p.specialty}) [${p.prompt_type}]\n  Content: ${(p.content||'').substring(0,200)}...\n`));
            } else console.log('  None found');
        });

    // Get derm sequence ID and its nodes sort orders
    s.from('prompt_sequences')
        .select('id')
        .eq('sequence_type', 'specialty')
        .eq('specialty', 'dermatology')
        .single()
        .then(r => {
            if (r.data) {
                s.from('prompt_sequence_nodes')
                    .select('id, step_key, label, sort_order, node_type')
                    .eq('sequence_id', r.data.id)
                    .order('sort_order')
                    .then(n => {
                        console.log('\n=== Derm Sequence Nodes ===');
                        n.data?.forEach(x => console.log(`  [${x.sort_order}] ${x.step_key} (${x.node_type || 'chat'}) - ${x.label}`));
                        console.log('\n  Sequence ID:', r.data.id);
                    });
            }
        });

    // Check legacy sequence for photo node
    s.from('prompt_sequence_nodes')
        .select('id, step_key, label, sort_order, node_type, prompt_id, sequence_id')
        .eq('step_key', 'photo_capture')
        .then(r => {
            console.log('\n=== Legacy photo_capture nodes ===');
            if (r.data?.length) {
                r.data.forEach(x => console.log(`  ${x.label} in seq=${x.sequence_id} prompt=${x.prompt_id}`));
            } else console.log('  None found');
        });
});
