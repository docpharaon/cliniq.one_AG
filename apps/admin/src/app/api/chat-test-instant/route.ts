import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Instant Mode: Full intake flow in one server-side request ──
// Runs all sections (Greeting → Pathway → HPI → ... → Summary) server-side,
// simulating patient responses, streaming SSE events as each section completes.
//
// KEY DESIGN: Each section gets its own ISOLATED conversation context.
// Only a brief "patient context" (chief complaint + demographics) carries
// between sections. This prevents scope bleed where HPI answers cause
// later sections to be skipped.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Config ───────────────────────────────────
const DEFAULT_MAX_TURNS = 8;
const SECTION_TIMEOUT_MS = 30_000;
const GLOBAL_TIMEOUT_MS = 180_000; // 3 min for full flow

// Per-section max AI question turns (each "turn" = 1 AI question + 1 patient answer)
const SECTION_MAX_TURNS: Record<string, number> = {
    greeting: 1,
    pathway: 1,
    hpi: 7,
    present_illness: 7,
    pmh: 4,
    past_medical_hx: 4,
    medications: 4,
    allergies: 4,
    family_history: 4,
    social_history: 5,
    ros: 5,
    review_of_systems: 5,
    summary: 1,
};

// ── Get AI config ────────────────────────────
async function getAIConfig() {
    try {
        const { data: rows } = await supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', ['openai_api_key', 'openai_model', 'openai_temperature']);
        const s: Record<string, string> = {};
        for (const r of rows || []) s[r.key] = r.value;
        return {
            apiKey: s['openai_api_key'] || process.env.OPENAI_API_KEY || '',
            model: s['openai_model'] || 'gpt-4o-mini',
            temperature: s['openai_temperature'] ? parseFloat(s['openai_temperature']) : 0.3,
        };
    } catch {
        return { apiKey: process.env.OPENAI_API_KEY || '', model: 'gpt-4o-mini', temperature: 0.3 };
    }
}

// ── Get global guard ─────────────────────────
async function getGlobalGuard(): Promise<string | null> {
    try {
        const { data } = await supabase
            .from('ai_prompts')
            .select('content')
            .eq('prompt_type', 'global_guard')
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1);
        return data?.[0]?.content ?? null;
    } catch { return null; }
}

// ── Resolve prompt for a section ─────────────
async function resolvePrompt(section: string, seqId: string | null): Promise<{ content: string; version: number; name: string }> {
    if (seqId) {
        try {
            const { data: nodes } = await supabase
                .from('prompt_sequence_nodes')
                .select('prompt_id, ai_prompts(id, name, content, version)')
                .eq('sequence_id', seqId)
                .eq('step_key', section)
                .limit(1);
            const p = nodes?.[0]?.ai_prompts as unknown as { id: string; name: string; content: string; version: number } | null;
            if (p) return { content: p.content, version: p.version, name: p.name };
        } catch { /* fall through */ }
    }
    return {
        content: `You are a medical intake AI for cliniq.one. Current section: ${section}. Ask relevant questions. When done, end with: [SECTION_COMPLETE]`,
        version: 0,
        name: section,
    };
}

// ── Behavioral suffix ────────────────────────
const BEHAVIOR_SUFFIX = `

IMPORTANT behavioral rules:
- EVERY message you send MUST contain a question. Never send a message that is only a thank-you, acknowledgment, confirmation, or summary without a follow-up question.
- Do NOT say "Thank you for sharing", "Thank you for confirming", "Thank you for letting me know", or any gratitude/filler phrases. Go directly to your next question.
- SINGLE QUESTION: Each message must contain exactly ONE question. Never ask multiple questions in one message.
- SECTION COMPLETION: When you have enough information for THIS section, append [SECTION_COMPLETE] at the end of your response. Do NOT post a closing summary or thank-you.
- PRIOR INFORMATION: If the patient context already contains information relevant to THIS section, do NOT skip. State precisely what you understood for THIS section only, then ask: "Would you like to confirm this, or is there anything you'd like to add?" Only emit [SECTION_COMPLETE] after the patient confirms.
- If the patient answers "no", "none", or "nothing" to an opening question, accept it and emit [SECTION_COMPLETE]. Do NOT ask a follow-up confirmation.
- Keep responses concise (1-2 sentences + your ONE question).
- Accept short answers like "no", "yes", "ok" as valid responses.
- You MUST ask at least ONE question before emitting [SECTION_COMPLETE]. Never complete a section without asking anything.`;

const NO_COMPLETE_SECTIONS = ['greeting', 'pathway', 'summary'];

// ── Call OpenAI ──────────────────────────────
async function callOpenAI(
    config: { apiKey: string; model: string; temperature: number },
    systemPrompt: string,
    messages: { role: string; content: string }[],
    maxTokens = 1000,
    tempOverride?: number,
): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: config.model,
            temperature: tempOverride ?? config.temperature,
            max_tokens: maxTokens,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
}

// ── Build the section flow from DB ───────────
type FlowNode = { step_key: string; label: string; emoji: string; prompt_id: string | null; sort_order: number; pathway_condition: string | null };

async function loadFlow(seqId: string): Promise<{ nodes: FlowNode[]; seqName: string }> {
    const { data: seq } = await supabase
        .from('prompt_sequences')
        .select('id, name')
        .eq('id', seqId)
        .single();

    const { data: nodes } = await supabase
        .from('prompt_sequence_nodes')
        .select('step_key, label, emoji, prompt_id, sort_order, pathway_condition')
        .eq('sequence_id', seqId)
        .order('sort_order', { ascending: true });

    return { nodes: (nodes || []) as FlowNode[], seqName: seq?.name || 'Default Flow' };
}

function buildFlowForPathway(nodes: FlowNode[], pathway: string): FlowNode[] {
    const pathwayNode = nodes.find(n => n.step_key === 'pathway');
    const pSort = pathwayNode?.sort_order ?? 0;
    const before = nodes.filter(n => !n.pathway_condition && n.sort_order <= pSort);
    const branch = nodes.filter(n => n.pathway_condition === pathway);
    const after = nodes.filter(n => !n.pathway_condition && n.sort_order > pSort);
    return [...before, ...branch, ...after];
}

// ── SSE helper ───────────────────────────────
function sseEvent(data: unknown): string {
    return `data: ${JSON.stringify(data)}\n\n`;
}

// ── Main handler ─────────────────────────────
export async function POST(req: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await req.json();
        const { patientProfile, language = 'en' } = body;

        if (!patientProfile) {
            return new Response(JSON.stringify({ error: 'Missing patientProfile' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const config = await getAIConfig();
        if (!config.apiKey || config.apiKey === 'sk-your-key') {
            return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        // Load default sequence
        const { data: seqs } = await supabase
            .from('prompt_sequences')
            .select('id')
            .eq('is_default', true)
            .limit(1);
        const seqId = seqs?.[0]?.id;
        if (!seqId) {
            return new Response(JSON.stringify({ error: 'No default sequence found' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        const { nodes: allNodes, seqName } = await loadFlow(seqId);
        const guard = await getGlobalGuard();

        // Start SSE stream
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                const send = (data: unknown) => {
                    try { controller.enqueue(encoder.encode(sseEvent(data))); } catch { /* closed */ }
                };

                send({ type: 'start', sequenceName: seqName, totalNodes: allNodes.length });

                // ═══════════════════════════════════════════════════════
                // KEY: Each section gets its OWN conversation context.
                // Only a brief "patient context" carries between sections.
                // The FULL conversation is accumulated separately for the
                // summary section at the end.
                // ═══════════════════════════════════════════════════════
                const fullConversation: { role: string; content: string }[] = []; // for summary only
                let patientContext = ''; // brief context about the patient's complaint
                let flow = allNodes.filter(n => !n.pathway_condition);
                let detectedPathway: string | null = null;
                let totalTurns = 0;
                let currentStepIdx = 0;

                try {
                    for (let i = 0; i < flow.length; i++) {
                        // Global timeout check
                        if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
                            send({ type: 'error', message: `⏱️ Global timeout (${GLOBAL_TIMEOUT_MS / 1000}s) reached after ${flow[i - 1]?.label || 'start'}` });
                            break;
                        }

                        const node = flow[i];
                        currentStepIdx = i;
                        const section = node.step_key;
                        const sectionStart = Date.now();
                        const sectionMessages: { role: string; content: string }[] = [];
                        let sectionComplete = false;
                        let turns = 0;

                        // Each section starts with a FRESH conversation
                        // Only a context message provides continuity
                        const sectionConversation: { role: string; content: string }[] = [];

                        send({ type: 'section_start', step: i + 1, total: flow.length, section, label: node.label, emoji: node.emoji });

                        // Build system prompt for this section
                        const resolved = await resolvePrompt(section, seqId);
                        let sysPrompt = resolved.content;
                        if (!NO_COMPLETE_SECTIONS.includes(section)) {
                            sysPrompt += '\n\nWhen you feel you have enough information for this section, end your message with exactly: [SECTION_COMPLETE]';
                            sysPrompt += BEHAVIOR_SUFFIX;
                        }
                        if (section !== 'pathway') {
                            if (language === 'ar') {
                                sysPrompt += '\n\nIMPORTANT: Respond entirely in Arabic (العربية).';
                            } else {
                                sysPrompt += '\n\nIMPORTANT: Respond in English.';
                            }
                        }

                        // Inject patient context into system prompt for all sections after greeting
                        // This gives the AI awareness of the chief complaint without leaking prior answers
                        if (patientContext && section !== 'greeting') {
                            sysPrompt += `\n\nPATIENT CONTEXT (for reference only — do NOT skip your questions based on this):\n${patientContext}`;
                        }

                        let finalPrompt = sysPrompt;
                        if (section !== 'pathway' && guard) {
                            finalPrompt = `${guard}\n\n---\n\n${sysPrompt}`;
                        }

                        const maxTurns = SECTION_MAX_TURNS[section] || DEFAULT_MAX_TURNS;
                        while (!sectionComplete && turns < maxTurns) {
                            // Timeout check
                            if (Date.now() - sectionStart > SECTION_TIMEOUT_MS) {
                                send({ type: 'section_timeout', section, turns });
                                break;
                            }
                            if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
                                send({ type: 'error', message: `⏱️ Global timeout reached during ${node.label}` });
                                sectionComplete = true;
                                break;
                            }

                            // 1. Doctor (AI) response — uses SECTION conversation only
                            const aiRaw = await callOpenAI(config, finalPrompt, sectionConversation, 1000);
                            let hasComplete = aiRaw.includes('[SECTION_COMPLETE]');
                            const pathwayMatch = aiRaw.match(/\[PATHWAY:(new_visit|follow_up|refill)\]/);

                            // ── FIRST-TURN GUARD ──────────────────────────
                            // If this is the AI's first response in this section (no patient
                            // messages yet), it MUST NOT immediately complete. Strip the tag
                            // so the AI is forced to actually ask a question first.
                            const hasPatientMessages = sectionConversation.some(m => m.role === 'user');
                            if (hasComplete && !hasPatientMessages && !NO_COMPLETE_SECTIONS.includes(section)) {
                                console.log(`[instant] First-turn guard: stripping [SECTION_COMPLETE] from ${section}`);
                                hasComplete = false;
                            }

                            let cleanAI = aiRaw
                                .replace(/\[SECTION_COMPLETE\]/g, '')
                                .replace(/\[PATHWAY:(new_visit|follow_up|refill)\]\s*/g, '')
                                .replace(/\[VIOLATION:[^\]]+\]/g, '')
                                .trim();

                            // ── EMPTY RESPONSE RETRY ──────────────────────
                            // If the AI returned nothing meaningful (just tags), retry with
                            // an explicit instruction to ask a question for this section.
                            if (!cleanAI && !NO_COMPLETE_SECTIONS.includes(section)) {
                                console.log(`[instant] Empty response in ${section}, retrying with explicit instruction`);
                                const retryPrompt = finalPrompt + `\n\nCRITICAL: You returned an empty response. You MUST ask your first question for this section NOW. Start with the opening question described in your instructions above.`;
                                const retryRaw = await callOpenAI(config, retryPrompt, sectionConversation, 1000);
                                hasComplete = false; // Force at least one question
                                cleanAI = retryRaw
                                    .replace(/\[SECTION_COMPLETE\]/g, '')
                                    .replace(/\[VIOLATION:[^\]]+\]/g, '')
                                    .trim();
                            }

                            sectionConversation.push({ role: 'assistant', content: cleanAI });
                            fullConversation.push({ role: 'assistant', content: cleanAI });
                            sectionMessages.push({ role: 'assistant', content: cleanAI });
                            turns++;
                            totalTurns++;

                            // Handle pathway detection
                            if (section === 'pathway' && pathwayMatch) {
                                detectedPathway = pathwayMatch[1];
                                flow = buildFlowForPathway(allNodes, detectedPathway);
                                send({
                                    type: 'pathway_detected',
                                    pathway: detectedPathway,
                                    newFlow: flow.map(n => ({ step_key: n.step_key, label: n.label, emoji: n.emoji })),
                                });
                                sectionComplete = true;
                                break;
                            }

                            // Summary section: pass FULL conversation for comprehensive summary
                            if (section === 'summary') {
                                // Re-call with full conversation for proper summary
                                const summaryResult = await callOpenAI(config, finalPrompt, fullConversation, 2000);
                                const cleanSummary = summaryResult
                                    .replace(/\[SECTION_COMPLETE\]/g, '')
                                    .trim();
                                // Replace the last message with the proper summary
                                sectionConversation[sectionConversation.length - 1] = { role: 'assistant', content: cleanSummary };
                                fullConversation[fullConversation.length - 1] = { role: 'assistant', content: cleanSummary };
                                sectionMessages[sectionMessages.length - 1] = { role: 'assistant', content: cleanSummary };
                                sectionComplete = true;
                                break;
                            }

                            // Greeting: one AI response, then simulate patient reply
                            if (section === 'greeting') {
                                sectionComplete = true;
                                const patientReply = await callOpenAI(
                                    config,
                                    patientProfile,
                                    sectionConversation.map(m => ({ role: m.role === 'assistant' ? 'user' : 'assistant', content: m.content })),
                                    200,
                                    Math.min(config.temperature + 0.2, 1.0),
                                );
                                sectionConversation.push({ role: 'user', content: patientReply });
                                fullConversation.push({ role: 'user', content: patientReply });
                                sectionMessages.push({ role: 'user', content: patientReply });
                                turns++;
                                totalTurns++;

                                // Build patient context from the greeting exchange
                                patientContext = `Chief complaint: ${patientReply}`;
                                break;
                            }

                            if (hasComplete) {
                                sectionComplete = true;
                                break;
                            }

                            // 2. Simulated patient response — uses SECTION conversation only
                            const patientReply = await callOpenAI(
                                config,
                                patientProfile,
                                sectionConversation.map(m => ({ role: m.role === 'assistant' ? 'user' : 'assistant', content: m.content })),
                                200,
                                Math.min(config.temperature + 0.2, 1.0),
                            );
                            sectionConversation.push({ role: 'user', content: patientReply });
                            fullConversation.push({ role: 'user', content: patientReply });
                            sectionMessages.push({ role: 'user', content: patientReply });
                            turns++;
                            totalTurns++;
                        }

                        send({
                            type: 'section_done',
                            step: i + 1,
                            total: flow.length,
                            section,
                            label: node.label,
                            emoji: node.emoji,
                            promptName: resolved.name,
                            promptVersion: resolved.version,
                            turns,
                            complete: sectionComplete,
                            messages: sectionMessages,
                        });

                        // After pathway, adjust i to continue at the right point in the rebuilt flow
                        // If pathway didn't detect a tag, default to new_visit
                        if (section === 'pathway') {
                            if (!detectedPathway) {
                                console.log('[instant] Pathway tag not detected, defaulting to new_visit');
                                detectedPathway = 'new_visit';
                                flow = buildFlowForPathway(allNodes, 'new_visit');
                                send({
                                    type: 'pathway_detected',
                                    pathway: 'new_visit',
                                    newFlow: flow.map(n => ({ step_key: n.step_key, label: n.label, emoji: n.emoji })),
                                });
                            }
                            const pathIdx = flow.findIndex(n => n.step_key === 'pathway');
                            i = pathIdx; // loop will increment to pathIdx + 1
                        }
                    }
                } catch (err) {
                    send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
                }

                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                send({ type: 'done', totalTurns, totalSections: currentStepIdx + 1, elapsedSeconds: elapsed, detectedPathway });
                controller.close();
            },
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
