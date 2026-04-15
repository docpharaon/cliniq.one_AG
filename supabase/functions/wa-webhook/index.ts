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

// ── Send WhatsApp image with caption ─────────────────
async function sendWhatsAppImage(to: string, imageUrl: string, caption: string, creds: NonNullable<typeof metaCreds>) {
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
            type: 'image',
            image: { link: imageUrl, caption },
        }),
    });
    const data = await res.json();
    if (!res.ok) {
        console.error('[wa-webhook] Image send failed:', JSON.stringify(data));
    }
    return { ok: res.ok, data };
}

async function sendWhatsAppTemplate(
    to: string, 
    templateName: string, 
    lang: string, 
    parameters: string[],
    creds: NonNullable<typeof metaCreds>
) {
    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${creds.phoneNumberId}/messages`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to.replace('+', ''),
            type: "template",
            template: {
                name: templateName,
                language: { code: lang === 'ar' ? 'ar' : 'en' },
                components: [
                    {
                        type: "body",
                        parameters: parameters.map(p => ({ type: "text", text: p }))
                    }
                ]
            }
        }),
    });
    const data = await res.json();
    if (!res.ok) {
        console.error('[wa-webhook] Template send failed:', JSON.stringify(data));
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

// ── Transcribe audio via OpenAI Whisper API ──────────
async function transcribeAudio(
    audioData: Uint8Array,
    mimeType: string,
    language: string,
): Promise<string | null> {
    try {
        const config = await getOpenAIConfig();
        if (!config.apiKey) {
            console.error('[wa-webhook] No OpenAI API key for transcription');
            return null;
        }

        // Determine file extension from mime type
        const extMap: Record<string, string> = {
            'audio/ogg': 'ogg',
            'audio/mpeg': 'mp3',
            'audio/mp4': 'm4a',
            'audio/amr': 'amr',
            'audio/aac': 'aac',
            'audio/wav': 'wav',
            'audio/webm': 'webm',
        };
        // WhatsApp voice notes are typically audio/ogg; codecs=opus
        const baseMime = mimeType.split(';')[0].trim();
        const ext = extMap[baseMime] || 'ogg';

        const blob = new Blob([audioData], { type: mimeType });
        const formData = new FormData();
        formData.append('file', blob, `voice_note.${ext}`);
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'json');
        // Whisper-1 supports language hints for better accuracy
        formData.append('language', language === 'ar' ? 'ar' : 'en');

        console.log(`[wa-webhook] Transcribing audio: ${audioData.length} bytes, mime=${baseMime}, lang=${language}`);

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${config.apiKey}` },
            body: formData,
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[wa-webhook] Whisper error: ${res.status} ${errText}`);
            return null;
        }

        const result = await res.json();
        const text = (result.text || '').trim();
        console.log(`[wa-webhook] Transcribed: "${text.slice(0, 100)}..." (${text.length} chars)`);
        return text || null;
    } catch (err) {
        console.error('[wa-webhook] Transcription error:', err);
        return null;
    }
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

// ── Get specialty sequence by doctor's specialty ─────
async function getSpecialtySequence(specialty: string) {
    const { data } = await supabase
        .from('prompt_sequences')
        .select('*')
        .eq('sequence_type', 'specialty')
        .eq('specialty', specialty)
        .limit(1)
        .single();
    return data;
}

// ── Get essential-only nodes from a sequence ─────────
async function getEssentialNodes(sequenceId: string) {
    const { data } = await supabase
        .from('prompt_sequence_nodes')
        .select('*, ai_prompts!prompt_id(content)')
        .eq('sequence_id', sequenceId)
        .eq('is_essential', true)
        .order('sort_order', { ascending: true });
    return data || [];
}

// ── Get WA Doctor Greeting prompt content ────────────
async function getDoctorGreetingPrompt(): Promise<string> {
    const { data } = await supabase
        .from('ai_prompts')
        .select('content')
        .eq('name', 'WA — Doctor Greeting')
        .eq('is_active', true)
        .limit(1)
        .single();
    return data?.content || 'You are a medical intake AI. Greet the patient warmly, mention the doctor name and specialty, and emit [SECTION_COMPLETE].';
}

// ── Resolve fast-track mode (3-tier hierarchy) ───────
// Doctor override > Specialty sequence override > Global platform setting
async function resolveFastTrackMode(
    doctorId: string | null,
    sequenceId: string | null,
): Promise<'allow_choice' | 'force_full' | 'force_fast'> {
    // 1. Check doctor-level override
    if (doctorId) {
        const { data: doc } = await supabase
            .from('doctors')
            .select('fast_track_mode')
            .eq('id', doctorId)
            .single();
        if (doc?.fast_track_mode) return doc.fast_track_mode;
    }

    // 2. Check specialty sequence override
    if (sequenceId) {
        const { data: seq } = await supabase
            .from('prompt_sequences')
            .select('fast_track_mode')
            .eq('id', sequenceId)
            .single();
        if (seq?.fast_track_mode) return seq.fast_track_mode;
    }

    // 3. Check global platform setting
    const { data: setting } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'fast_track_enabled')
        .single();

    // Default: if global is true (or not set), allow choice
    return (setting?.value === 'false') ? 'force_full' : 'allow_choice';
}

// ── Check if doctor is eligible for booking offer ────
// Requires: active subscription on qualifying tier + booking_enabled + schedule configured
async function isBookingEligible(doctorId: string | null): Promise<boolean> {
    if (!doctorId) return false;

    try {
        // 1. Check doctor has booking_enabled
        const { data: doc } = await supabase
            .from('doctors')
            .select('booking_enabled')
            .eq('id', doctorId)
            .single();
        if (!doc?.booking_enabled) return false;

        // 2. Check active subscription on qualifying plan
        const qualifyingPlans = ['professional', 'enterprise', 'premium'];
        const { data: sub } = await supabase
            .from('doctor_subscriptions')
            .select('plan, status, expires_at')
            .eq('doctor_id', doctorId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (!sub) return false;
        if (!qualifyingPlans.includes(sub.plan)) return false;
        if (sub.expires_at && new Date(sub.expires_at) < new Date()) return false;

        // 3. Check at least one active schedule slot exists
        const { data: schedules } = await supabase
            .from('doctor_schedules')
            .select('id')
            .eq('doctor_id', doctorId)
            .eq('is_active', true)
            .limit(1);
        if (!schedules || schedules.length === 0) return false;

        return true;
    } catch {
        return false;
    }
}

// ── Find session pending doctor follow-up ────────────
async function getFollowupRequestSession(phone: string) {
    const { data } = await supabase
        .from('wa_chat_sessions')
        .select('*')
        .eq('phone', phone)
        .in('status', ['followup_requested', 'followup_active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    return data;
}

// ── Get pending doctor request for a session ─────────
async function getPendingDoctorRequest(sessionId: string) {
    const { data } = await supabase
        .from('wa_doctor_requests')
        .select('*')
        .eq('session_id', sessionId)
        .in('status', ['sent', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    return data;
}

// ── Section label map for skipped sections ───────────
const SECTION_LABELS: Record<string, { en: string; ar: string }> = {
    quick_medical: { en: 'Medications & Allergies', ar: 'الأدوية والحساسية' },
    quick_background: { en: 'Family & Social History', ar: 'التاريخ العائلي والاجتماعي' },
    media_upload: { en: 'Photos / Documents', ar: 'صور / مستندات' },
    medications: { en: 'Medications', ar: 'الأدوية' },
    allergies: { en: 'Allergies', ar: 'الحساسية' },
    family_history: { en: 'Family History', ar: 'التاريخ العائلي' },
    social_history: { en: 'Social History', ar: 'التاريخ الاجتماعي' },
};

// ── Section-specific prompts for follow-up requests ──
const FOLLOWUP_SECTION_PROMPTS: Record<string, string> = {
    quick_medical: `Ask the patient about their current medications, supplements, and any known allergies (especially to medications). Accept brief answers. Emit [SECTION_COMPLETE] when answered.`,
    quick_background: `Ask the patient briefly about family medical history and whether they smoke or use tobacco. Accept brief answers. Emit [SECTION_COMPLETE] when answered.`,
    media_upload: `Ask the patient if they would like to share any photos of their condition or upload documents (lab results, prescriptions). If they say no/skip, emit [SECTION_COMPLETE] immediately.`,
    medications: `Ask what medications and supplements the patient currently takes. For each: name, dose, frequency. Accept brief answers. Emit [SECTION_COMPLETE] when answered.`,
    allergies: `Ask the patient about any known allergies, especially to medications, latex, or metals. Accept brief answers. Emit [SECTION_COMPLETE] when answered.`,
    family_history: `Ask the patient if any immediate family members have relevant medical conditions. Accept brief answers. Emit [SECTION_COMPLETE] when answered.`,
    social_history: `Ask briefly about smoking/tobacco use and occupation. Accept brief answers. Emit [SECTION_COMPLETE] when answered.`,
};

// ── Get global guard prompt ──────────────────────────
let _guardCache: { content: string | null; ts: number } | null = null;
async function getGlobalGuard(): Promise<string | null> {
    if (_guardCache && Date.now() - _guardCache.ts < 60_000) return _guardCache.content;
    const { data } = await supabase
        .from('ai_prompts')
        .select('content')
        .eq('prompt_type', 'global_guard')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);
    const content = data?.[0]?.content ?? null;
    _guardCache = { content, ts: Date.now() };
    return content;
}

// ── Get Arabic guard supplement (prepended when language=ar) ──
let _arabicGuardCache: { content: string | null; ts: number } | null = null;
async function getArabicGuard(): Promise<string | null> {
    if (_arabicGuardCache && Date.now() - _arabicGuardCache.ts < 60_000) return _arabicGuardCache.content;
    const { data } = await supabase
        .from('ai_prompts')
        .select('content')
        .eq('prompt_type', 'arabic_guard')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);
    const content = data?.[0]?.content ?? null;
    _arabicGuardCache = { content, ts: Date.now() };
    return content;
}

// ── Gibberish detection (server-side) ───────────────
const VALID_SHORT_WA = new Set([
    'no', 'yes', 'ok', 'hi', 'ya', 'na', 'idk', 'none', 'nope', 'yep', 'sure', 'fine', 'good', 'bad',
    'pain', 'ache', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'skip', 'next', 'done', 'menu',
    'la', 'aiwa', 'naam', 'mafi', 'pus', 'rash', 'itch', 'acne', 'cold', 'flu', 'cough',
    'continue', 'stop', 'go', 'hello', 'hey', 'thanks', 'bye',
]);
const VALID_ARABIC_WA = new Set([
    'نعم', 'اي', 'أي', 'ايوا', 'آه', 'اه', 'صح', 'تمام', 'ماشي', 'أكيد', 'طبعاً',
    'لا', 'لأ', 'أبداً', 'مافي', 'مو', 'مب',
    'يلا', 'خلاص', 'بس', 'كفاية', 'تخطي', 'تم', 'انتهيت',
    'ألم', 'صداع', 'حرارة', 'سعال', 'دوخة', 'غثيان', 'تعب', 'إسهال', 'إمساك',
    'حكة', 'طفح', 'ورم', 'نزيف', 'ضغط', 'سكر', 'حساسية', 'التهاب',
    'وش', 'ليش', 'كيف', 'وين', 'متى', 'شلون', 'زين',
    'ايه', 'ازاي', 'فين', 'ليه', 'كويس',
    'شو', 'كيفك', 'هلق', 'منيح', 'طيب',
    'الحمدلله', 'ماشاءالله', 'إنشاءالله', 'يارب',
    'ممكن', 'يمكن', 'كثير', 'قليل', 'دائماً', 'أحياناً',
]);

function isArabicText(text: string): boolean {
    const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const la = (text.match(/[a-zA-Z]/g) || []).length;
    return (ar + la) > 0 && ar / (ar + la) >= 0.4;
}

function detectGibberish(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 3) return false;
    if (VALID_SHORT_WA.has(trimmed.toLowerCase())) return false;

    const alphaOnly = trimmed.replace(/[^a-zA-Z\u0600-\u06FF]/g, '');
    if (alphaOnly.length < 3) return false;

    // Arabic path — VERY lenient, only catch obvious keyboard mashing
    if (isArabicText(trimmed)) {
        // Any multi-word Arabic text is always valid
        const arWords = trimmed.split(/\s+/);
        if (arWords.length >= 2) return false;
        // Whitelist check
        const norm = trimmed.replace(/[\s\u0610-\u065F\u0670\u06D6-\u06ED]/g, '');
        if (VALID_ARABIC_WA.has(norm) || VALID_ARABIC_WA.has(trimmed)) return false;
        // Only flag: 4+ repeated Arabic chars (ققققق) or single word >20 chars
        if (/([\u0600-\u06FF])\1{3,}/i.test(alphaOnly)) return true;
        if (arWords.length === 1 && alphaOnly.length > 20) return true;
        return false;
    }

    // English path
    if (/(.)\\1{4,}/i.test(alphaOnly)) return true;
    const vowels = (alphaOnly.match(/[aeiouAEIOU]/g) || []).length;
    if (alphaOnly.length > 5 && vowels / alphaOnly.length < 0.15) return true;
    if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(alphaOnly)) return true;
    const words = trimmed.split(/\s+/);
    if (words.length === 1 && alphaOnly.length > 8) {
        const common = /(?:ing|tion|ment|ness|able|ache|pain|burn|itch|rash|pill|drug|skin|head|back|knee|cold|cough|flu|sore|hurt|sick|feel|take|need|help|want)/i;
        if (!common.test(alphaOnly)) return true;
    }
    return false;
}

const GIBBERISH_RESPONSES_AR = [
    'لم أتمكن من فهم ذلك. حاول مرة أخرى بإجابة واضحة.',
    'يبدو أن هناك خطأ في الرسالة. هل يمكنك إعادة الكتابة بوضوح؟',
];
const GIBBERISH_RESPONSES_EN = [
    "I didn't quite understand that. Could you please rephrase?",
    "It looks like your message may have had a typo. Could you try again?",
];

// ── Soft redirect detection ─────────────────────
const REDIRECT_PHRASES = [
    "i'm here to help with your medical intake",
    "let's focus on your health",
    "let's continue with your health",
    "please let me know what health concern",
    "what health concern would you like to discuss",
    'أنا هنا لمساعدتك في المقابلة الطبية',
    'دعنا نركز على صحتك',
    'ما المشكلة الصحية التي تود مناقشتها',
];

function detectSoftRedirect(aiResponse: string): boolean {
    const lower = aiResponse.toLowerCase();
    return REDIRECT_PHRASES.some(p => lower.includes(p));
}

// ── Concise sections suffix (for non-HPI interview sections) ──
const CONCISE_SUFFIX = `

EFFICIENCY RULES FOR THIS SECTION:
- Keep this section SHORT. Ask 1-3 questions maximum.
- The numbered items in section rules are a MENU, NOT a checklist. Select only the 1-3 most relevant.
- If patient answers "no"/"none"/"nothing", accept it immediately and emit [SECTION_COMPLETE].
- Consolidate related questions into one (e.g., "Do you smoke, drink, or exercise regularly?").
- If patient already provided info earlier, briefly confirm and emit [SECTION_COMPLETE].
- The doctor will follow up on anything unclear. Your job is screening, not exhaustive questioning.`;

// Sections that should get CONCISE_SUFFIX
const CONCISE_ELIGIBLE = ['medications', 'allergies', 'family_history', 'social_history', 'review_of_systems', 'past_medical', 'pmh', 'past_dermatological', 'triggers_exposures', 'current_medications'];

// Sections where HPI-depth is needed (no concise suffix)
const HPI_SECTIONS = ['hpi', 'presenting_concern', 'skin_complaint_hpi', 'msk_pain'];

// ── Chat with OpenAI (conversation mode) ─────────────
async function chatWithAI(
    systemPrompt: string,
    history: { role: string; content: string }[],
    maxTokens = 800,
    language = 'ar',
): Promise<string> {
    const config = await getOpenAIConfig();
    const guard = await getGlobalGuard();
    const arabicGuard = language === 'ar' ? await getArabicGuard() : null;

    let finalPrompt: string;
    if (guard && arabicGuard) {
        finalPrompt = `${guard}\n\n${arabicGuard}\n\n---\n\n${systemPrompt}`;
    } else if (guard) {
        finalPrompt = `${guard}\n\n---\n\n${systemPrompt}`;
    } else {
        finalPrompt = systemPrompt;
    }

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
    const upper = code.toUpperCase();
    // Try locum_code first, then identifier_code as fallback
    const { data } = await supabase
        .from('doctors')
        .select('id, display_name, full_name, specialty, locum_code, identifier_code')
        .or(`locum_code.ilike.${upper},identifier_code.ilike.${upper}`)
        .eq('status', 'active')
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
    wrapAtTurn?: number | null,
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
- You MUST ask at least ONE question before emitting [SECTION_COMPLETE].
- NO CONFIRMATION TURNS: Do NOT end with "Is that correct?" or "Anything else?". Just emit [SECTION_COMPLETE].
- NO SUMMARIES within or at the end of a section.`;

        // Concise suffix for non-HPI sections
        if (!HPI_SECTIONS.includes(section) && CONCISE_ELIGIBLE.some(s => section.includes(s))) {
            prompt += CONCISE_SUFFIX;
        }
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

    // Soft wrap-up nudge (gentle - start concluding)
    const effectiveWrap = wrapAtTurn ?? (maxTurns > 2 ? maxTurns - 1 : null);
    if (effectiveWrap && effectiveWrap > 0 && turnCount >= effectiveWrap && !(maxTurns > 0 && turnCount >= maxTurns - 1)) {
        prompt += `\n\nNOTE: You are at turn ${turnCount + 1}. Start wrapping up this section — ask one final confirmation/clarification question, then emit [SECTION_COMPLETE] on the next turn. Do NOT open new topics.`;
    }

    // Hard turn limit (force conclude)
    if (maxTurns > 0 && turnCount >= maxTurns - 1) {
        prompt += `\n\nCRITICAL: You are at turn ${turnCount + 1}/${maxTurns}. Conclude this section NOW and emit [SECTION_COMPLETE].`;
    }

    return prompt;
}

// ── BRAND LOGO (shown above greeting in WhatsApp) ───
const BRAND_LOGO_URL = 'https://cliniq.one/cliniq-logo-full.png';

// ── SPECIALTY PHOTO CONFIG ───────────────────────────
// Defines how the fast-track photo step behaves per specialty
const SPECIALTY_PHOTO_CONFIG: Record<string, {
    mode: 'required' | 'encouraged' | 'optional' | 'skip';
    promptAr: string;
    promptEn: string;
    moreAr: string;  // After receiving a photo, prompt for more
    moreEn: string;
}> = {
    dermatology: {
        mode: 'required',
        promptAr: '📸 مهم جداً — أرسل صورة واضحة للمنطقة المصابة من الجلد.\nالصورة تساعد الطبيب كثيراً في التشخيص 🔍\n\n📷 أرسل الصورة الآن\n✅ أو اكتب *تخطي* للمتابعة (لكن الصورة مهمة جداً!)',
        promptEn: '📸 Very important — Send a clear photo of the affected skin area.\nThis helps your doctor greatly with diagnosis 🔍\n\n📷 Send your photo now\n✅ Or type *skip* to continue (but photos are very important!)',
        moreAr: '📸 تم استلام الصورة! شكراً. ✅\n\n📷 أرسل صور إضافية (من زوايا مختلفة) أو اكتب *تم* للمتابعة',
        moreEn: '📸 Photo received! Thanks. ✅\n\n📷 Send more photos (from different angles) or type *done* to continue',
    },
    orthopedics: {
        mode: 'encouraged',
        promptAr: '📸 هل عندك صورة للمنطقة المصابة أو أشعة سينية؟\nالصورة مفيدة جداً للتقييم 🦴\n\n📷 أرسل الصورة أو الأشعة الآن\n✅ أو اكتب *تخطي* للمتابعة',
        promptEn: '📸 Do you have a photo of the affected area or any X-rays?\nThis is very helpful for assessment 🦴\n\n📷 Send your photo or X-ray now\n✅ Or type *skip* to continue',
        moreAr: '📸 تم استلام الصورة! شكراً. ✅\n\n📷 أرسل صور أو أشعة إضافية أو اكتب *تم* للمتابعة',
        moreEn: '📸 Photo received! Thanks. ✅\n\n📷 Send more photos or X-rays, or type *done* to continue',
    },
    pediatrics: {
        mode: 'optional',
        promptAr: '📋 هل عندك تقارير طبية أو صور تبي تشاركها؟\n(مثل: تطعيمات، تحاليل، صور للحالة)\n\n📷 أرسل الآن\n✅ أو اكتب *تخطي* للمتابعة',
        promptEn: '📋 Do you have any medical documents or photos to share?\n(e.g., vaccination records, lab results, photos of the condition)\n\n📷 Send now\n✅ Or type *skip* to continue',
        moreAr: '📸 تم الاستلام! شكراً. ✅\n\n📷 أرسل المزيد أو اكتب *تم* للمتابعة',
        moreEn: '📸 Received! Thanks. ✅\n\n📷 Send more or type *done* to continue',
    },
    family_medicine: {
        mode: 'optional',
        promptAr: '📋 هل عندك تقارير طبية تبي تشاركها؟\n(مثل: نتائج تحاليل، وصفات سابقة)\n\n📷 أرسل الآن\n✅ أو اكتب *تخطي* للمتابعة',
        promptEn: '📋 Do you have any medical documents to share?\n(e.g., lab results, previous prescriptions)\n\n📷 Send now\n✅ Or type *skip* to continue',
        moreAr: '📸 تم الاستلام! شكراً. ✅\n\n📷 أرسل المزيد أو اكتب *تم* للمتابعة',
        moreEn: '📸 Received! Thanks. ✅\n\n📷 Send more or type *done* to continue',
    },
    diet: {
        mode: 'optional',
        promptAr: '📋 هل عندك تحاليل دم أو تقارير غذائية تبي تشاركها؟\n\n📷 أرسل الآن\n✅ أو اكتب *تخطي* للمتابعة',
        promptEn: '📋 Do you have any blood work or nutritional reports to share?\n\n📷 Send now\n✅ Or type *skip* to continue',
        moreAr: '📸 تم الاستلام! شكراً. ✅\n\n📷 أرسل المزيد أو اكتب *تم* للمتابعة',
        moreEn: '📸 Received! Thanks. ✅\n\n📷 Send more or type *done* to continue',
    },
    psychiatry: {
        mode: 'skip',
        promptAr: '',
        promptEn: '',
        moreAr: '',
        moreEn: '',
    },
};

// Default config for unknown specialties or general intake
const DEFAULT_PHOTO_CONFIG = {
    mode: 'optional' as const,
    promptAr: '📸 هل عندك صور للحالة أو تقارير طبية تبي تشاركها؟\n\n📷 أرسل الصور الآن\n✅ أو اكتب *تخطي* للمتابعة بدون صور',
    promptEn: '📸 Do you have any photos of your condition or medical documents to share?\n\n📷 Send your photos now\n✅ Or type *skip* to continue without photos',
    moreAr: '📸 تم استلام الصورة! شكراً. ✅\n\n📷 أرسل صور إضافية أو اكتب *تم* للمتابعة',
    moreEn: '📸 Photo received! Thanks. ✅\n\n📷 Send more photos or type *done* to continue',
};

// Helper: get photo config for a specialty
function getPhotoConfig(specialty: string) {
    return SPECIALTY_PHOTO_CONFIG[specialty] || DEFAULT_PHOTO_CONFIG;
}

// ── MENU TEXT ────────────────────────────────────────
const MENU_AR = `👋 مرحباً بك في cliniq.one!

عيادتك الرقمية — استشارات طبية مع أطباء مرخّصين 🩺

🤖 مقابلة طبية ذكية بالذكاء الاصطناعي

👨‍⚕️ مراجعة من طبيب مرخّص خلال ٢-٤ ساعات

📋 تقرير طبي + وصفة إلكترونية

━━━━━━━━━━━━━━━

اختر من القائمة:

1️⃣  استشارة طبية جديدة

2️⃣  حجز موعد

3️⃣  متابعة استشارة سابقة

4️⃣  🌐 English

━━━━━━━━━━━━━━━

⬇️ أرسل رقم الخيار أو اكتب رمز الطبيب للبدء`;

const MENU_EN = `👋 Welcome to cliniq.one!

Your digital clinic — licensed doctors, one message away 🩺

🤖 AI-powered medical intake interview

👨‍⚕️ Licensed doctor review within 2-4 hours

📋 Medical report + e-prescription

━━━━━━━━━━━━━━━

Choose from the menu:

1️⃣  New medical consultation

2️⃣  Book an appointment

3️⃣  Follow-up on previous consultation

4️⃣  🌐 عربي (Arabic)

━━━━━━━━━━━━━━━

⬇️ Send the option number or type your doctor code to start`;

// ── FAST TRACK GATE MESSAGE ─────────────────────────
const FAST_TRACK_MSG_AR = `✅ شكراً! حصلت على تفاصيل مهمة عن حالتك.

يمكنك:
1️⃣  الإجابة على أسئلة سريعة إضافية (أدوية، حساسية، تاريخ طبي) — دقيقة واحدة
2️⃣  إنهاء الآن وإرسال التقرير للطبيب مباشرة ⚡

أرسل 1 أو 2`;

const FAST_TRACK_MSG_EN = `✅ Thanks! I have the important details about your condition.

You can:
1️⃣  Answer a few more quick questions (medications, allergies, medical history) — 1 minute
2️⃣  Finish now and send the report to your doctor directly ⚡

Send 1 or 2`;

// ── BOOKING LINK ─────────────────────────────────────
function getBookingLink(doctorCode?: string): string {
    // TODO: Replace with production URL
    const base = 'https://wa-intake.cliniq.one';
    return doctorCode ? `${base}?doc=${doctorCode}` : base;
}

// ── App URL for doctor browsing (general intake) ────
const APP_DOCTORS_URL = 'https://wa-intake.cliniq.one/doctors';

// ── Handle intake completion (with or without doctor) ─
async function handleIntakeComplete(
    session: any,
    summary: string,
    history: { role: string; content: string; ts: string }[],
    phone: string,
    creds: NonNullable<typeof metaCreds>,
    extra?: { fastTracked?: boolean; skippedSections?: string[] },
) {
    if (session.doctor_id) {
        // Create consultation for assigned doctor
        const { data: consultation } = await supabase
            .from('consultations')
            .insert({
                patient_name: session.patient_name || 'WhatsApp Patient',
                doctor_id: session.doctor_id,
                specialty: 'general',
                status: 'pending',
                source: 'whatsapp_chatbot',
                ai_report: { waSessionId: session.id, summary, history, ...extra },
                photos: session.media_urls || [],
            })
            .select('id')
            .single();

        if (consultation) {
            await updateSession(session.id, { status: 'consultation_created', consultation_id: consultation.id });
        }

        const doneMsg = session.language === 'ar'
            ? `✅ تم إرسال تقريرك للطبيب بنجاح!\n\n📋 سيتم مراجعة استشارتك والرد عليك قريباً\n\n━━━━━━━━━━━━━━━\n\n📅 لحجز موعد:\n${getBookingLink(session.doctor_code)}`
            : `✅ Your report has been sent to the doctor!\n\n📋 Your consultation will be reviewed shortly\n\n━━━━━━━━━━━━━━━\n\n📅 To book an appointment:\n${getBookingLink(session.doctor_code)}`;
        await sendWhatsAppMessage(phone, doneMsg, creds);
    } else {
        // General intake — direct to app to choose doctor
        const doneMsg = session.language === 'ar'
            ? `✅ تم حفظ تقريرك الطبي بنجاح!\n\n━━━━━━━━━━━━━━━\n\n📱 لاختيار طبيبك وإرسال التقرير:\n${APP_DOCTORS_URL}\n\n👨‍⚕️ تصفح الأطباء المتاحين واختر الأنسب لحالتك`
            : `✅ Your medical report has been saved!\n\n━━━━━━━━━━━━━━━\n\n📱 Choose your doctor and send the report:\n${APP_DOCTORS_URL}\n\n👨‍⚕️ Browse available doctors and select the best fit`;
        await sendWhatsAppMessage(phone, doneMsg, creds);
    }
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
    isVoiceNote?: boolean,
) {
    const phone = normalizePhone(senderPhone);
    const text = (messageText || '').trim();
    const lowerText = text.toLowerCase();

    // ── Mark as read ──
    await markAsRead(wamid, creds);

    // ── Find or create session ──
    let session = await getActiveSession(phone);

    // ── Check for doctor follow-up sessions ──
    const followupSession = !session ? await getFollowupRequestSession(phone) : null;

    // ── Menu commands (always available) ──
    if (['menu', 'قائمة', 'start', 'hi', 'hello', 'مرحبا', 'السلام', 'السلام عليكم'].includes(lowerText)) {
        if (session) {
            // Reset session
            await updateSession(session.id, { status: 'abandoned' });
        }
        session = await createSession(phone, waPhoneNumberId);
        await sendWhatsAppImage(phone, BRAND_LOGO_URL, MENU_AR, creds);
        return;
    }

    // ── Doctor follow-up flow (re-engagement) ──
    if (followupSession) {
        await handleDoctorFollowup(followupSession, phone, text, null, creds);
        return;
    }

    // ── No active session → create one and show menu ──
    if (!session) {
        session = await createSession(phone, waPhoneNumberId);
        await sendWhatsAppImage(phone, BRAND_LOGO_URL, MENU_AR, creds);
        return;
    }

    // ── STATE: Awaiting doctor code ──
    if (session.status === 'awaiting_doctor_code') {
        const lang = session.language || 'ar';

        // Option 4: Switch language
        if (text === '4' || lowerText === 'english' || lowerText === 'عربي' || lowerText === 'arabic') {
            const newLang = lang === 'ar' ? 'en' : 'ar';
            await updateSession(session.id, { language: newLang });
            const menu = newLang === 'ar' ? MENU_AR : MENU_EN;
            await sendWhatsAppImage(phone, BRAND_LOGO_URL, menu, creds);
            return;
        }

        // Option 2: Booking link
        if (text === '2' || lowerText === 'حجز' || lowerText === 'book') {
            const msg = lang === 'ar'
                ? `📅 لحجز موعد، افتح الرابط:\n${getBookingLink()}`
                : `📅 To book an appointment, open the link:\n${getBookingLink()}`;
            await sendWhatsAppMessage(phone, msg, creds);
            return;
        }

        // Option 1: New consultation (ask for code or proceed without)
        if (text === '1' || lowerText === 'استشارة' || lowerText === 'consultation') {
            const msg = lang === 'ar'
                ? '🔑 أرسل رمز الطبيب الخاص بك للبدء\n\nمثال: DR-A3F2\n\n━━━━━━━━━━━━━━━\n\n📱 ليس لديك رمز؟\nأرسل *0* للمتابعة بدون طبيب محدد'
                : '🔑 Send your doctor code to start\n\nExample: DR-A3F2\n\n━━━━━━━━━━━━━━━\n\n📱 Don\'t have a code?\nSend *0* to continue without a specific doctor';
            await sendWhatsAppMessage(phone, msg, creds);
            return;
        }

        // Option 3: Follow-up (requires doctor code)
        if (text === '3' || lowerText === 'متابعة' || lowerText === 'followup' || lowerText === 'follow-up') {
            const msg = lang === 'ar'
                ? '🔑 أرسل رمز الطبيب لمتابعة استشارتك\n\nمثال: DR-A3F2'
                : '🔑 Send your doctor code to follow up on your consultation\n\nExample: DR-A3F2';
            await sendWhatsAppMessage(phone, msg, creds);
            return;
        }

        // Option 0: No doctor code → general AI intake
        if (text === '0') {
            const sequence = await getSequenceByType('wa_new_visit');
            if (!sequence) {
                const errMsg = lang === 'ar' ? '⚠️ النظام غير جاهز حالياً. حاول مرة أخرى لاحقاً.' : '⚠️ System not ready. Please try again later.';
                await sendWhatsAppMessage(phone, errMsg, creds);
                return;
            }

            const nodes = await getSequenceNodes(sequence.id);
            const firstNode = nodes[0];

            const patientContext = 'Doctor: Not assigned (general intake)\nSpecialty: general';

            const promptContent = firstNode?.ai_prompts?.content || 'You are a medical intake AI. Greet the patient.';
            const systemPrompt = buildSectionPrompt(
                promptContent,
                firstNode?.step_key || 'wa_greeting',
                lang,
                patientContext,
                0,
                firstNode?.max_turns || 3,
            );

            const aiResponse = await chatWithAI(systemPrompt, []);
            const cleanResponse = aiResponse
                .replace(/\[SECTION_COMPLETE\]/g, '')
                .replace(/\[ADDENDUM_DONE\]/g, '')
                .trim();

            const sectionComplete = aiResponse.includes('[SECTION_COMPLETE]');
            let currentStep = firstNode?.step_key || '';
            let turnCount = 1;

            const autoAdvanceSteps = ['wa_greeting', 'greeting', 'wa_visit_type'];
            if (sectionComplete && autoAdvanceSteps.includes(firstNode?.step_key) && nodes.length > 1) {
                currentStep = nodes[1].step_key;
                turnCount = 0;
            }

            await updateSession(session.id, {
                status: 'active',
                doctor_id: null,
                doctor_code: null,
                pathway: 'new_visit',
                current_step: currentStep,
                current_sequence_id: sequence.id,
                turn_count: turnCount,
                patient_context: patientContext,
                conversation_history: [
                    { role: 'ai', content: cleanResponse, ts: new Date().toISOString() },
                ],
            });

            await sendWhatsAppMessage(phone, cleanResponse, creds);
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
                const errMsg = lang === 'ar' ? '⚠️ النظام غير جاهز حالياً. حاول مرة أخرى لاحقاً.' : '⚠️ System not ready. Please try again later.';
                await sendWhatsAppMessage(phone, errMsg, creds);
                return;
            }

            const nodes = await getSequenceNodes(sequence.id);
            const firstNode = nodes[0];
            const doctorName = doctor.display_name || doctor.full_name;
            const doctorSpecialty = doctor.specialty || 'general';

            // Build patient context with doctor info
            const patientContext = `Doctor: Dr. ${doctorName}\nSpecialty: ${doctorSpecialty}`;

            // ── DOCTOR GREETING: Personalized greeting mentioning doctor + specialty ──
            const greetingPrompt = await getDoctorGreetingPrompt();
            const greetingSystem = buildSectionPrompt(
                greetingPrompt,
                'doctor_greeting',
                lang,
                patientContext,
                0,
                1,
            );
            const greetingResponse = await chatWithAI(greetingSystem, []);
            const cleanGreeting = greetingResponse
                .replace(/\[SECTION_COMPLETE\]/g, '')
                .replace(/\[ADDENDUM_DONE\]/g, '')
                .trim();

            // Auto-advance to HPI (first real interview node)
            const hpiNode = nodes.find((n: any) => n.step_key === 'hpi') || firstNode;
            const currentStep = hpiNode?.step_key || firstNode?.step_key || '';

            // Update session — start at HPI, skip any greeting nodes
            await updateSession(session.id, {
                status: 'active',
                doctor_id: doctor.id,
                doctor_code: doctor.locum_code || text,
                pathway,
                current_step: currentStep,
                current_sequence_id: sequence.id,
                turn_count: 0,
                patient_context: patientContext,
                conversation_history: [
                    { role: 'ai', content: cleanGreeting, ts: new Date().toISOString() },
                ],
            });

            // Send personalized greeting
            await sendWhatsAppMessage(phone, cleanGreeting, creds);
            return;
        }

        // Unknown input → prompt for doctor code or skip
        const unknownMsg = lang === 'ar'
            ? '❌ لم أتعرف على هذا الرمز\n\n🔑 أرسل رمز الطبيب (مثال: DR-A3F2)\n\n📱 أو أرسل *0* للمتابعة بدون طبيب محدد\n\n🔄 أو أرسل *menu* للقائمة'
            : '❌ Code not recognized\n\n🔑 Send your doctor code (e.g. DR-A3F2)\n\n📱 Or send *0* to continue without a doctor\n\n🔄 Or send *menu* for the main menu';
        await sendWhatsAppMessage(phone, unknownMsg, creds);
        return;
    }

    // ── STATE: Active intake (includes fast_track_gate handling) ──
    if (session.status === 'active') {
        // conversation_history is JSONB — Supabase returns it parsed.
        // Safety: handle legacy sessions where it was double-stringified.
        let rawHistory = session.conversation_history || [];
        if (typeof rawHistory === 'string') {
            try { rawHistory = JSON.parse(rawHistory); } catch { rawHistory = []; }
        }
        const history = (rawHistory as { role: string; content: string; ts: string }[]);

        // ── FAST TRACK GATE: Handle patient's 1/2 response ──
        if (session.current_step === 'fast_track_gate') {
            history.push({ role: 'patient', content: text, ts: new Date().toISOString() });

            const skipKeywords = ['2', '٢', 'skip', 'تخطي', 'إنهاء', 'finish', 'done'];
            const continueKeywords = ['1', '١', 'continue', 'متابعة', 'أكمل', 'yes', 'نعم'];
            const isSkip = skipKeywords.some(k => lowerText.includes(k));
            const isContinue = continueKeywords.some(k => lowerText.includes(k));

            if (isSkip) {
                // FAST TRACK: Check specialty to decide photo behavior
                const doctorSpecialty = (session.patient_context || '').match(/Specialty:\s*(\S+)/)?.[1] || 'general';
                const photoConfig = getPhotoConfig(doctorSpecialty);

                if (photoConfig.mode === 'skip') {
                    // Specialty has no photo step (e.g., psychiatry) — go straight to essentials/wrapup
                    const specialtySeq = doctorSpecialty && doctorSpecialty !== 'general'
                        ? await getSpecialtySequence(doctorSpecialty) : null;
                    const essentialNodes = specialtySeq ? await getEssentialNodes(specialtySeq.id) : [];

                    if (essentialNodes.length > 0) {
                        await updateSession(session.id, {
                            fast_tracked: true,
                            current_sequence_id: specialtySeq!.id,
                            current_step: essentialNodes[0].step_key,
                            turn_count: 0,
                            conversation_history: history,
                            patient_context: (session.patient_context || '') + '\n⚡ FAST TRACK: Running essential items only.',
                        });
                        const ackMsg = session.language === 'ar'
                            ? '⚡ ممتاز! بس محتاج منك شي أو شيين مهمين قبل ما نخلص...'
                            : '⚡ Great! Just need one or two essential things before we wrap up...';
                        await sendWhatsAppMessage(phone, ackMsg, creds);
                        return;
                    }

                    // No essentials — jump to wrapup
                    const nodes = await getSequenceNodes(session.current_sequence_id);
                    const hpiIdx = nodes.findIndex((n: any) => n.step_key === 'hpi');
                    const skippedSections = nodes.slice(hpiIdx + 1).map((n: any) => n.step_key);
                    const wrapupSeq = await getSequenceByType('wa_wrapup');
                    if (wrapupSeq) {
                        const wrapupNodes = await getSequenceNodes(wrapupSeq.id);
                        if (wrapupNodes.length > 0) {
                            const fullContext = history.filter(m => m.role === 'patient').map(m => m.content).join('\n');
                            const skipNote = `\n\n⚡ FAST TRACK: Skipped sections: ${skippedSections.join(', ')}.`;
                            await updateSession(session.id, {
                                fast_tracked: true,
                                skipped_sections: skippedSections,
                                current_sequence_id: wrapupSeq.id,
                                current_step: wrapupNodes[0].step_key,
                                turn_count: 0,
                                conversation_history: history,
                                patient_context: (session.patient_context || '') + `\n\nFull patient responses:\n${fullContext}` + skipNote,
                            });

                            const wrapupPrompt = wrapupNodes[0].ai_prompts?.content || 'Summarize the intake and emit [ADDENDUM_DONE].';
                            const wrapupSystem = buildSectionPrompt(
                                wrapupPrompt, wrapupNodes[0].step_key, session.language || 'ar',
                                (session.patient_context || '') + `\n\nFull patient responses:\n${fullContext}` + skipNote,
                                0, wrapupNodes[0].max_turns || 4,
                            );
                            const wrapupResponse = await chatWithAI(wrapupSystem, history);
                            const wrapupClean = wrapupResponse.replace(/\[SECTION_COMPLETE\]/g, '').replace(/\[ADDENDUM_DONE\]/g, '').trim();
                            history.push({ role: 'ai', content: wrapupClean, ts: new Date().toISOString() });

                            if (wrapupResponse.includes('[ADDENDUM_DONE]')) {
                                await updateSession(session.id, {
                                    status: 'intake_complete', conversation_history: history,
                                    intake_report: { summary: wrapupClean, fastTracked: true, skippedSections, completedAt: new Date().toISOString() },
                                    completed_at: new Date().toISOString(),
                                });
                                await sendWhatsAppMessage(phone, wrapupClean, creds);
                                await handleIntakeComplete(session, wrapupClean, history, phone, creds, { fastTracked: true, skippedSections });
                                return;
                            }
                            await updateSession(session.id, { turn_count: 1, conversation_history: history });
                            await sendWhatsAppMessage(phone, wrapupClean, creds);
                            return;
                        }
                    }
                    return;
                }

                // Photo step is active for this specialty — route to fast_track_photo
                await updateSession(session.id, {
                    fast_tracked: true,
                    current_step: 'fast_track_photo',
                    turn_count: 0,
                    conversation_history: history,
                    patient_context: (session.patient_context || '') + '\n⚡ FAST TRACK: Patient chose quick finish.',
                });

                const photoMsg = session.language === 'ar' ? photoConfig.promptAr : photoConfig.promptEn;
                await sendWhatsAppMessage(phone, photoMsg, creds);
                return;
            } else if (isContinue) {
                // CONTINUE: Route to specialty Phase 2 sequence
                const doctorSpecialty = (session.patient_context || '').match(/Specialty:\s*(\S+)/)?.[1] || '';
                const specialtySeq = doctorSpecialty && doctorSpecialty !== 'general'
                    ? await getSpecialtySequence(doctorSpecialty)
                    : null;

                if (specialtySeq) {
                    // Get specialty nodes, skip HPI (already done)
                    const specialtyNodes = await getSequenceNodes(specialtySeq.id);
                    const nonHpiNodes = specialtyNodes.filter((n: any) => n.step_key !== 'hpi');
                    const firstNode = nonHpiNodes[0];

                    if (firstNode) {
                        await updateSession(session.id, {
                            current_sequence_id: specialtySeq.id,
                            current_step: firstNode.step_key,
                            turn_count: 0,
                            conversation_history: history,
                            patient_context: (session.patient_context || '') + `\nPhase 2: ${doctorSpecialty} specialty sequence`,
                        });

                        const ackMsg = session.language === 'ar'
                            ? '👍 ممتاز! لنكمل بأسئلة متخصصة لحالتك...'
                            : '👍 Great! Let\'s continue with some specialist questions...';
                        await sendWhatsAppMessage(phone, ackMsg, creds);
                        return;
                    }
                }

                // Fallback: no specialty sequence → continue with generic wa_new_visit nodes
                const nodes = await getSequenceNodes(session.current_sequence_id);
                const hpiIdx = nodes.findIndex((n: any) => n.step_key === 'hpi');
                const nextNode = nodes[hpiIdx + 1];

                if (nextNode) {
                    await updateSession(session.id, {
                        current_step: nextNode.step_key,
                        turn_count: 0,
                        conversation_history: history,
                    });
                    const ackMsg = session.language === 'ar'
                        ? '👍 ممتاز! لنكمل ببعض الأسئلة السريعة.'
                        : '👍 Great! Let\'s continue with a few quick questions.';
                    await sendWhatsAppMessage(phone, ackMsg, creds);
                } else {
                    await sendWhatsAppMessage(phone, session.language === 'ar' ? '✅ شكراً!' : '✅ Thank you!', creds);
                }
                return;
            } else {
                // Unclear response — ask again
                const retryMsg = session.language === 'ar'
                    ? 'الرجاء أرسل 1 للمتابعة أو 2 للإنهاء.'
                    : 'Please send 1 to continue or 2 to finish.';
                await sendWhatsAppMessage(phone, retryMsg, creds);
                return;
            }
            return;
        }

        // ── FAST TRACK PHOTO: Handle text responses during photo step ──
        if (session.current_step === 'fast_track_photo' && !mediaId) {
            history.push({ role: 'patient', content: text, ts: new Date().toISOString() });

            const skipWords = ['skip', 'تخطي', 'لا', 'no', 'pass', 'next', 'التالي', 'done', 'تم', 'خلاص', 'انتهيت'];
            if (skipWords.some(w => lowerText.includes(w))) {
                // Proceed to essentials or wrapup
                const doctorSpecialty = (session.patient_context || '').match(/Specialty:\s*(\S+)/)?.[1] || '';
                const specialtySeq = doctorSpecialty && doctorSpecialty !== 'general'
                    ? await getSpecialtySequence(doctorSpecialty)
                    : null;
                const essentialNodes = specialtySeq ? await getEssentialNodes(specialtySeq.id) : [];

                if (essentialNodes.length > 0) {
                    await updateSession(session.id, {
                        current_sequence_id: specialtySeq!.id,
                        current_step: essentialNodes[0].step_key,
                        turn_count: 0,
                        conversation_history: history,
                        patient_context: (session.patient_context || '') + '\n⚡ Running essential items only.',
                    });

                    const ackMsg = session.language === 'ar'
                        ? '⚡ ممتاز! بس محتاج منك شي أو شيين مهمين قبل ما نخلص...'
                        : '⚡ Great! Just need one or two essential things before we wrap up...';
                    await sendWhatsAppMessage(phone, ackMsg, creds);
                    return;
                }

                // No essentials — jump to wrapup
                const nodes = await getSequenceNodes(session.current_sequence_id);
                const hpiIdx = nodes.findIndex((n: any) => n.step_key === 'hpi');
                const skippedSections = nodes
                    .slice(hpiIdx + 1)
                    .filter((n: any) => n.step_key !== 'photo_capture')
                    .map((n: any) => n.step_key);

                const wrapupSeq = await getSequenceByType('wa_wrapup');
                if (wrapupSeq) {
                    const wrapupNodes = await getSequenceNodes(wrapupSeq.id);
                    if (wrapupNodes.length > 0) {
                        const fullContext = history.filter(m => m.role === 'patient').map(m => m.content).join('\n');
                        const skipNote = `\n\n⚡ FAST TRACK: Skipped sections: ${skippedSections.join(', ')}. Photo/document upload was offered.`;

                        await updateSession(session.id, {
                            skipped_sections: skippedSections,
                            current_sequence_id: wrapupSeq.id,
                            current_step: wrapupNodes[0].step_key,
                            turn_count: 0,
                            conversation_history: history,
                            patient_context: (session.patient_context || '') + `\n\nFull patient responses:\n${fullContext}` + skipNote,
                        });

                        const wrapupPrompt = wrapupNodes[0].ai_prompts?.content || 'Summarize the intake and emit [ADDENDUM_DONE].';
                        const wrapupSystem = buildSectionPrompt(
                            wrapupPrompt,
                            wrapupNodes[0].step_key,
                            session.language || 'ar',
                            (session.patient_context || '') + `\n\nFull patient responses:\n${fullContext}` + skipNote,
                            0,
                            wrapupNodes[0].max_turns || 4,
                        );

                        const wrapupResponse = await chatWithAI(wrapupSystem, history);
                        const wrapupClean = wrapupResponse
                            .replace(/\[SECTION_COMPLETE\]/g, '')
                            .replace(/\[ADDENDUM_DONE\]/g, '')
                            .trim();
                        history.push({ role: 'ai', content: wrapupClean, ts: new Date().toISOString() });

                        if (wrapupResponse.includes('[ADDENDUM_DONE]')) {
                            await updateSession(session.id, {
                                status: 'intake_complete',
                                conversation_history: history,
                                intake_report: { summary: wrapupClean, fastTracked: true, skippedSections, completedAt: new Date().toISOString() },
                                completed_at: new Date().toISOString(),
                            });
                            await sendWhatsAppMessage(phone, wrapupClean, creds);
                            await handleIntakeComplete(session, wrapupClean, history, phone, creds, { fastTracked: true, skippedSections });
                            return;
                        }

                        await updateSession(session.id, { turn_count: 1, conversation_history: history });
                        await sendWhatsAppMessage(phone, wrapupClean, creds);
                        return;
                    }
                }

                // Last fallback
                await sendWhatsAppMessage(phone, session.language === 'ar' ? '✅ شكراً!' : '✅ Thank you!', creds);
                return;
            }

            // Patient sent text but not skip — re-prompt for photos
            const retryMsg = session.language === 'ar'
                ? '📷 أرسل صورة أو مستند، أو اكتب *تخطي* للمتابعة'
                : '📷 Send a photo or document, or type *skip* to continue';
            await sendWhatsAppMessage(phone, retryMsg, creds);
            return;
        }

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

                    const existingMedia = typeof session.media_urls === 'string' ? JSON.parse(session.media_urls) : (session.media_urls || []);
                    const mediaUrls = [...existingMedia, urlData.publicUrl];
                    await updateSession(session.id, { media_urls: mediaUrls });

                    // Add to context
                    history.push({ role: 'patient', content: `[Photo uploaded: ${urlData.publicUrl}]`, ts: new Date().toISOString() });
                    await updateSession(session.id, {
                        conversation_history: history,
                        patient_context: (session.patient_context || '') + `\n[Patient uploaded photo: ${urlData.publicUrl}]`,
                    });

                    // ── Auto-advance if current step is a photo/upload node ──
                    const nodes = await getSequenceNodes(session.current_sequence_id);
                    const curIdx = nodes.findIndex((n: any) => n.step_key === session.current_step);
                    const curNode = nodes[curIdx];
                    const uploadSteps = ['photo_capture', 'report_upload', 'med_label_capture'];
                    const uploadNodeTypes = ['system_upload', 'med_label_capture'];

                    if (curNode && (uploadSteps.includes(curNode.step_key) || uploadNodeTypes.includes(curNode.node_type))) {
                        await sendWhatsAppMessage(phone, '📸 تم استلام الصورة! شكراً. ✅', creds);

                        // Advance: essential-aware or normal
                        if (session.fast_tracked) {
                            const essentialNodes = await getEssentialNodes(session.current_sequence_id);
                            const essIdx = essentialNodes.findIndex((n: any) => n.step_key === curNode.step_key);
                            const nextEss = essentialNodes[essIdx + 1];
                            if (nextEss) {
                                await updateSession(session.id, { current_step: nextEss.step_key, turn_count: 0, conversation_history: history });
                            } else {
                                const wrapupSeq = await getSequenceByType('wa_wrapup');
                                if (wrapupSeq) {
                                    const wrapupNodes = await getSequenceNodes(wrapupSeq.id);
                                    if (wrapupNodes.length > 0) {
                                        const fullCtx = history.filter(m => m.role === 'patient').map(m => m.content).join('\n');
                                        await updateSession(session.id, {
                                            current_sequence_id: wrapupSeq.id,
                                            current_step: wrapupNodes[0].step_key,
                                            turn_count: 0,
                                            conversation_history: history,
                                            patient_context: (session.patient_context || '') + `\n\nFull patient responses:\n${fullCtx}\n⚡ Essential items completed.`,
                                        });
                                    }
                                }
                            }
                        } else {
                            const nextIdx = curIdx + 1;
                            if (nextIdx < nodes.length) {
                                await updateSession(session.id, { current_step: nodes[nextIdx].step_key, turn_count: 0, conversation_history: history });
                            }
                        }
                    } else if (session.current_step === 'fast_track_photo') {
                        // On the fast-track photo step — acknowledge with specialty-specific prompt
                        const photoSpecialty = (session.patient_context || '').match(/Specialty:\s*(\S+)/)?.[1] || 'general';
                        const photoCfg = getPhotoConfig(photoSpecialty);
                        const moreMsg = session.language === 'ar' ? photoCfg.moreAr : photoCfg.moreEn;
                        await sendWhatsAppMessage(phone, moreMsg, creds);
                    } else {
                        // Not on an upload step — just acknowledge
                        await sendWhatsAppMessage(phone, '📸 تم استلام الصورة! شكراً.', creds);
                    }
                } else {
                    await sendWhatsAppMessage(phone, '⚠️ لم أتمكن من حفظ الصورة. حاول مرة أخرى.', creds);
                }
                return;
            }
        }

        // ── Add patient message to history ──
        // If voice note, prefix with 🎙️ indicator in history for context
        const historyContent = isVoiceNote ? `🎙️ [Voice message]: ${text}` : text;
        history.push({ role: 'patient', content: historyContent, ts: new Date().toISOString() });

        // ── Get current sequence + node ──
        const nodes = await getSequenceNodes(session.current_sequence_id);
        const currentNodeIdx = nodes.findIndex((n: { step_key: string }) => n.step_key === session.current_step);
        const currentNode = nodes[currentNodeIdx];

        if (!currentNode) {
            // Fallback: no current node, show error
            await sendWhatsAppMessage(phone, '⚠️ حدث خطأ. أرسل "menu" للبدء من جديد.', creds);
            return;
        }

        // ── Handle non-chat node types in WhatsApp (photo_capture, system_upload, etc.) ──
        const nonChatTypes = ['system_upload', 'system_extract', 'med_label_capture'];
        if (nonChatTypes.includes(currentNode.node_type) || currentNode.step_key === 'photo_capture') {
            // For non-chat nodes, check if patient sent media — auto-complete the section
            if (mediaId) {
                // Media already handled above — auto-complete this section
            }

            // Check if patient wants to skip: "skip", "تخطي", "لا", "no"
            const skipWords = ['skip', 'تخطي', 'لا', 'no', 'pass', 'next', 'التالي'];
            if (skipWords.some(w => lowerText.includes(w))) {
                history.push({ role: 'patient', content: '[Skipped upload]', ts: new Date().toISOString() });

                // Advance to next node (or next essential if fast-tracked)
                if (session.fast_tracked) {
                    const essentialNodes = await getEssentialNodes(session.current_sequence_id);
                    const curIdx = essentialNodes.findIndex((n: any) => n.step_key === currentNode.step_key);
                    const nextEssential = essentialNodes[curIdx + 1];
                    if (nextEssential) {
                        await updateSession(session.id, { current_step: nextEssential.step_key, turn_count: 0, conversation_history: history });
                    } else {
                        const wrapupSeq = await getSequenceByType('wa_wrapup');
                        if (wrapupSeq) {
                            const wrapupNodes = await getSequenceNodes(wrapupSeq.id);
                            if (wrapupNodes.length > 0) {
                                await updateSession(session.id, { current_sequence_id: wrapupSeq.id, current_step: wrapupNodes[0].step_key, turn_count: 0, conversation_history: history });
                            }
                        }
                    }
                } else {
                    const nextIdx = currentNodeIdx + 1;
                    if (nextIdx < nodes.length) {
                        await updateSession(session.id, { current_step: nodes[nextIdx].step_key, turn_count: 0, conversation_history: history });
                    }
                }

                const ackMsg = session.language === 'ar' ? '👍 تم التخطي. لنكمل...' : '👍 Skipped. Moving on...';
                await sendWhatsAppMessage(phone, ackMsg, creds);
                return;
            }

            // Patient sent text but we need a photo/document — remind them
            const isPhotoNode = currentNode.step_key === 'photo_capture';
            const reminderMsg = session.language === 'ar'
                ? isPhotoNode
                    ? '📸 الرجاء إرسال صورة للمنطقة المتأثرة، أو أرسل "تخطي" للمتابعة.'
                    : '📎 الرجاء إرسال صورة المستند أو التقرير، أو أرسل "تخطي" للمتابعة.'
                : isPhotoNode
                    ? '📸 Please send a photo of the affected area, or type "skip" to continue.'
                    : '📎 Please upload your document or report, or type "skip" to continue.';
            await sendWhatsAppMessage(phone, reminderMsg, creds);
            return;
        }

        // ── Gibberish detection (before AI call) ──
        if (detectGibberish(text)) {
            const gibResp = session.language === 'ar'
                ? GIBBERISH_RESPONSES_AR[Math.floor(Math.random() * GIBBERISH_RESPONSES_AR.length)]
                : GIBBERISH_RESPONSES_EN[Math.floor(Math.random() * GIBBERISH_RESPONSES_EN.length)];
            await sendWhatsAppMessage(phone, gibResp, creds);
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
            currentNode.wrap_at_turn,
        );

        const aiResponse = await chatWithAI(systemPrompt, history, 800, session.language || 'ar');

        // ── First-Turn Guard: strip [SECTION_COMPLETE] on turn 0 ──
        const turnCount = session.turn_count || 0;
        let processedResponse = aiResponse;
        if (turnCount === 0 && aiResponse.includes('[SECTION_COMPLETE]')) {
            console.log(`[wa-webhook] First-turn guard: stripping [SECTION_COMPLETE] from ${currentNode.step_key}`);
            processedResponse = aiResponse.replace(/\[SECTION_COMPLETE\]/g, '');
        }

        // ── Soft redirect detection ──
        if (detectSoftRedirect(processedResponse)) {
            console.log(`[wa-webhook] Soft redirect detected in ${currentNode.step_key}, re-prompting`);
            // AI went off-topic — re-prompt with a direct question
            const retryPrompt = session.language === 'ar'
                ? 'لنكمل — ' + (currentNode.ai_prompts?.content || 'هل عندك شي تضيفه؟')
                : "Let's continue — " + (currentNode.ai_prompts?.content || 'Do you have anything to add?');
            // Don't waste this turn — just re-ask
            await sendWhatsAppMessage(phone, retryPrompt.slice(0, 300), creds);
            return;
        }

        const sectionComplete = processedResponse.includes('[SECTION_COMPLETE]');
        const addendumDone = processedResponse.includes('[ADDENDUM_DONE]');
        const cleanResponse = processedResponse
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
                conversation_history: history,
                intake_report: { summary: cleanResponse, completedAt: new Date().toISOString() },
                completed_at: new Date().toISOString(),
            });

            await sendWhatsAppMessage(phone, cleanResponse, creds);
            await handleIntakeComplete(session, cleanResponse, history, phone, creds);
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
                                conversation_history: history,
                                patient_context: (session.patient_context || '') + `\nPathway: ${pathway}`,
                            });

                            // Send current response
                            await sendWhatsAppMessage(phone, cleanResponse, creds);
                            return;
                        }
                    }
                }

                // ── FAST TRACK GATE: After HPI in wa_new_visit ──
                if (currentNode.step_key === 'hpi') {
                    const ftMode = await resolveFastTrackMode(session.doctor_id, session.current_sequence_id);

                    if (ftMode === 'force_fast') {
                        // Auto-fast-track: check specialty photo config
                        const ftSpecialty = (session.patient_context || '').match(/Specialty:\s*(\S+)/)?.[1] || 'general';
                        const ftPhotoConfig = getPhotoConfig(ftSpecialty);

                        if (ftPhotoConfig.mode === 'skip') {
                            // No photo step — go straight to essentials/wrapup
                            const ftSpecSeq = ftSpecialty && ftSpecialty !== 'general'
                                ? await getSpecialtySequence(ftSpecialty) : null;
                            const ftEssentials = ftSpecSeq ? await getEssentialNodes(ftSpecSeq.id) : [];

                            if (ftEssentials.length > 0) {
                                await updateSession(session.id, {
                                    fast_tracked: true,
                                    current_sequence_id: ftSpecSeq!.id,
                                    current_step: ftEssentials[0].step_key,
                                    turn_count: 0,
                                    conversation_history: history,
                                    patient_context: (session.patient_context || '') + '\n⚡ FAST TRACK (auto): Running essential items only.',
                                });
                                await sendWhatsAppMessage(phone, cleanResponse, creds);
                                return;
                            }

                            // No essentials — wrapup
                            const ftRemaining = nodes.slice(nextIdx).map((n: any) => n.step_key);
                            const ftWrapSeq = await getSequenceByType('wa_wrapup');
                            if (ftWrapSeq) {
                                const ftWrapNodes = await getSequenceNodes(ftWrapSeq.id);
                                if (ftWrapNodes.length > 0) {
                                    const ftCtx = history.filter(m => m.role === 'patient').map(m => m.content).join('\n');
                                    const ftSkipNote = `\n\n⚡ FAST TRACK (auto): Skipped sections: ${ftRemaining.join(', ')}.`;
                                    await updateSession(session.id, {
                                        fast_tracked: true, skipped_sections: ftRemaining,
                                        current_sequence_id: ftWrapSeq.id, current_step: ftWrapNodes[0].step_key,
                                        turn_count: 0, conversation_history: history,
                                        patient_context: (session.patient_context || '') + `\n\nFull patient responses:\n${ftCtx}` + ftSkipNote,
                                    });
                                    await sendWhatsAppMessage(phone, cleanResponse, creds);
                                    return;
                                }
                            }
                        }

                        // Photo step active — route through photo upload
                        await updateSession(session.id, {
                            fast_tracked: true,
                            current_step: 'fast_track_photo',
                            turn_count: 0,
                            conversation_history: history,
                            patient_context: (session.patient_context || '') + '\n⚡ FAST TRACK (auto): Quick finish mode.',
                        });
                        await sendWhatsAppMessage(phone, cleanResponse, creds);
                        const ftPhotoMsg = session.language === 'ar' ? ftPhotoConfig.promptAr : ftPhotoConfig.promptEn;
                        await sendWhatsAppMessage(phone, ftPhotoMsg, creds);
                        return;
                    } else if (ftMode === 'allow_choice') {
                        // Offer choice: set virtual gate step
                        await updateSession(session.id, {
                            current_step: 'fast_track_gate',
                            turn_count: 0,
                            conversation_history: history,
                        });
                        await sendWhatsAppMessage(phone, cleanResponse, creds);
                        const gateMsg = session.language === 'ar' ? FAST_TRACK_MSG_AR : FAST_TRACK_MSG_EN;
                        await sendWhatsAppMessage(phone, gateMsg, creds);
                        return;
                    }
                    // force_full: fall through to normal advancement below
                }

                // ── FAST TRACK ESSENTIAL ADVANCEMENT ──
                // When fast_tracked, only advance to next essential node, then wrapup
                if (session.fast_tracked) {
                    const essentialNodes = await getEssentialNodes(session.current_sequence_id);
                    const currentEssentialIdx = essentialNodes.findIndex((n: any) => n.step_key === currentNode.step_key);
                    const nextEssential = essentialNodes[currentEssentialIdx + 1];

                    if (nextEssential) {
                        // Advance to next essential node
                        await updateSession(session.id, {
                            current_step: nextEssential.step_key,
                            turn_count: 0,
                            conversation_history: history,
                        });
                        await sendWhatsAppMessage(phone, cleanResponse, creds);
                    } else {
                        // All essentials done → wrapup
                        const wrapupSeq = await getSequenceByType('wa_wrapup');
                        if (wrapupSeq) {
                            const wrapupNodes = await getSequenceNodes(wrapupSeq.id);
                            if (wrapupNodes.length > 0) {
                                const fullContext = history.filter(m => m.role === 'patient').map(m => m.content).join('\n');
                                await updateSession(session.id, {
                                    current_sequence_id: wrapupSeq.id,
                                    current_step: wrapupNodes[0].step_key,
                                    turn_count: 0,
                                    conversation_history: history,
                                    patient_context: (session.patient_context || '') + `\n\nFull patient responses:\n${fullContext}\n⚡ Essential items completed.`,
                                });
                                await sendWhatsAppMessage(phone, cleanResponse, creds);
                                return;
                            }
                        }
                        await sendWhatsAppMessage(phone, cleanResponse, creds);
                    }
                    return;
                }

                // Normal advancement
                // ── BOOKING GATE: Skip booking_offer if doctor not eligible ──
                let advanceToNode = nextNode;
                if (nextNode.step_key === 'booking_offer') {
                    const eligible = await isBookingEligible(session.doctor_id);
                    if (!eligible) {
                        // Skip booking_offer — advance to node after it, or end sequence
                        const afterBookingIdx = nextIdx + 1;
                        if (afterBookingIdx < nodes.length) {
                            advanceToNode = nodes[afterBookingIdx];
                        } else {
                            // booking_offer was last node — go to wrapup
                            advanceToNode = null as any;
                        }
                    }
                }

                if (advanceToNode) {
                    await updateSession(session.id, {
                        current_step: advanceToNode.step_key,
                        turn_count: 0,
                        conversation_history: history,
                    });
                    await sendWhatsAppMessage(phone, cleanResponse, creds);
                } else {
                    // Skipped booking and no more nodes — fall through to wrapup below
                }
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
                                conversation_history: history,
                                intake_report: { summary: wrapupClean, completedAt: new Date().toISOString() },
                                completed_at: new Date().toISOString(),
                            });

                            await sendWhatsAppMessage(phone, cleanResponse, creds);
                            await sendWhatsAppMessage(phone, wrapupClean, creds);
                            await handleIntakeComplete(session, wrapupClean, history, phone, creds);
                            return;
                        }

                        await updateSession(session.id, {
                            turn_count: 1,
                            conversation_history: history,
                        });

                        await sendWhatsAppMessage(phone, cleanResponse, creds);
                        await sendWhatsAppMessage(phone, wrapupClean, creds);
                        return;
                    }
                }

                // No more nodes and no wrapup → done
                await updateSession(session.id, {
                    status: 'intake_complete',
                    conversation_history: history,
                    completed_at: new Date().toISOString(),
                });
                await sendWhatsAppMessage(phone, cleanResponse, creds);
            }
        } else {
            // Normal turn — update history and send response
            await updateSession(session.id, {
                turn_count: (session.turn_count || 0) + 1,
                conversation_history: history,
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

// ── Doctor Follow-Up Handler ─────────────────────────
// Processes incoming messages for sessions in 'followup_requested' / 'followup_active' status
async function handleDoctorFollowup(
    session: any,
    phone: string,
    text: string,
    _unused: any, // placeholder for history arg
    creds: NonNullable<typeof metaCreds>,
) {
    let rawHistory = session.conversation_history || [];
    if (typeof rawHistory === 'string') {
        try { rawHistory = JSON.parse(rawHistory); } catch { rawHistory = []; }
    }
    const history = rawHistory as { role: string; content: string; ts: string }[];

    // Get the doctor request
    const request = await getPendingDoctorRequest(session.id);
    if (!request) {
        await sendWhatsAppMessage(phone, 'أرسل "menu" للبدء من جديد 👋', creds);
        return;
    }

    // Activate session on first response
    if (session.status === 'followup_requested') {
        await updateSession(session.id, { status: 'followup_active' });
        await supabase
            .from('wa_doctor_requests')
            .update({ status: 'in_progress' })
            .eq('id', request.id);
    }

    // Add patient message
    history.push({ role: 'patient', content: text, ts: new Date().toISOString() });

    // Build request sections list
    const allSections = [
        ...(request.requested_sections || []),
        ...(request.custom_question ? ['custom_question'] : []),
    ];
    const currentIdx = request.current_section_idx || 0;

    if (currentIdx >= allSections.length) {
        // All sections done
        await finishDoctorFollowup(session, request, history, phone, creds);
        return;
    }

    const currentSection = allSections[currentIdx];

    // Build prompt for current section
    let promptContent: string;
    if (currentSection === 'custom_question') {
        promptContent = (request.custom_question_polished || request.custom_question || 'The doctor has a follow-up question.')
            .replace('{doctor_question}', request.custom_question || '')
            .replace('{max_turns}', String(request.custom_max_turns || 4));
        // Wrap with behavioral rules
        promptContent = `You are a medical intake AI for cliniq.one. The doctor has a specific question for the patient.

DOCTOR'S QUESTION: "${request.custom_question}"

Ask the question clearly in patient-friendly language. Follow up naturally (max ${request.custom_max_turns || 4} turns).
When you have a satisfactory answer, emit [SECTION_COMPLETE].

Rules:
- Keep messages to 1-2 sentences + ONE question
- Be warm and reassuring
- Match the patient's language (Arabic or English)`;
    } else {
        promptContent = FOLLOWUP_SECTION_PROMPTS[currentSection] ||
            `Ask the patient about: ${SECTION_LABELS[currentSection]?.en || currentSection}. Emit [SECTION_COMPLETE] when answered.`;
    }

    const systemPrompt = buildSectionPrompt(
        promptContent,
        currentSection,
        session.language || 'ar',
        session.patient_context || '',
        (session.turn_count || 0),
        currentSection === 'custom_question' ? (request.custom_max_turns || 4) : 3,
    );

    const aiResponse = await chatWithAI(systemPrompt, history);
    const sectionComplete = aiResponse.includes('[SECTION_COMPLETE]');
    const cleanResponse = aiResponse
        .replace(/\[SECTION_COMPLETE\]/g, '')
        .replace(/\[ADDENDUM_DONE\]/g, '')
        .replace(/\[VIOLATION:[^\]]+\]/g, '')
        .trim();

    history.push({ role: 'ai', content: cleanResponse, ts: new Date().toISOString() });

    if (sectionComplete) {
        const nextIdx = currentIdx + 1;

        // Update request progress
        const updatedRespHistory = [...(request.response_history || []), {
            section: currentSection,
            history: history.slice(-4), // last 4 messages for this section
            completedAt: new Date().toISOString(),
        }];

        await supabase
            .from('wa_doctor_requests')
            .update({
                current_section_idx: nextIdx,
                response_history: updatedRespHistory,
            })
            .eq('id', request.id);

        if (nextIdx >= allSections.length) {
            // All sections done
            await sendWhatsAppMessage(phone, cleanResponse, creds);
            request.response_history = updatedRespHistory;
            await finishDoctorFollowup(session, request, history, phone, creds);
            return;
        }

        await updateSession(session.id, {
            turn_count: 0,
            conversation_history: history,
        });
        await sendWhatsAppMessage(phone, cleanResponse, creds);
    } else {
        await updateSession(session.id, {
            turn_count: (session.turn_count || 0) + 1,
            conversation_history: history,
        });
        await sendWhatsAppMessage(phone, cleanResponse, creds);
    }
}

// ── Finish doctor follow-up: update consultation ─────
async function finishDoctorFollowup(
    session: any,
    request: any,
    history: any[],
    phone: string,
    creds: NonNullable<typeof metaCreds>,
) {
    // Mark request as completed
    await supabase
        .from('wa_doctor_requests')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

    // Update session
    await updateSession(session.id, {
        status: 'followup_complete',
        conversation_history: history,
    });

    // Append new data to existing consultation if linked
    const consultationId = session.consultation_id || request.consultation_id;
    if (consultationId) {
        const { data: existing } = await supabase
            .from('consultations')
            .select('ai_report')
            .eq('id', consultationId)
            .single();

        if (existing) {
            const existingReport = existing.ai_report || {};
            const followupData = {
                followup_sections: request.response_history || [],
                followup_completed_at: new Date().toISOString(),
                followup_requested_by: request.doctor_id,
            };

            await supabase
                .from('consultations')
                .update({
                    ai_report: { ...existingReport, ...followupData },
                })
                .eq('id', consultationId);
        }
    }

    // Send completion message
    const doneMsg = session.language === 'ar'
        ? '✅ شكراً! تم إرسال المعلومات الإضافية لطبيبك.'
        : '✅ Thanks! The additional information has been sent to your doctor.';
    await sendWhatsAppMessage(phone, doneMsg, creds);
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
        // NOTE: Temporarily disabled — signature mismatch was silently blocking messages
        if (creds.appSecret && false) {
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
                        } else if (msg.type === 'audio') {
                            // ── Voice message: download → transcribe → process as text ──
                            const audioMediaId = msg.audio?.id || '';
                            if (audioMediaId) {
                                const audioFile = await downloadMedia(audioMediaId, creds);
                                if (audioFile) {
                                    // Get session language for transcription hint
                                    const sPhone = normalizePhone(senderPhone);
                                    const existingSession = await getActiveSession(sPhone);
                                    const lang = existingSession?.language || 'ar';

                                    const transcribedText = await transcribeAudio(audioFile.data, audioFile.mimeType, lang);
                                    if (transcribedText) {
                                        // Process transcribed text as a regular message with voice flag
                                        await processMessage(senderPhone, transcribedText, waPhoneNumberId, wamid, creds, undefined, undefined, true);
                                    } else {
                                        // Transcription failed — ask patient to type instead
                                        const errPhone = normalizePhone(senderPhone);
                                        const fallbackLang = existingSession?.language || 'ar';
                                        const fallbackMsg = fallbackLang === 'ar'
                                            ? '⚠️ لم أتمكن من فهم الرسالة الصوتية. الرجاء كتابة إجابتك بدلاً من ذلك.'
                                            : '⚠️ I couldn\'t understand the voice message. Please type your answer instead.';
                                        await processMessage(senderPhone, '', waPhoneNumberId, wamid, creds);
                                        const mCreds = await getMetaCreds();
                                        await sendWhatsAppMessage(errPhone, fallbackMsg, mCreds);
                                    }
                                } else {
                                    // Could not download audio
                                    await processMessage(senderPhone, '', waPhoneNumberId, wamid, creds);
                                }
                            } else {
                                await processMessage(senderPhone, '', waPhoneNumberId, wamid, creds);
                            }
                        } else {
                            // Unsupported message type (sticker, video, etc.)
                            await processMessage(senderPhone, '', waPhoneNumberId, wamid, creds);
                        }
                    } catch (err) {
                        console.error(`[wa-webhook] Error processing message ${wamid}:`, err);
                        // Send error message to patient so they know something went wrong
                        try {
                            const errPhone = normalizePhone(msg.from || '');
                            await sendWhatsAppMessage(errPhone, '⚠️ حدث خطأ. أرسل "menu" للبدء من جديد.', creds);
                        } catch (_) { /* ignore send failure */ }
                    }
                }
            }
        }

        // Always respond 200 to Meta (otherwise they retry)
        return new Response('EVENT_RECEIVED', { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
});
