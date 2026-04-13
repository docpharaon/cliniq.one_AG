// ─────────────────────────────────────────────────────
// Supabase Edge Function: wa-webhook
// Receives WhatsApp messages via Meta Cloud API webhook,
// processes them through the AI intake engine, and
// sends replies back to the patient in WhatsApp.
// ─────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Environment ──────────────────────────────────────
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const META_GRAPH_VERSION = 'v21.0';

// ── Supabase Admin Client ────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Meta credentials cache (loaded from platform_settings) ──
let metaCreds: {
    phoneNumberId: string;
    accessToken: string;
    verifyToken: string;
    appSecret: string;
} | null = null;
let credsLoadedAt = 0;

async function getMetaCreds() {
    // Cache for 5 minutes
    if (metaCreds && Date.now() - credsLoadedAt < 300_000) return metaCreds;

    const keys = ['meta_wa_phone_number_id', 'meta_wa_access_token', 'meta_wa_verify_token', 'meta_wa_app_secret'];
    const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', keys);

    const map = new Map((data || []).map((r: { key: string; value: string }) => [r.key, r.value]));
    metaCreds = {
        phoneNumberId: map.get('meta_wa_phone_number_id') || '',
        accessToken: map.get('meta_wa_access_token') || '',
        verifyToken: map.get('meta_wa_verify_token') || '',
        appSecret: map.get('meta_wa_app_secret') || '',
    };
    credsLoadedAt = Date.now();
    return metaCreds;
}

// ── OpenAI config (same pattern as ai-intake) ────────
async function getOpenAIConfig() {
    const { data: rows } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['openai_api_key', 'openai_model', 'openai_temperature']);

    const s: Record<string, string> = {};
    for (const r of rows || []) s[r.key] = r.value;

    return {
        apiKey: s['openai_api_key'] || Deno.env.get('OPENAI_API_KEY') || '',
        model: s['openai_model'] || 'gpt-4o-mini',
        temperature: s['openai_temperature'] ? parseFloat(s['openai_temperature']) : 0.3,
    };
}

// ── HMAC-SHA256 signature verification ───────────────
async function verifySignature(body: string, signature: string, appSecret: string): Promise<boolean> {
    if (!signature || !appSecret) return false;
    const expectedSig = signature.replace('sha256=', '');
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(appSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hex === expectedSig;
}

// ── Phone normalization ──────────────────────────────
function normalizePhone(phone: string): string {
    let c = phone.replace(/[\s\-\(\)]/g, '');
    if (c.startsWith('05') && c.length === 10) c = '+966' + c.substring(1);
    if (c.startsWith('0') && c.length === 10 && !c.startsWith('+')) c = '+971' + c.substring(1);
    if (!c.startsWith('+')) c = '+' + c;
    return c;
}

// ── Send WhatsApp message via Meta Cloud API ─────────
async function sendWhatsAppMessage(to: string, text: string, creds: NonNullable<typeof metaCreds>) {
    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${creds.phoneNumberId}/messages`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to.replace('+', ''),
            type: 'text',
            text: { body: text },
        }),
    });
    const data = await res.json();
    if (!res.ok) {
        console.error('[wa-webhook] Send failed:', JSON.stringify(data));
    }
    return { ok: res.ok, data };
}

// ── Mark message as read ─────────────────────────────
async function markAsRead(wamid: string, creds: NonNullable<typeof metaCreds>) {
    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${creds.phoneNumberId}/messages`;
    await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: wamid,
        }),
    });
}

// ── Download media from Meta ─────────────────────────
async function downloadMedia(mediaId: string, creds: NonNullable<typeof metaCreds>): Promise<{ data: Uint8Array; mimeType: string } | null> {
    // Step 1: Get media URL
    const metaRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${mediaId}`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
    });
    if (!metaRes.ok) return null;
    const metaData = await metaRes.json();
    const mediaUrl = metaData.url;
    const mimeType = metaData.mime_type || 'image/jpeg';

    // Step 2: Download the actual file
    const fileRes = await fetch(mediaUrl, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
    });
    if (!fileRes.ok) return null;
    const arrayBuf = await fileRes.arrayBuffer();
    return { data: new Uint8Array(arrayBuf), mimeType };
}

// ── Get prompt sequence nodes ────────────────────────
async function getSequenceNodes(sequenceId: string) {
    const { data } = await supabase
        .from('prompt_sequence_nodes')
        .select('*, ai_prompts!prompt_id(content)')
        .eq('sequence_id', sequenceId)
        .order('sort_order', { ascending: true });
    return data || [];
}

// ── Get sequence by type ─────────────────────────────
async function getSequenceByType(seqType: string) {
    const { data } = await supabase
        .from('prompt_sequences')
        .select('*')
        .eq('sequence_type', seqType)
        .limit(1)
        .single();
    return data;
}

// ── Get global guard prompt ──────────────────────────
async function getGlobalGuard(): Promise<string | null> {
    const { data } = await supabase
        .from('ai_prompts')
        .select('content')
        .eq('prompt_type', 'global_guard')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);
    return data?.[0]?.content ?? null;
}

// ── Chat with OpenAI (conversation mode) ─────────────
async function chatWithAI(
    systemPrompt: string,
    history: { role: string; content: string }[],
    maxTokens = 800,
): Promise<string> {
    const config = await getOpenAIConfig();
    const guard = await getGlobalGuard();
    const finalPrompt = guard ? `${guard}\n\n---\n\n${systemPrompt}` : systemPrompt;

    // Keep last 30 messages
    const trimmed = history.length > 30
        ? [history[0], ...history.slice(-(30 - 1))]
        : history;

    const messages = [
        { role: 'system', content: finalPrompt },
        ...trimmed.map(m => ({
            role: m.role === 'patient' ? 'user' : m.role === 'ai' ? 'assistant' : m.role,
            content: m.content,
        })),
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: config.model,
            temperature: config.temperature,
            max_tokens: maxTokens,
            messages,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI error: ${res.status} ${err}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
}

// ── Lookup doctor by code ────────────────────────────
async function lookupDoctor(code: string) {
    const { data } = await supabase
        .from('doctors')
        .select('id, display_name, full_name, specialty, locum_code')
        .or(`locum_code.ilike.${code},locum_code.ilike.${code.toUpperCase()}`)
        .limit(1)
        .single();
    return data;
}

// ── Find or create session ───────────────────────────
async function getActiveSession(phone: string) {
    const { data } = await supabase
        .from('wa_chat_sessions')
        .select('*')
        .eq('phone', phone)
        .in('status', ['awaiting_doctor_code', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    return data;
}

async function createSession(phone: string, waPhoneNumberId: string) {
    const { data } = await supabase
        .from('wa_chat_sessions')
        .insert({
            phone,
            wa_phone_number_id: waPhoneNumberId,
            status: 'awaiting_doctor_code',
            language: 'ar',
        })
        .select()
        .single();
    return data;
}

async function updateSession(sessionId: string, updates: Record<string, unknown>) {
    await supabase
        .from('wa_chat_sessions')
        .update({ ...updates, last_message_at: new Date().toISOString() })
        .eq('id', sessionId);
}

// ── Build system prompt for current section ──────────
function buildSectionPrompt(
    promptContent: string,
    section: string,
    language: string,
    patientContext: string,
    turnCount: number,
    maxTurns: number,
): string {
    const NO_COMPLETE = ['greeting', 'pathway', 'summary', 'photo_capture', 'wa_greeting', 'wa_addendum'];
    let prompt = promptContent;

    // Section completion tag
    if (!NO_COMPLETE.includes(section)) {
        prompt += '\n\nWhen you feel you have enough information for this section, end your message with exactly: [SECTION_COMPLETE]';
    }

    // Behavioral suffix for interview sections
    if (!NO_COMPLETE.includes(section)) {
        prompt += `\n\nIMPORTANT behavioral rules:
- EVERY message must contain a question.
- Do NOT use gratitude/filler phrases. Go directly to your next question.
- SINGLE QUESTION per message.
- When done with this section, append [SECTION_COMPLETE].
- Keep responses concise (1-2 sentences + question).
- Accept short answers.
- If patient says "skip"/"next", accept and emit [SECTION_COMPLETE].
- You MUST ask at least ONE question before emitting [SECTION_COMPLETE].`;
    }

    // Addendum rules
    if (section === 'wa_addendum') {
        prompt += `\n\nAfter producing the final summary, emit [ADDENDUM_DONE].
- Do NOT emit [SECTION_COMPLETE]. Only use [ADDENDUM_DONE].`;
    }

    // Patient context
    if (patientContext && !['wa_greeting'].includes(section)) {
        prompt += `\n\nPATIENT CONTEXT:\n${patientContext}`;
    }

    // Language instruction
    if (language === 'ar') {
        prompt += `\n\nCRITICAL LANGUAGE RULES:
- Respond ONLY in Arabic (العربية).
- Use formal Arabic with a warm tone.
- The brand name "cliniq.one" must always appear in Latin characters.`;
    } else {
        prompt += '\n\nIMPORTANT: Respond in English. Brand name "cliniq.one" in Latin characters.';
    }

    // Turn limit nudge
    if (maxTurns > 0 && turnCount >= maxTurns - 1) {
        prompt += `\n\nCRITICAL: You are at turn ${turnCount + 1}/${maxTurns}. Conclude this section NOW and emit [SECTION_COMPLETE].`;
    }

    return prompt;
}

// ── MENU TEXT ────────────────────────────────────────
const MENU_AR = `مرحباً بك في cliniq.one! 👋

اختر من القائمة:

1️⃣  استشارة طبية جديدة
2️⃣  حجز موعد
3️⃣  متابعة استشارة سابقة

أرسل رقم الخيار أو اكتب رمز الطبيب للبدء.`;

const MENU_EN = `Welcome to cliniq.one! 👋

Choose from the menu:

1️⃣  New medical consultation
2️⃣  Book an appointment
3️⃣  Follow-up on previous consultation

Send the option number or type your doctor code to start.`;

// ── BOOKING LINK ─────────────────────────────────────
function getBookingLink(doctorCode?: string): string {
    // TODO: Replace with production URL
    const base = 'https://wa-intake.cliniq.one';
    return doctorCode ? `${base}?doc=${doctorCode}` : base;
}

// ── Main Message Processing ──────────────────────────
async function processMessage(
    senderPhone: string,
    messageText: string,
    waPhoneNumberId: string,
    wamid: string,
    creds: NonNullable<typeof metaCreds>,
    mediaId?: string,
    mediaType?: string,
) {
    const phone = normalizePhone(senderPhone);
    const text = (messageText || '').trim();
    const lowerText = text.toLowerCase();

    // ── Mark as read ──
    await markAsRead(wamid, creds);

    // ── Find or create session ──
    let session = await getActiveSession(phone);

    // ── Menu commands (always available) ──
    if (['menu', 'قائمة', 'start', 'hi', 'hello', 'مرحبا', 'السلام', 'السلام عليكم'].includes(lowerText)) {
        if (session) {
            // Reset session
            await updateSession(session.id, { status: 'abandoned' });
        }
        session = await createSession(phone, waPhoneNumberId);
        await sendWhatsAppMessage(phone, MENU_AR, creds);
        return;
    }

    // ── No active session → create one and show menu ──
    if (!session) {
        session = await createSession(phone, waPhoneNumberId);
        await sendWhatsAppMessage(phone, MENU_AR, creds);
        return;
    }

    // ── STATE: Awaiting doctor code ──
    if (session.status === 'awaiting_doctor_code') {
        // Option 2: Booking link
        if (text === '2' || lowerText === 'حجز' || lowerText === 'book') {
            await sendWhatsAppMessage(phone, `📅 لحجز موعد، افتح الرابط:\n${getBookingLink()}`, creds);
            return;
        }

        // Option 1/3: Need doctor code
        if (text === '1' || text === '3' || lowerText === 'استشارة' || lowerText === 'متابعة') {
            await sendWhatsAppMessage(
                phone,
                '🔑 أرسل لي رمز الطبيب الخاص بك للبدء.\n\nDoctor code example: DR-A3F2',
                creds,
            );
            return;
        }

        // Try to lookup doctor by code
        const doctor = await lookupDoctor(text);
        if (doctor) {
            // Determine pathway from menu selection context or default
            const pathway = text === '3' || lowerText === 'متابعة' ? 'followup' : 'new_visit';
            const seqType = pathway === 'followup' ? 'wa_followup' : 'wa_new_visit';
            const sequence = await getSequenceByType(seqType);

            if (!sequence) {
                await sendWhatsAppMessage(phone, '⚠️ النظام غير جاهز حالياً. حاول مرة أخرى لاحقاً.', creds);
                return;
            }

            const nodes = await getSequenceNodes(sequence.id);
            const firstNode = nodes[0];

            // Build initial context
            const patientContext = `Doctor: Dr. ${doctor.display_name || doctor.full_name}\nSpecialty: ${doctor.specialty || 'general'}`;

            // Get first prompt
            const promptContent = firstNode?.ai_prompts?.content || 'You are a medical intake AI. Greet the patient.';
            const systemPrompt = buildSectionPrompt(
                promptContent,
                firstNode?.step_key || 'wa_greeting',
                'ar',
                patientContext,
                0,
                firstNode?.max_turns || 3,
            );

            // Get AI greeting
            const aiResponse = await chatWithAI(systemPrompt, []);
            const cleanResponse = aiResponse
                .replace(/\[SECTION_COMPLETE\]/g, '')
                .replace(/\[ADDENDUM_DONE\]/g, '')
                .trim();

            // Determine next step (if greeting auto-completes)
            const sectionComplete = aiResponse.includes('[SECTION_COMPLETE]');
            let currentStep = firstNode?.step_key || '';
            let currentSeqId = sequence.id;
            let turnCount = 1;

            // If greeting completes, advance to next node
            if (sectionComplete && nodes.length > 1) {
                currentStep = nodes[1].step_key;
                turnCount = 0;
            }

            // Update session
            await updateSession(session.id, {
                status: 'active',
                doctor_id: doctor.id,
                doctor_code: doctor.locum_code || text,
                pathway,
                current_step: currentStep,
                current_sequence_id: currentSeqId,
                turn_count: turnCount,
                patient_context: patientContext,
                conversation_history: JSON.stringify([
                    { role: 'ai', content: cleanResponse, ts: new Date().toISOString() },
                ]),
            });

            // Send greeting
            await sendWhatsAppMessage(phone, cleanResponse, creds);
            return;
        }

        // Unknown input → prompt for doctor code
        await sendWhatsAppMessage(
            phone,
            '❌ لم أتعرف على هذا الرمز.\n\nأرسل رمز الطبيب (مثال: DR-A3F2)، أو أرسل "menu" للقائمة.',
            creds,
        );
        return;
    }

    // ── STATE: Active intake ──
    if (session.status === 'active') {
        const history = (session.conversation_history || []) as { role: string; content: string; ts: string }[];

        // ── Handle media (photo) ──
        if (mediaId) {
            const mediaFile = await downloadMedia(mediaId, creds);
            if (mediaFile) {
                const ext = mediaFile.mimeType.includes('png') ? 'png' : mediaFile.mimeType.includes('webp') ? 'webp' : 'jpg';
                const fileName = `${session.id}/${Date.now()}.${ext}`;

                const { error: uploadErr } = await supabase.storage
                    .from('wa-intake-uploads')
                    .upload(fileName, mediaFile.data, { contentType: mediaFile.mimeType });

                if (!uploadErr) {
                    const { data: urlData } = supabase.storage
                        .from('wa-intake-uploads')
                        .getPublicUrl(fileName);

                    const mediaUrls = [...(session.media_urls || []), urlData.publicUrl];
                    await updateSession(session.id, { media_urls: JSON.stringify(mediaUrls) });
                    await sendWhatsAppMessage(phone, '📸 تم استلام الصورة! شكراً.', creds);

                    // Add to context
                    history.push({ role: 'patient', content: `[Photo uploaded: ${urlData.publicUrl}]`, ts: new Date().toISOString() });
                    await updateSession(session.id, {
                        conversation_history: JSON.stringify(history),
                        patient_context: (session.patient_context || '') + `\n[Patient uploaded photo: ${urlData.publicUrl}]`,
                    });
                } else {
                    await sendWhatsAppMessage(phone, '⚠️ لم أتمكن من حفظ الصورة. حاول مرة أخرى.', creds);
                }
                return;
            }
        }

        // ── Add patient message to history ──
        history.push({ role: 'patient', content: text, ts: new Date().toISOString() });

        // ── Get current sequence + node ──
        const nodes = await getSequenceNodes(session.current_sequence_id);
        const currentNodeIdx = nodes.findIndex((n: { step_key: string }) => n.step_key === session.current_step);
        const currentNode = nodes[currentNodeIdx];

        if (!currentNode) {
            // Fallback: no current node, show error
            await sendWhatsAppMessage(phone, '⚠️ حدث خطأ. أرسل "menu" للبدء من جديد.', creds);
            return;
        }

        // ── Build prompt and call AI ──
        const promptContent = currentNode.ai_prompts?.content || `You are a medical intake AI. Section: ${currentNode.step_key}`;
        const systemPrompt = buildSectionPrompt(
            promptContent,
            currentNode.step_key,
            session.language || 'ar',
            session.patient_context || '',
            session.turn_count || 0,
            currentNode.max_turns || 5,
        );

        const aiResponse = await chatWithAI(systemPrompt, history);
        const sectionComplete = aiResponse.includes('[SECTION_COMPLETE]');
        const addendumDone = aiResponse.includes('[ADDENDUM_DONE]');
        const cleanResponse = aiResponse
            .replace(/\[SECTION_COMPLETE\]/g, '')
            .replace(/\[ADDENDUM_DONE\]/g, '')
            .replace(/\[VIOLATION:[^\]]+\]/g, '')
            .trim();

        // Add AI response to history
        history.push({ role: 'ai', content: cleanResponse, ts: new Date().toISOString() });

        // ── Handle [ADDENDUM_DONE] → intake complete ──
        if (addendumDone) {
            await updateSession(session.id, {
                status: 'intake_complete',
                conversation_history: JSON.stringify(history),
                intake_report: JSON.stringify({ summary: cleanResponse, completedAt: new Date().toISOString() }),
                completed_at: new Date().toISOString(),
            });

            // Create consultation (simplified — the doctor will see the report)
            const { data: consultation } = await supabase
                .from('consultations')
                .insert({
                    patient_name: session.patient_name || 'WhatsApp Patient',
                    doctor_id: session.doctor_id,
                    specialty: 'general',
                    status: 'pending',
                    source: 'whatsapp_chatbot',
                    ai_report: { waSessionId: session.id, summary: cleanResponse, history },
                    photos: session.media_urls || [],
                })
                .select('id')
                .single();

            if (consultation) {
                await updateSession(session.id, {
                    status: 'consultation_created',
                    consultation_id: consultation.id,
                });
            }

            await sendWhatsAppMessage(phone, cleanResponse, creds);

            // Send completion message
            const completionMsg = session.language === 'ar'
                ? `✅ تم إرسال تقريرك للطبيب بنجاح!\n\n📋 سيتم مراجعة استشارتك والرد عليك قريباً.\n\n📅 لحجز موعد: ${getBookingLink(session.doctor_code)}`
                : `✅ Your report has been sent to the doctor!\n\n📋 Your consultation will be reviewed shortly.\n\n📅 To book an appointment: ${getBookingLink(session.doctor_code)}`;
            await sendWhatsAppMessage(phone, completionMsg, creds);
            return;
        }

        // ── Handle [SECTION_COMPLETE] → advance to next node ──
        if (sectionComplete) {
            const nextIdx = currentNodeIdx + 1;

            if (nextIdx < nodes.length) {
                // Advance to next section
                const nextNode = nodes[nextIdx];

                // Check for pathway branching (wa_visit_type → followup or new_visit)
                if (currentNode.step_key === 'wa_visit_type') {
                    // Detect pathway from last patient message
                    const patientMessages = history
                        .filter(m => m.role === 'patient')
                        .map(m => m.content)
                        .join(' ')
                        .toLowerCase();

                    const isFollowup = /follow|متابعة|نفس|same|تحسن|treatment|علاج|دوا/.test(patientMessages);
                    const pathway = isFollowup ? 'followup' : 'new_visit';
                    const seqType = pathway === 'followup' ? 'wa_followup' : 'wa_new_visit';
                    const newSequence = await getSequenceByType(seqType);

                    if (newSequence) {
                        const newNodes = await getSequenceNodes(newSequence.id);
                        const firstNewNode = newNodes[0];
                        if (firstNewNode) {
                            await updateSession(session.id, {
                                pathway,
                                current_sequence_id: newSequence.id,
                                current_step: firstNewNode.step_key,
                                turn_count: 0,
                                conversation_history: JSON.stringify(history),
                                patient_context: (session.patient_context || '') + `\nPathway: ${pathway}`,
                            });

                            // Send current response
                            await sendWhatsAppMessage(phone, cleanResponse, creds);
                            return;
                        }
                    }
                }

                // Normal advancement
                await updateSession(session.id, {
                    current_step: nextNode.step_key,
                    turn_count: 0,
                    conversation_history: JSON.stringify(history),
                });

                await sendWhatsAppMessage(phone, cleanResponse, creds);
            } else {
                // Check if we need wrapup sequence
                const wrapupSeq = await getSequenceByType('wa_wrapup');
                if (wrapupSeq && session.current_sequence_id !== wrapupSeq.id) {
                    const wrapupNodes = await getSequenceNodes(wrapupSeq.id);
                    if (wrapupNodes.length > 0) {
                        // Build context from entire conversation for the summary
                        const fullContext = history
                            .filter(m => m.role === 'patient')
                            .map(m => m.content)
                            .join('\n');

                        await updateSession(session.id, {
                            current_sequence_id: wrapupSeq.id,
                            current_step: wrapupNodes[0].step_key,
                            turn_count: 0,
                            conversation_history: JSON.stringify(history),
                            patient_context: (session.patient_context || '') + `\n\nFull patient responses:\n${fullContext}`,
                        });

                        // Generate wrapup/addendum immediately
                        const wrapupPrompt = wrapupNodes[0].ai_prompts?.content || 'Summarize the intake and emit [ADDENDUM_DONE].';
                        const wrapupSystem = buildSectionPrompt(
                            wrapupPrompt,
                            wrapupNodes[0].step_key,
                            session.language || 'ar',
                            (session.patient_context || '') + `\n\nFull patient responses:\n${fullContext}`,
                            0,
                            wrapupNodes[0].max_turns || 4,
                        );

                        const wrapupResponse = await chatWithAI(wrapupSystem, history);
                        const wrapupClean = wrapupResponse
                            .replace(/\[SECTION_COMPLETE\]/g, '')
                            .replace(/\[ADDENDUM_DONE\]/g, '')
                            .trim();

                        history.push({ role: 'ai', content: wrapupClean, ts: new Date().toISOString() });

                        // If addendum done immediately
                        if (wrapupResponse.includes('[ADDENDUM_DONE]')) {
                            await updateSession(session.id, {
                                status: 'intake_complete',
                                conversation_history: JSON.stringify(history),
                                intake_report: JSON.stringify({ summary: wrapupClean, completedAt: new Date().toISOString() }),
                                completed_at: new Date().toISOString(),
                            });

                            await sendWhatsAppMessage(phone, cleanResponse, creds);
                            await sendWhatsAppMessage(phone, wrapupClean, creds);

                            // Create consultation
                            const { data: consultation } = await supabase
                                .from('consultations')
                                .insert({
                                    patient_name: session.patient_name || 'WhatsApp Patient',
                                    doctor_id: session.doctor_id,
                                    specialty: 'general',
                                    status: 'pending',
                                    source: 'whatsapp_chatbot',
                                    ai_report: { waSessionId: session.id, summary: wrapupClean, history },
                                    photos: session.media_urls || [],
                                })
                                .select('id')
                                .single();

                            if (consultation) {
                                await updateSession(session.id, { status: 'consultation_created', consultation_id: consultation.id });
                            }

                            const doneMsg = session.language === 'ar'
                                ? `✅ تم إرسال تقريرك للطبيب!\n📅 لحجز موعد: ${getBookingLink(session.doctor_code)}`
                                : `✅ Report sent!\n📅 Book: ${getBookingLink(session.doctor_code)}`;
                            await sendWhatsAppMessage(phone, doneMsg, creds);
                            return;
                        }

                        await updateSession(session.id, {
                            turn_count: 1,
                            conversation_history: JSON.stringify(history),
                        });

                        await sendWhatsAppMessage(phone, cleanResponse, creds);
                        await sendWhatsAppMessage(phone, wrapupClean, creds);
                        return;
                    }
                }

                // No more nodes and no wrapup → done
                await updateSession(session.id, {
                    status: 'intake_complete',
                    conversation_history: JSON.stringify(history),
                    completed_at: new Date().toISOString(),
                });
                await sendWhatsAppMessage(phone, cleanResponse, creds);
            }
        } else {
            // Normal turn — update history and send response
            await updateSession(session.id, {
                turn_count: (session.turn_count || 0) + 1,
                conversation_history: JSON.stringify(history),
            });
            await sendWhatsAppMessage(phone, cleanResponse, creds);
        }
        return;
    }

    // ── Completed/expired session → offer restart ──
    await sendWhatsAppMessage(
        phone,
        'أرسل "menu" أو "قائمة" للبدء من جديد 👋',
        creds,
    );
}

// ── Main Handler ────────────────────────────────────
serve(async (req: Request) => {
    const url = new URL(req.url);

    // ── GET: Webhook Verification ──
    if (req.method === 'GET') {
        const creds = await getMetaCreds();
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');

        if (mode === 'subscribe' && token === creds.verifyToken) {
            console.log('[wa-webhook] Webhook verified successfully');
            return new Response(challenge, { status: 200 });
        }
        return new Response('Forbidden', { status: 403 });
    }

    // ── POST: Incoming Messages ──
    if (req.method === 'POST') {
        const creds = await getMetaCreds();

        if (!creds.accessToken || !creds.phoneNumberId) {
            console.error('[wa-webhook] Meta credentials not configured');
            return new Response('EVENT_RECEIVED', { status: 200 });
        }

        // Read body
        const bodyText = await req.text();

        // Verify signature (if app secret is configured)
        if (creds.appSecret) {
            const signature = req.headers.get('x-hub-signature-256') || '';
            const isValid = await verifySignature(bodyText, signature, creds.appSecret);
            if (!isValid) {
                console.error('[wa-webhook] Invalid signature');
                return new Response('Invalid signature', { status: 401 });
            }
        }

        const body = JSON.parse(bodyText);

        // Meta sends nested structure: body.entry[].changes[].value
        const entries = body.entry || [];
        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                const value = change.value || {};
                const messages = value.messages || [];
                const waPhoneNumberId = value.metadata?.phone_number_id || '';

                for (const msg of messages) {
                    const senderPhone = msg.from || '';
                    const wamid = msg.id || '';

                    try {
                        if (msg.type === 'text') {
                            await processMessage(senderPhone, msg.text?.body || '', waPhoneNumberId, wamid, creds);
                        } else if (msg.type === 'image' || msg.type === 'document') {
                            const mediaId = msg.image?.id || msg.document?.id || '';
                            const caption = msg.image?.caption || msg.document?.caption || '';
                            await processMessage(senderPhone, caption, waPhoneNumberId, wamid, creds, mediaId, msg.type);
                        } else {
                            // Unsupported message type (sticker, audio, etc.)
                            await processMessage(senderPhone, '', waPhoneNumberId, wamid, creds);
                        }
                    } catch (err) {
                        console.error(`[wa-webhook] Error processing message ${wamid}:`, err);
                    }
                }
            }
        }

        // Always respond 200 to Meta (otherwise they retry)
        return new Response('EVENT_RECEIVED', { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
});
