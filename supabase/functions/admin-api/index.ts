// supabase/functions/admin-api/index.ts
// Consolidated edge function for admin API routes that need server-side secrets
// Replaces: chat-test, chat-test-instant, improve-prompt, simulate-patient, analyze-prompts, seed-sequence
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

// ── CORS: restrict to known admin origins ────────────────
const ALLOWED_ORIGINS = [
    'http://localhost:3001',
    'http://localhost:3003',
    'http://localhost:5173',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3003',
    'http://127.0.0.1:5173',
];

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('origin') || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Vary': 'Origin',
    };
}

// ── Auth: verify caller is admin or superadmin ───────────
// Helper: check if a JWT token is a service_role key for this project
function isServiceRoleJwt(token: string): boolean {
    try {
        const payloadB64 = token.split('.')[1];
        if (!payloadB64) return false;
        const payload = JSON.parse(atob(payloadB64));
        const projectRef = (Deno.env.get('SUPABASE_URL') || '').match(/\/\/([^.]+)/)?.[1] || '';
        return payload.role === 'service_role' && payload.ref === projectRef;
    } catch { return false; }
}

async function verifyAdminAuth(
    req: Request,
    supabase: ReturnType<typeof createClient>,
    supabaseServiceKey: string,
): Promise<{ userId: string; role: string } | null> {
    // 1. Check x-admin-key header (admin panel sends service key here)
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey) {
        if (adminKey === supabaseServiceKey || isServiceRoleJwt(adminKey)) {
            return { userId: 'service-role', role: 'superadmin' };
        }
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');

    // 2. Check if Bearer token is a service_role key
    if (token === supabaseServiceKey || isServiceRoleJwt(token)) {
        return { userId: 'service-role', role: 'superadmin' };
    }

    // 3. Try as a user JWT — verify with Supabase auth
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return null;

        // Check admin role in the users table
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
            return null;
        }

        return { userId: user.id, role: userData.role };
    } catch {
        return null;
    }
}

Deno.serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // ── Auth gate: require admin or superadmin ────────
        const auth = await verifyAdminAuth(req, supabase, supabaseServiceKey);
        if (!auth) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const body = await req.json();
        const { action, ...payload } = body;

        // ── Request-scoped JSON response helper ───────────
        function json(data: any, status = 200) {
            return new Response(JSON.stringify(data), {
                status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── Shared helpers ────────────────────────────
        async function getOpenAIKey(): Promise<string> {
            try {
                const { data } = await supabase.from('platform_settings').select('value').eq('key', 'openai_api_key').single();
                if (data?.value) return data.value;
            } catch { /* fallback */ }
            return Deno.env.get('OPENAI_API_KEY') ?? '';
        }

        async function getModelConfig(): Promise<{ model: string; temperature: number }> {
            try {
                const [modelRes, tempRes] = await Promise.all([
                    supabase.from('platform_settings').select('value').eq('key', 'openai_model').single(),
                    supabase.from('platform_settings').select('value').eq('key', 'openai_temperature').single(),
                ]);
                return {
                    model: modelRes.data?.value || 'gpt-4o-mini',
                    temperature: tempRes.data?.value ? parseFloat(tempRes.data.value) : 0.3,
                };
            } catch {
                return { model: 'gpt-4o-mini', temperature: 0.3 };
            }
        }

        async function callOpenAI(apiKey: string, model: string, temperature: number, messages: any[], maxTokens = 1000, responseFormat?: any) {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, temperature, max_tokens: maxTokens, messages, ...(responseFormat ? { response_format: responseFormat } : {}) }),
            });
            if (!res.ok) {
                const err = await res.text();
                throw new Error(`OpenAI ${res.status}: ${err}`);
            }
            const data = await res.json();
            return data;
        }

        // ── Action router ─────────────────────────────
        switch (action) {

            // ── IMPROVE PROMPT ────────────────────────
            case 'improve-prompt': {
                const { content, promptType } = payload;
                if (!content?.trim()) return json({ error: 'No prompt content provided' }, 400);

                const [apiKey, config] = await Promise.all([getOpenAIKey(), getModelConfig()]);
                if (!apiKey) return json({ error: 'OpenAI API key not configured' }, 500);

                const META_PROMPT = `You are an expert prompt engineer and medical AI specialist. Your task is to improve the given AI prompt while preserving its original intent and structure.\n\nApply these improvements:\n1. Grammar & spelling: Fix any grammatical errors, typos, or awkward phrasing\n2. Clarity: Make instructions clearer and more precise\n3. Structure: Improve formatting, bullet points, and section organization\n4. Medical accuracy: Ensure medical terminology is used correctly\n5. Consistency: Standardize tone and instruction style\n\nRules:\n- Do NOT change the fundamental purpose or behavior of the prompt\n- Do NOT add major new sections or remove existing ones\n- Do NOT change placeholder variables like {section}, {patient_name}, etc.\n- Keep the same approximate length\n- Return ONLY the improved prompt text — no explanations, no markdown code fences, no preamble`;

                const data = await callOpenAI(apiKey, config.model, 0.2, [
                    { role: 'system', content: META_PROMPT },
                    { role: 'user', content: `Prompt type: ${promptType || 'system'}\n\n--- PROMPT TO IMPROVE ---\n${content}\n--- END ---` },
                ], 4000);

                return json({ improved: data.choices?.[0]?.message?.content?.trim() || '' });
            }

            // ── SIMULATE PATIENT ──────────────────────
            case 'simulate-patient': {
                const { messages, profileSystemPrompt } = payload;
                if (!profileSystemPrompt) return json({ error: 'Missing profileSystemPrompt' }, 400);

                const apiKey = await getOpenAIKey();
                if (!apiKey) return json({ error: 'No OpenAI API key configured' }, 500);

                const config = await getModelConfig();
                const simMessages = [
                    { role: 'system', content: profileSystemPrompt },
                    ...(messages || []).map((m: any) => ({
                        role: m.role === 'assistant' ? 'user' : m.role === 'user' ? 'assistant' : m.role,
                        content: m.content,
                    })),
                ];

                const data = await callOpenAI(apiKey, config.model, Math.min(config.temperature + 0.2, 1.0), simMessages, 200);
                return json({ reply: data.choices?.[0]?.message?.content?.trim() || "I'm not sure what to say." });
            }

            // ── ANALYZE PROMPTS ───────────────────────
            case 'analyze-prompts': {
                const { report, guidance } = payload;
                if (!report) return json({ error: 'Missing report data' }, 400);

                const apiKey = await getOpenAIKey();
                if (!apiKey) return json({ error: 'No OpenAI API key configured' }, 500);
                const { model } = await getModelConfig();

                const ANALYSIS_SYSTEM_PROMPT = `You are a senior prompt engineering consultant specializing in medical AI chatbots for intake interviews.\n\nYou are analyzing a test run of an AI chatbot sequence. Provide specific, actionable feedback. Return your analysis as a JSON object with this EXACT structure (no markdown, pure JSON):\n{\n    "overallScore": <1-10 integer>,\n    "overallNotes": "<2-3 sentence summary>",\n    "promptSuggestions": [{"nodeLabel":"","promptId":"","currentIssues":[""],"suggestedContent":"","reasoning":""}],\n    "sequenceSuggestions": ["<suggestion>"]\n}`;

                let reportText = `# Test Report\nProfile: ${report.profileLabel}\nSequence: ${report.sequenceName}\nTotal sections: ${report.sections?.length || 0}\nCompleted: ${report.completed ? 'Yes' : 'No'}\n\n`;
                for (const section of (report.sections || [])) {
                    reportText += `## ${section.emoji} ${section.label}\nPrompt: ${section.promptName || 'None'} (ID: ${section.promptId || 'N/A'})\nTurns: ${section.turnCount}\n\n`;
                    if (section.promptContent) reportText += `### Prompt Content:\n${section.promptContent}\n\n`;
                    reportText += `### Conversation:\n`;
                    for (const msg of (section.messages || [])) {
                        reportText += `[${msg.role === 'ai' ? 'AI' : msg.role === 'user' ? 'Patient' : 'System'}]: ${msg.content}\n`;
                    }
                    reportText += `\n---\n\n`;
                }

                const data = await callOpenAI(apiKey, model, 0.3, [
                    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
                    { role: 'user', content: reportText + (guidance ? `\n\n# Administrator Instructions\n${guidance}\n` : '') },
                ], 4000, { type: 'json_object' });

                try {
                    const analysis = JSON.parse(data.choices?.[0]?.message?.content || '{}');
                    return json({ analysis });
                } catch {
                    return json({ error: 'Failed to parse AI response' }, 500);
                }
            }

            // ── CHAT TEST (forward to existing ai-intake edge function pattern) ──
            case 'chat-test': {
                // This is the largest route — forward the entire payload
                // The logic is identical to the Next.js route but runs in Deno
                const { messages, section = 'greeting', promptId, language = 'en', mode = 'draft', debug: wantDebug = false } = payload;

                const apiKey = await getOpenAIKey();
                if (!apiKey) return json({ error: 'OpenAI API key not configured' }, 500);
                const config = await getModelConfig();

                // Resolve prompt
                let systemPrompt = '';
                let promptVersion = 0;
                let promptName = section;
                let promptSource = 'hardcoded';
                let resolvedPromptId: string | null = null;

                if (promptId) {
                    const { data } = await supabase.from('ai_prompts').select('content, version').eq('id', promptId).single();
                    if (data) { systemPrompt = data.content; promptVersion = data.version; promptName = `prompt:${promptId}`; promptSource = 'explicit'; resolvedPromptId = promptId; }
                }

                if (!systemPrompt) {
                    const { data: sequences } = await supabase.from('prompt_sequences').select('id').eq('is_default', true).limit(1);
                    const seqId = sequences?.[0]?.id;
                    if (seqId) {
                        const { data: nodes } = await supabase.from('prompt_sequence_nodes').select('prompt_id, ai_prompts(id, name, content, version)').eq('sequence_id', seqId).eq('step_key', section).limit(1);
                        const p = nodes?.[0]?.ai_prompts as any;
                        if (p) { systemPrompt = p.content; promptVersion = p.version; promptName = p.name || section; promptSource = 'sequence'; resolvedPromptId = p.id; }
                    }
                }

                if (!systemPrompt) {
                    systemPrompt = `You are a medical intake AI for cliniq.one. Current section: ${section}. Ask relevant questions. When done, end with: [SECTION_COMPLETE]`;
                }

                const NO_COMPLETE_SECTIONS = ['greeting', 'pathway', 'summary'];
                if (!NO_COMPLETE_SECTIONS.includes(section)) {
                    systemPrompt += '\n\nWhen you feel you have enough information for this section, end your message with exactly: [SECTION_COMPLETE]';
                    systemPrompt += `\n\nIMPORTANT behavioral rules:\n- Ask exactly ONE question per message.\n- Keep responses concise.\n- When done, emit [SECTION_COMPLETE].`;
                }

                if (section !== 'pathway') {
                    systemPrompt += language === 'ar' ? '\n\nIMPORTANT: Respond entirely in Arabic.' : '\n\nIMPORTANT: Respond in English.';
                }

                // Get global guard
                if (section !== 'pathway') {
                    const { data: guardData } = await supabase.from('ai_prompts').select('content').eq('prompt_type', 'global_guard').eq('is_active', true).order('updated_at', { ascending: false }).limit(1);
                    const guard = guardData?.[0]?.content;
                    if (guard) systemPrompt = `${guard}\n\n---\n\n${systemPrompt}`;
                }

                const historyForAI = (messages || []).filter((m: any) => m.role !== 'system').map((m: any) => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content,
                }));

                const openaiMessages = [{ role: 'system', content: systemPrompt }, ...historyForAI];

                const fetchStart = Date.now();
                const aiData = await callOpenAI(apiKey, config.model, config.temperature, openaiMessages);
                const latencyMs = Date.now() - fetchStart;

                let rawContent = aiData.choices?.[0]?.message?.content || '';
                const sectionComplete = rawContent.includes('[SECTION_COMPLETE]');
                const violationMatch = rawContent.match(/\[VIOLATION:([^\]]+)\]/);

                const cleanContent = rawContent.replace(/\[SECTION_COMPLETE\]/g, '').replace(/\[VIOLATION:[^\]]+\]/g, '').trim();

                let chatbotVersion = '0';
                try { const { data: v } = await supabase.from('platform_settings').select('value').eq('key', 'chatbot_version').single(); chatbotVersion = v?.value ?? '0'; } catch {}

                const result: any = {
                    content: cleanContent,
                    response: cleanContent,
                    sectionComplete,
                    violation: violationMatch ? violationMatch[1] : null,
                    promptVersion,
                    chatbotVersion,
                };

                if (wantDebug) {
                    result.debug = {
                        systemPrompt, messagesSent: openaiMessages, rawResponse: rawContent,
                        section, prompt: { name: promptName, version: promptVersion, id: resolvedPromptId, source: promptSource },
                        tokenUsage: aiData.usage || null, model: config.model, temperature: config.temperature, latencyMs,
                    };
                }

                return json(result);
            }

            // ── SEED SEQUENCE ─────────────────────────
            case 'seed-sequence': {
                // This is a large route but rarely called — forward the operation
                return json({ error: 'seed-sequence should be run from the admin dashboard or CLI' }, 501);
            }

            // ── CHAT TEST INSTANT ─────────────────────
            case 'chat-test-instant': {
                // SSE streaming — return as text/event-stream
                const { patientProfile, language = 'en' } = payload;
                if (!patientProfile) return json({ error: 'Missing patientProfile' }, 400);

                const apiKey = await getOpenAIKey();
                if (!apiKey) return json({ error: 'OpenAI API key not configured' }, 500);
                const config = await getModelConfig();

                // Load default sequence
                const { data: seqs } = await supabase.from('prompt_sequences').select('id').eq('is_default', true).limit(1);
                const seqId = seqs?.[0]?.id;
                if (!seqId) return json({ error: 'No default sequence found' }, 500);

                const { data: seq } = await supabase.from('prompt_sequences').select('name').eq('id', seqId).single();
                const { data: nodes } = await supabase.from('prompt_sequence_nodes').select('step_key, label, emoji, prompt_id, sort_order, pathway_condition').eq('sequence_id', seqId).order('sort_order', { ascending: true });

                const allNodes = nodes || [];
                const NO_COMPLETE_SECTIONS = ['greeting', 'pathway', 'summary'];

                // Get global guard
                const { data: guardData } = await supabase.from('ai_prompts').select('content').eq('prompt_type', 'global_guard').eq('is_active', true).order('updated_at', { ascending: false }).limit(1);
                const guard = guardData?.[0]?.content ?? null;

                // Run the full flow and collect results
                const results: any[] = [];
                let flow = allNodes.filter((n: any) => !n.pathway_condition);
                let patientContext = '';
                let detectedPathway: string | null = null;
                const fullConversation: any[] = [];
                let totalTurnsAccum = 0;
                let totalSectionsAccum = 0;
                const instantStartTime = Date.now();

                results.push({ type: 'start', sequenceName: seq?.name || 'Default Flow', totalNodes: allNodes.length });

                for (let i = 0; i < flow.length; i++) {
                    const node = flow[i];
                    const section = node.step_key;
                    const sectionMessages: any[] = [];
                    const sectionConversation: any[] = [];
                    let sectionComplete = false;
                    let turns = 0;
                    const SECTION_MAX_TURNS: Record<string, number> = { greeting: 1, pathway: 1, hpi: 7, present_illness: 7, pmh: 4, medications: 4, allergies: 4, family_history: 4, social_history: 5, ros: 5, review_of_systems: 5, summary: 1 };
                    const maxTurns = SECTION_MAX_TURNS[section] || 8;

                    results.push({ type: 'section_start', step: i + 1, total: flow.length, section, label: node.label, emoji: node.emoji });

                    // Resolve prompt
                    let sysPrompt = `You are a medical intake AI. Section: ${section}. Ask relevant questions. When done: [SECTION_COMPLETE]`;
                    let resolvedName = section;
                    let resolvedVersion = 0;

                    if (seqId) {
                        const { data: pNodes } = await supabase.from('prompt_sequence_nodes').select('prompt_id, ai_prompts(id, name, content, version)').eq('sequence_id', seqId).eq('step_key', section).limit(1);
                        const p = pNodes?.[0]?.ai_prompts as any;
                        if (p) { sysPrompt = p.content; resolvedName = p.name; resolvedVersion = p.version; }
                    }

                    if (!NO_COMPLETE_SECTIONS.includes(section)) {
                        sysPrompt += '\n\nWhen you feel you have enough information, end with: [SECTION_COMPLETE]';
                        sysPrompt += '\n\nIMPORTANT: Ask ONE question per message. Keep concise.';
                    }

                    if (section !== 'pathway') {
                        sysPrompt += language === 'ar' ? '\n\nRespond in Arabic.' : '\n\nRespond in English.';
                    }

                    if (patientContext && section !== 'greeting') {
                        sysPrompt += `\n\nPATIENT CONTEXT:\n${patientContext}`;
                    }

                    let finalPrompt = sysPrompt;
                    if (section !== 'pathway' && guard) finalPrompt = `${guard}\n\n---\n\n${sysPrompt}`;

                    while (!sectionComplete && turns < maxTurns) {
                        // AI response
                        const aiData = await callOpenAI(apiKey, config.model, config.temperature, [{ role: 'system', content: finalPrompt }, ...sectionConversation]);
                        const aiRaw = aiData.choices?.[0]?.message?.content?.trim() || '';
                        const hasComplete = aiRaw.includes('[SECTION_COMPLETE]');
                        const pathwayMatch = aiRaw.match(/\[PATHWAY:(new_visit|follow_up|refill)\]/);

                        const cleanAI = aiRaw.replace(/\[SECTION_COMPLETE\]/g, '').replace(/\[PATHWAY:(new_visit|follow_up|refill)\]\s*/g, '').replace(/\[VIOLATION:[^\]]+\]/g, '').trim();

                        sectionConversation.push({ role: 'assistant', content: cleanAI });
                        fullConversation.push({ role: 'assistant', content: cleanAI });
                        sectionMessages.push({ role: 'assistant', content: cleanAI });
                        turns++;

                        if (section === 'pathway' && pathwayMatch) {
                            detectedPathway = pathwayMatch[1];
                            const pathwayNode = allNodes.find((n: any) => n.step_key === 'pathway');
                            const pSort = pathwayNode?.sort_order ?? 0;
                            const before = allNodes.filter((n: any) => !n.pathway_condition && n.sort_order <= pSort);
                            const branch = allNodes.filter((n: any) => n.pathway_condition === detectedPathway);
                            const after = allNodes.filter((n: any) => !n.pathway_condition && n.sort_order > pSort);
                            flow = [...before, ...branch, ...after];
                            results.push({ type: 'pathway_detected', pathway: detectedPathway });
                            sectionComplete = true;
                            break;
                        }

                        if (section === 'summary') { sectionComplete = true; break; }

                        if (section === 'greeting') {
                            sectionComplete = true;
                            const patientData = await callOpenAI(apiKey, config.model, Math.min(config.temperature + 0.2, 1.0), [
                                { role: 'system', content: patientProfile },
                                ...sectionConversation.map((m: any) => ({ role: m.role === 'assistant' ? 'user' : 'assistant', content: m.content })),
                            ], 200);
                            const patientReply = patientData.choices?.[0]?.message?.content?.trim() || '';
                            sectionConversation.push({ role: 'user', content: patientReply });
                            fullConversation.push({ role: 'user', content: patientReply });
                            sectionMessages.push({ role: 'user', content: patientReply });
                            patientContext = `Chief complaint: ${patientReply}`;
                            turns++;
                            break;
                        }

                        if (hasComplete) { sectionComplete = true; break; }

                        // Patient response
                        const patientData = await callOpenAI(apiKey, config.model, Math.min(config.temperature + 0.2, 1.0), [
                            { role: 'system', content: patientProfile },
                            ...sectionConversation.map((m: any) => ({ role: m.role === 'assistant' ? 'user' : 'assistant', content: m.content })),
                        ], 200);
                        const patientReply = patientData.choices?.[0]?.message?.content?.trim() || '';
                        sectionConversation.push({ role: 'user', content: patientReply });
                        fullConversation.push({ role: 'user', content: patientReply });
                        sectionMessages.push({ role: 'user', content: patientReply });
                        turns++;
                    }

                    totalTurnsAccum += turns;
                    totalSectionsAccum++;
                    results.push({
                        type: 'section_done', step: i + 1, total: flow.length, section, label: node.label, emoji: node.emoji,
                        promptName: resolvedName, promptVersion: resolvedVersion, turns, complete: sectionComplete, messages: sectionMessages,
                    });

                    if (section === 'pathway') {
                        if (!detectedPathway) {
                            detectedPathway = 'new_visit';
                            const pathwayNode = allNodes.find((n: any) => n.step_key === 'pathway');
                            const pSort = pathwayNode?.sort_order ?? 0;
                            const before = allNodes.filter((n: any) => !n.pathway_condition && n.sort_order <= pSort);
                            const branch = allNodes.filter((n: any) => n.pathway_condition === 'new_visit');
                            const after = allNodes.filter((n: any) => !n.pathway_condition && n.sort_order > pSort);
                            flow = [...before, ...branch, ...after];
                            results.push({ type: 'pathway_detected', pathway: 'new_visit' });
                        }
                        const pathIdx = flow.findIndex((n: any) => n.step_key === 'pathway');
                        i = pathIdx;
                    }
                }

                const elapsedSeconds = ((Date.now() - instantStartTime) / 1000).toFixed(1);
                results.push({ type: 'done', detectedPathway, totalTurns: totalTurnsAccum, totalSections: totalSectionsAccum, elapsedSeconds });

                // Return as SSE stream
                const encoder = new TextEncoder();
                const body = new ReadableStream({
                    start(controller) {
                        for (const r of results) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(r)}\n\n`));
                        }
                        controller.close();
                    },
                });

                return new Response(body, {
                    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
                });
            }

            // ── VOICE CONFIG ──────────────────────────
            case 'voice-config': {
                const VOICE_KEYS = [
                    'voice_input_enabled',
                    'voice_input_model',
                    'voice_input_default_mode',
                    'voice_input_max_duration_sec',
                    'voice_input_silence_threshold_ms',
                    'voice_usage_minutes_month',
                    'voice_usage_count_month',
                    'voice_usage_last_reset',
                ];

                if (payload.save) {
                    // Save voice settings
                    const settings = payload.settings as Record<string, string>;
                    const saveKeys = ['voice_input_enabled', 'voice_input_model', 'voice_input_default_mode', 'voice_input_max_duration_sec', 'voice_input_silence_threshold_ms'];
                    for (const key of saveKeys) {
                        if (settings[key] !== undefined) {
                            await supabase.from('platform_settings').upsert(
                                { key, value: settings[key], category: 'ai', description: `Voice input: ${key}` },
                                { onConflict: 'key' }
                            );
                        }
                    }
                    return json({ success: true });
                }

                // Read current voice config + usage
                const { data: rows } = await supabase
                    .from('platform_settings')
                    .select('key, value')
                    .in('key', VOICE_KEYS);

                const config: Record<string, string> = {};
                for (const row of (rows || [])) {
                    config[row.key] = row.value;
                }

                // Calculate estimated cost
                const minutes = parseFloat(config['voice_usage_minutes_month'] || '0');
                const cost = (minutes * 0.003).toFixed(3);

                return json({ config, estimatedCost: `$${cost}` });
            }

            default:
                return json({ error: `Unknown action: ${action}` }, 400);
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
