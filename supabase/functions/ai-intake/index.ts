// ─────────────────────────────────────────────────
// Supabase Edge Function: ai-intake
// Handles all AI operations for the medical intake flow
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Defaults (env fallbacks) ────────────────────
const ENV_OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.3;
const MAX_CONVERSATION_MESSAGES = 40; // Sliding window: keep last N messages
const MAX_MESSAGE_LENGTH = 3000;      // Max chars per patient message

// ── Sections that don't use [SECTION_COMPLETE] ──
const NO_COMPLETE_SECTIONS = ['greeting', 'pathway', 'summary', 'photo_capture', 'med_label_capture', 'patient_addendum'];

// ── Behavioral suffix (appended to all interview section prompts) ──
const BEHAVIOR_SUFFIX = `

IMPORTANT behavioral rules:
- EVERY message you send MUST contain a question. Never send a message that is only a thank-you, acknowledgment, confirmation, or summary without a follow-up question.
- Do NOT say "Thank you for sharing", "Thank you for confirming", "Thank you for letting me know", or any gratitude/filler phrases. Go directly to your next question.
- Do NOT use concluding or farewell language like "That concludes...", "I have everything I need", or "Your intake is complete". You are NOT the one who decides when the interview ends.
- SINGLE QUESTION: Each message must contain exactly ONE question. Never ask multiple questions in one message — even if they seem related. Wait for the patient's answer before asking the next.
- SECTION COMPLETION: When you have enough information, append [SECTION_COMPLETE] at the end of your last response. Do NOT post a closing summary or thank-you — just add the tag silently after the patient's last answer is addressed. The system will automatically transition.
- PRIOR INFORMATION: If the patient context already contains information relevant to THIS section (e.g., allergies or medications mentioned earlier), do NOT skip this section. Instead, state precisely what you understood for THIS section only, then ask: "Would you like to confirm this, or is there anything you'd like to add?" Only emit [SECTION_COMPLETE] after the patient confirms or provides additional info.
- If the patient answers "no", "none", or "nothing" to an opening question, accept it and emit [SECTION_COMPLETE]. Do NOT ask a follow-up confirmation.
- Keep responses concise (1-2 sentences + your ONE question). Never repeat information the patient already provided.
- Accept short answers like "no", "yes", "ok", numbers, and brief phrases as valid responses.
- SKIP HANDLING: If the patient says "skip", "next", "pass", or "move on", IMMEDIATELY accept it and emit [SECTION_COMPLETE]. Do NOT repeat the question, guilt the patient, or add a disclaimer. The patient has the right to skip any section.
- You MUST ask at least ONE question before emitting [SECTION_COMPLETE]. Never complete a section without asking anything.`;

// ── Summary suffix (appended only to the summary section prompt) ──
const SUMMARY_SUFFIX = `

IMPORTANT summary rules:
- Provide ONLY an exhaustive, comprehensive recap of what the patient said during the interview, organized by section (Chief Complaint, HPI, Past Medical History, Allergies, Medications, Family History, Social History, Review of Systems).
- Do NOT include any treatment plan, recommendations, assessment, suggested workup, differential diagnosis, or follow-up suggestions.
- Do NOT add any clinical interpretation or medical opinion.
- Simply summarize the patient's own words and answers accurately and completely.
- Use clear, organized formatting with section headers.`;

// ── Concise suffix (appended to non-HPI interview sections to keep them short) ──
const CONCISE_SECTIONS_SUFFIX = `

EFFICIENCY RULES FOR THIS SECTION:
- Keep this section SHORT. Ask 1-2 questions maximum, not more.
- If the patient answers "no", "none", "nothing", "never", "nope", "n/a", or any clear negative to your opening question, accept it immediately and emit [SECTION_COMPLETE]. Do NOT ask a follow-up confirmation or rephrase.
- Do NOT break the section into multiple sub-topics. Consolidate into a single, comprehensive opening question.
- Example: Instead of asking about smoking, then alcohol, then exercise separately, ask: "Do you smoke, drink alcohol, or exercise regularly?"
- If the patient already provided relevant information earlier in the conversation, briefly confirm it and emit [SECTION_COMPLETE].
- Remember: the doctor will follow up on anything unclear. Your job is screening, not exhaustive questioning.`;

// ── Addendum suffix (appended only to the patient_addendum section) ──
const ADDENDUM_SUFFIX = `

IMPORTANT addendum rules:
- You are presenting the patient's intake summary for their final review.
- Your FIRST message must present a CLINICAL SUMMARY in paragraph format, organized by these headings:
  **CHIEF COMPLAINT:** One-line description of why the patient is here.
  **HISTORY OF PRESENT ILLNESS (HPI):** Narrative of symptoms — onset, duration, character, location, severity, aggravating/alleviating factors, associated symptoms. Use what the patient actually reported.
  **PAST MEDICAL HISTORY:** Chronic conditions, surgeries, hospitalizations. Write "None reported" if the patient denied.
  **CURRENT MEDICATIONS:** List any medications. Write "None" if denied.
  **ALLERGIES:** List any allergies. Write "No known allergies" if denied.
  **FAMILY HISTORY:** Relevant family conditions. Write "Non-contributory" if denied.
  **SOCIAL HISTORY:** Occupation, smoking, alcohol, exercise. Include what was discussed.
  **GYNECOLOGICAL/OBSTETRIC HISTORY:** Include if assessed. Omit entirely if not assessed.
  **REVIEW OF SYSTEMS:** Brief mention of positive and pertinent negative findings.
  **CLINICAL IMPRESSION:** 1-2 sentence clinical impression based on the data collected.
  **RECOMMENDED SPECIALTY:** The specialty this will be routed to.
  **PRIORITY LEVEL:** Routine / Urgent / Emergency.
- After the summary, ask: "Please review the above summary. Is there anything you'd like to add or clarify before we finalize?"
- WHEN PATIENT ADDS NEW INFO: Briefly acknowledge what they added (e.g., "Noted, I'll add the scarring to your report."). Do NOT emit [ADDENDUM_DONE]. The system will regenerate the summary automatically.
- WHEN PATIENT CONFIRMS (e.g. "looks good", "nothing else", "done", "that's all", "no", "nope"): Respond with a brief confirmation and append [ADDENDUM_DONE] at the end.
- REJECT contradictions: If the patient tries to change their chief complaint or rewrite the report, politely say: "I've noted your concern — you can discuss this further with your doctor during the consultation."
- Keep all responses very short (1-2 sentences max).
- Do NOT ask more than one follow-up question.
- NEVER emit [SECTION_COMPLETE]. Only use [ADDENDUM_DONE].`;

// ── Soft Redirect Detection ──────────────────────
const REDIRECT_PHRASES = [
    "i'm here to help with your medical intake",
    "i'm here to assist with your medical intake",
    "let's focus on your health",
    "let's continue with your health",
    "let's continue focusing on your health",
    "please let me know what health concern",
    "please share the health concern",
    "what health concern would you like to discuss",
    "what health concern or reason for visit",
    "what health issue would you like to discuss",
    "could you please tell me what health concern",
    "could you please share what health concern",
    "let me know what health concern",
    // Arabic redirect phrases
    "\u0623\u0646\u0627 \u0647\u0646\u0627 \u0644\u0645\u0633\u0627\u0639\u062f\u062a\u0643 \u0641\u064a \u0627\u0644\u0645\u0642\u0627\u0628\u0644\u0629 \u0627\u0644\u0637\u0628\u064a\u0629",
    "\u062f\u0639\u0646\u0627 \u0646\u0631\u0643\u0632 \u0639\u0644\u0649 \u0635\u062d\u062a\u0643",
    "\u064a\u0631\u062c\u0649 \u0625\u062e\u0628\u0627\u0631\u064a \u0628\u0627\u0644\u0645\u0634\u0643\u0644\u0629 \u0627\u0644\u0635\u062d\u064a\u0629",
    "\u0645\u0627 \u0627\u0644\u0645\u0634\u0643\u0644\u0629 \u0627\u0644\u0635\u062d\u064a\u0629 \u0627\u0644\u062a\u064a \u062a\u0648\u062f \u0645\u0646\u0627\u0642\u0634\u062a\u0647\u0627",
    "\u0647\u0644 \u064a\u0645\u0643\u0646\u0643 \u0625\u062e\u0628\u0627\u0631\u064a \u0628\u0627\u0644\u0633\u0628\u0628 \u0627\u0644\u0630\u064a \u0623\u062a\u0649 \u0628\u0643",
    "\u0645\u0627 \u0627\u0644\u0630\u064a \u062a\u0648\u062f \u0645\u0646\u0627\u0642\u0634\u062a\u0647 \u0627\u0644\u064a\u0648\u0645",
    "\u0623\u0646\u0627 \u0647\u0646\u0627 \u0644\u0644\u0645\u0633\u0627\u0639\u062f\u0629 \u0641\u064a \u0627\u0644\u0627\u0633\u062a\u0634\u0627\u0631\u0629 \u0627\u0644\u0637\u0628\u064a\u0629",
    "\u062f\u0639\u0646\u0627 \u0646\u0648\u0627\u0635\u0644 \u0627\u0644\u062a\u0631\u0643\u064a\u0632 \u0639\u0644\u0649 \u0635\u062d\u062a\u0643",
];

function detectSoftRedirect(aiResponse: string): string | null {
    const lower = aiResponse.toLowerCase();
    const isRedirect = REDIRECT_PHRASES.some(phrase => lower.includes(phrase));
    return isRedirect ? 'off_topic' : null;
}

// ── CORS: restrict to known origins ──────────────────────
const ALLOWED_ORIGINS = [
    'http://localhost:3001',    // admin panel dev
    'http://localhost:3002',    // patient app dev (vite)
    'http://localhost:3003',    // doctor app dev
    'http://localhost:5173',    // vite dev
    'http://localhost:8081',    // expo dev
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8081',
    'capacitor://localhost',    // iOS Capacitor
    'http://localhost',         // Android Capacitor (http scheme)
    'https://localhost',        // Android Capacitor (https scheme)
];

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('origin') || '';
    // Allow null origin for mobile apps (Capacitor sends no origin)
    const isAllowed = !origin || ALLOWED_ORIGINS.includes(origin);
    return {
        'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
        'Vary': 'Origin',
    };
}

// ── Singleton Supabase admin client ─────────────
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ── Auth Verification ───────────────────────────
// Supports user JWT tokens, admin service-role key, and admin user role check
async function verifyAuth(req: Request): Promise<{ userId: string; isAdmin?: boolean } | null> {
    // Admin bypass via service-role key header
    const adminKey = req.headers.get('x-admin-key');
    console.log('[verifyAuth] x-admin-key present:', !!adminKey, 'serviceKey present:', !!supabaseServiceKey, 'match:', adminKey === supabaseServiceKey);
    if (adminKey && adminKey === supabaseServiceKey) {
        return { userId: 'admin', isAdmin: true };
    }
    // Also accept x-admin-key as a service_role JWT
    if (adminKey && isServiceRoleJwt(adminKey)) {
        return { userId: 'admin', isAdmin: true };
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) { console.log('[verifyAuth] no authorization header'); return null; }

    const token = authHeader.replace('Bearer ', '');
    console.log('[verifyAuth] token length:', token.length, 'serviceKey length:', supabaseServiceKey.length, 'bearer match:', token === supabaseServiceKey);

    // Admin bypass: service-role key passed as Bearer token
    if (token === supabaseServiceKey) {
        return { userId: 'admin', isAdmin: true };
    }
    // Admin bypass: service-role JWT format
    if (isServiceRoleJwt(token)) {
        return { userId: 'admin', isAdmin: true };
    }

    try {
        // Use admin client to verify user token
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        console.log('[verifyAuth] getUser result:', { userId: user?.id, error: error?.message });
        if (error || !user) return null;

        // Check if user is admin/superadmin — grant isAdmin flag
        try {
            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();
            if (userData?.role === 'admin' || userData?.role === 'superadmin') {
                return { userId: user.id, isAdmin: true };
            }
        } catch { /* not admin, continue as regular user */ }

        return { userId: user.id };
    } catch (e) {
        console.log('[verifyAuth] getUser exception:', e);
        return null;
    }
}

// Helper: check if a token is a service-role JWT
function isServiceRoleJwt(token: string): boolean {
    try {
        const payloadB64 = token.split('.')[1];
        if (!payloadB64) return false;
        const payload = JSON.parse(atob(payloadB64));
        const projectRef = (supabaseUrl || '').match(/\/\/([^.]+)/)?.[1] || '';
        return payload.role === 'service_role' && payload.ref === projectRef;
    } catch { return false; }
}


// ── Config (reads from platform_settings) ───────
async function getConfig(): Promise<{ apiKey: string; model: string; temperature: number }> {
    try {
        const { data: rows } = await supabaseAdmin
            .from('platform_settings')
            .select('key, value')
            .in('key', ['openai_api_key', 'openai_model', 'openai_temperature']);

        const settings: Record<string, string> = {};
        for (const row of rows || []) {
            settings[row.key] = row.value;
        }

        return {
            apiKey: settings['openai_api_key'] || ENV_OPENAI_KEY,
            model: settings['openai_model'] || DEFAULT_MODEL,
            temperature: settings['openai_temperature']
                ? parseFloat(settings['openai_temperature'])
                : DEFAULT_TEMPERATURE,
        };
    } catch {
        return { apiKey: ENV_OPENAI_KEY, model: DEFAULT_MODEL, temperature: DEFAULT_TEMPERATURE };
    }
}

// ── Get global guard prompt (auto-prepended to all sections) ──
const _guardCache: Record<string, { content: string | null; ts: number }> = {};
async function getGlobalGuard(mode: 'draft' | 'active' = 'active'): Promise<string | null> {
    const cacheKey = mode;
    const cached = _guardCache[cacheKey];
    // Cache for 60s to avoid repeated DB queries
    if (cached && Date.now() - cached.ts < 60_000) return cached.content;
    try {
        const { data } = await supabaseAdmin
            .from('ai_prompts')
            .select('content')
            .eq('prompt_type', 'global_guard')
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1);

        const content = data?.[0]?.content ?? null;
        _guardCache[cacheKey] = { content, ts: Date.now() };
        return content;
    } catch {
        return null;
    }
}

// ── Get Arabic guard supplement (prepended only when language=ar) ──
async function getArabicGuard(): Promise<string | null> {
    const cached = _guardCache['arabic_guard'];
    if (cached && Date.now() - cached.ts < 60_000) return cached.content;
    try {
        const { data } = await supabaseAdmin
            .from('ai_prompts')
            .select('content')
            .eq('prompt_type', 'arabic_guard')
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1);
        const content = data?.[0]?.content ?? null;
        _guardCache['arabic_guard'] = { content, ts: Date.now() };
        return content;
    } catch {
        return null;
    }
}

// ── Get admin-configurable prompt by type (cached 60s) ──
// Used by verify-medication and analyze-drug-label actions
// so admins can modify the AI protocol from the dashboard.
const _promptTypeCache: Record<string, { content: string | null; ts: number }> = {};
async function getPromptByType(promptType: string): Promise<string | null> {
    const cached = _promptTypeCache[promptType];
    if (cached && Date.now() - cached.ts < 60_000) return cached.content;
    try {
        const { data } = await supabaseAdmin
            .from('ai_prompts')
            .select('content')
            .eq('prompt_type', promptType)
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1);

        const content = data?.[0]?.content ?? null;
        _promptTypeCache[promptType] = { content, ts: Date.now() };
        return content;
    } catch {
        return null;
    }
}

// ── Get prompt content by ID (respecting mode) ──
async function getPromptById(promptId: string, mode: 'draft' | 'active' = 'active'): Promise<{ content: string; version: number } | null> {
    try {
        const { data } = await supabaseAdmin
            .from('ai_prompts')
            .select('content, version')
            .eq('id', promptId)
            .single();
        if (!data) return null;
        return { content: data.content, version: data.version };
    } catch {
        return null;
    }
}

// ── Get chatbot version from platform_settings ──
async function getChatbotVersion(): Promise<string> {
    try {
        const { data } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'chatbot_version')
            .single();
        return data?.value ?? '0';
    } catch {
        return '0';
    }
}

// ── Allowed system prompt prefixes (prevent prompt injection) ──
const ALLOWED_PROMPT_PREFIXES = [
    'You are a medical intake AI',
    'You are a clinical',
    'You are a warm',
    'You are a friendly',
    'Continue the medical',
];

function sanitizeSystemPrompt(prompt: string): string {
    // If it starts with a known safe prefix, allow it
    const startsWithAllowed = ALLOWED_PROMPT_PREFIXES.some(p =>
        prompt.trim().toLowerCase().startsWith(p.toLowerCase())
    );
    if (startsWithAllowed) return prompt;

    // Otherwise, prepend a safety wrapper
    return `You are a medical intake AI assistant. Follow these additional instructions:\n${prompt}`;
}

// ── Safe JSON parse helper ──────────────────────
function safeJsonParse<T>(text: string, fallback: T): T {
    try {
        return JSON.parse(text) as T;
    } catch (err) {
        console.error('JSON parse error:', err, 'Raw text:', text.slice(0, 200));
        return fallback;
    }
}

// ── Truncate conversation history ───────────────
function truncateHistory(
    history: { role: string; content: string }[],
    maxMessages = MAX_CONVERSATION_MESSAGES,
): { role: string; content: string }[] {
    if (history.length <= maxMessages) return history;
    // Keep the first message (usually context) + last N-1 messages
    return [history[0], ...history.slice(-(maxMessages - 1))];
}

// ── Server-side gibberish detection (mirrored from admin tester) ──
const VALID_SHORT = new Set([
    'no', 'yes', 'ok', 'hi', 'ya', 'na', 'idk', 'lol', 'ugh', 'ah', 'oh',
    'none', 'nope', 'yep', 'sure', 'fine', 'good', 'bad', 'pain', 'ache',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    // Common Arabic transliterations
    'la', 'aiwa', 'naam', 'mafi',
    // Medical terms
    'pus', 'rash', 'itch', 'acne', 'cold', 'flu', 'cough', 'mild', 'severe',
    'daily', 'dayly', 'weekly', 'monthly', 'never', 'always', 'sometimes',
    'rarely', 'moderate', 'constant', 'normal', 'worse', 'better', 'same',
    // Flow / navigation
    'continue', 'next', 'done', 'stop', 'go', 'skip',
    // Acknowledgments
    'hello', 'hey', 'bye', 'thanks',
]);

// ── Valid Arabic words — bypass gibberish detection ──
const VALID_ARABIC = new Set([
    // Affirmatives
    'نعم', 'اي', 'أي', 'ايوا', 'آه', 'اه', 'صح', 'تمام', 'ماشي', 'أكيد', 'طبعاً',
    // Negatives
    'لا', 'لأ', 'أبداً', 'مافي', 'مو', 'مب',
    // Navigation
    'يلا', 'خلاص', 'بس', 'كفاية',
    // Common medical words
    'ألم', 'صداع', 'حرارة', 'سعال', 'دوخة', 'غثيان', 'تعب', 'إسهال', 'إمساك',
    'حكة', 'طفح', 'ورم', 'نزيف', 'ضغط', 'سكر', 'حساسية', 'التهاب',
    // Gulf dialect
    'وش', 'ليش', 'كيف', 'وين', 'متى', 'شلون', 'زين',
    // Egyptian dialect
    'ايه', 'ازاي', 'فين', 'ليه', 'كويس',
    // Levantine dialect
    'شو', 'كيفك', 'هلق', 'منيح', 'طيب',
    // Cultural expressions
    'الحمدلله', 'ماشاءالله', 'إنشاءالله', 'يارب',
    // Common fillers that are valid
    'ممكن', 'يمكن', 'كثير', 'قليل', 'دائماً', 'أحياناً', 'غلط',
]);

// ── Arabic text detection helper ──
// Returns true if ≥40% of alpha characters are Arabic (\u0600-\u06FF)
function isArabicText(text: string): boolean {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalAlpha = arabicChars + latinChars;
    if (totalAlpha === 0) return false;
    return arabicChars / totalAlpha >= 0.4;
}

function detectGibberish(text: string): { isGibberish: boolean; reason?: string } {
    const trimmed = text.trim();
    if (!trimmed) return { isGibberish: false };

    // Allow short valid responses
    if (VALID_SHORT.has(trimmed.toLowerCase())) return { isGibberish: false };

    // Strip spaces and check the alpha content
    const alphaOnly = trimmed.replace(/[^a-zA-Z\u0600-\u06FF]/g, ''); // keep Latin + Arabic
    if (alphaOnly.length < 3) return { isGibberish: false }; // too short to judge

    // ── Arabic text — dedicated Arabic gibberish pathway ──
    if (isArabicText(trimmed)) {
        // 0. Arabic whitelist — exact match on normalized Arabic text
        const arabicNorm = trimmed.replace(/[\s\u0610-\u065F\u0670\u06D6-\u06ED]/g, ''); // strip diacritics + spaces
        if (VALID_ARABIC.has(arabicNorm) || VALID_ARABIC.has(trimmed)) {
            return { isGibberish: false };
        }

        // 1. Repeated Arabic character runs (3+ of same letter — Arabic words rarely repeat >2)
        if (/([\u0600-\u06FF])\1{2,}/i.test(alphaOnly)) {
            return { isGibberish: true, reason: 'arabic_repeated_characters' };
        }

        // 2. Keyboard-adjacent Arabic patterns (common keyboard mashing)
        const arabicKeyboardRuns = /([قثصض])\1|([شسشس]){2,}|([قث]){2,}|([صض]){2,}/;
        if (arabicKeyboardRuns.test(trimmed) && trimmed.replace(/\s/g, '').length < 6) {
            return { isGibberish: true, reason: 'arabic_keyboard_pattern' };
        }

        // 3. All-diacritics (tashkeel only, no base letters)
        const baseletters = trimmed.replace(/[\s\u0610-\u065F\u0670\u06D6-\u06ED]/g, '');
        if (baseletters.length === 0 && trimmed.length > 0) {
            return { isGibberish: true, reason: 'diacritics_only' };
        }

        // 4. Single very long Arabic "word" with no spaces (>15 chars) — likely mashing
        const arWords = trimmed.split(/\s+/);
        if (arWords.length === 1 && alphaOnly.length > 15) {
            return { isGibberish: true, reason: 'arabic_single_long_word' };
        }

        // Arabic text passes — semantic gibberish is caught by AI (Layer 3)
        return { isGibberish: false };
    }

    // ── English-specific checks below ──

    // 1. Repeated character runs (e.g., "DDDDDESC", "AAAAAAA")
    if (/(.)\1{4,}/i.test(alphaOnly)) {
        return { isGibberish: true, reason: 'repeated_characters' };
    }

    // 2. Vowel ratio check — English text typically has ~35-45% vowels
    const vowels = (alphaOnly.match(/[aeiouAEIOU]/g) || []).length;
    const vowelRatio = vowels / alphaOnly.length;
    if (alphaOnly.length > 5 && vowelRatio < 0.15) {
        return { isGibberish: true, reason: 'low_vowel_ratio' };
    }

    // 3. Consecutive consonant clusters (>5 consonants in a row)
    if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(alphaOnly)) {
        return { isGibberish: true, reason: 'consonant_cluster' };
    }

    // 4. Random character pattern — no common bigrams
    const commonBigrams = ['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd', 'ti', 'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar', 'st', 'to', 'nt', 'ng', 'se', 'ha', 'as', 'ou', 'io', 'le', 've', 'co', 'me', 'de', 'hi', 'ri', 'ro', 'ic', 'ne', 'ea', 'ra', 'ce', 'li', 'ch', 'll', 'be', 'ma', 'si', 'om', 'ur'];
    const lower = alphaOnly.toLowerCase();
    if (alphaOnly.length > 6) {
        const hasBigram = commonBigrams.some(bg => lower.includes(bg));
        if (!hasBigram) {
            return { isGibberish: true, reason: 'no_common_bigrams' };
        }
    }

    // 5. Single long word with no spaces — likely keyboard mashing
    const words = trimmed.split(/\s+/);
    if (words.length === 1 && alphaOnly.length > 8) {
        const commonPatterns = /(?:ing|tion|ment|ness|able|ible|ical|ous|ive|ful|less|ent|ant|ence|ance|ist|ism|ize|ise|ory|ure|ity|ated|ting|ster|ght|ache|pain|burn|itch|rash|pill|drug|med|skin|head|back|knee|cold|cough|flu|sore|hurt|heal|sick|well|feel|take|need|help|want|persist|constant|occasion|sometime|differin|aspirin|ibuprofen|tylenol|acetaminoph|allerg|diabetes|asthma|prescrip|tretinoin|isotret|accutane|roaccutan|metformin|amoxi|cipro|azithro|omepra|losartan|atorva|lisinop|gabapentin|sertralin|fluoxetin|predniso|hydrocort|clindamycin|doxycyclin|cetirizin|loratadin|monteluk|levothyrox|insulin|warfarin|clopidogr|pantopra|esomepra|naproxen|meloxicam|cyclobenz|tramadol|oxycodon|morphin|fentanyl|amphetam|methylphen|modafin|melatonin|vitamin|supplement|paracetam|diclofenac|ketoprofen|mupirocin|benzoyl|salicyl|retinoic|azole|pril|statin|mycin|cycline|sartan|prazole|olol|dipine|formin|gliptin|glutide|flozin|mab|nib|tinib)/i;
        if (!commonPatterns.test(alphaOnly)) {
            return { isGibberish: true, reason: 'single_long_word' };
        }
    }

    return { isGibberish: false };
}

const GIBBERISH_RESPONSES = [
    "I didn't quite understand that. Could you please rephrase your answer so I can help you properly?",
    "It looks like your message may have had a typo. Could you please try again with a clear response?",
    "I want to make sure I capture your information accurately. Could you please provide a clear answer?",
];

const GIBBERISH_RESPONSES_AR = [
    "لم أتمكن من فهم ذلك. حاول مرة أخرى، أو اكتب جملة من كلمات قليلة.",
    "يبدو أن هناك خطأ في الرسالة. هل يمكنك إعادة الكتابة بوضوح؟",
    "أريد التأكد من تسجيل معلوماتك بدقة. هل يمكنك تقديم إجابة واضحة؟",
];

const GIBBERISH_ESCALATED_EN = "I've noticed several unclear messages. If you're having trouble, please try typing your response more carefully, or simply respond with 'yes', 'no', or a brief answer.";
const GIBBERISH_ESCALATED_AR = "لاحظت عدة رسائل غير واضحة. إذا كنت تواجه صعوبة، حاول الكتابة بشكل أوضح، أو ببساطة أجب بـ 'نعم' أو 'لا' أو إجابة مختصرة.";

// ── OpenAI call helper (structured JSON responses) ────
async function callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 1000,
): Promise<string> {
    const config = await getConfig();

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
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI error: ${res.status} ${err}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
}

// ── Chat with full conversation (sequence-driven) ──
async function chatWithConversation(
    systemPrompt: string,
    conversationHistory: { role: string; content: string }[],
    maxTokens = 1000,
): Promise<string> {
    const config = await getConfig();

    // Auto-prepend global guard
    const guard = await getGlobalGuard();
    const finalPrompt = guard
        ? `${guard}\n\n---\n\n${systemPrompt}`
        : systemPrompt;

    // Truncate history to prevent token overflow
    const trimmedHistory = truncateHistory(conversationHistory);

    const messages = [
        { role: 'system', content: finalPrompt },
        ...trimmedHistory.map((m) => ({
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

// ── Action Handlers ─────────────────────────────

async function analyzeConcern(concern: string, language: string) {
    const system = `You are a medical triage AI for cliniq.one. Analyze the patient's concern and determine:
1. Which specialty to route to (dermatology, family_medicine, psychiatry, orthopedics, pediatrics, or diet_nutrition)
2. The urgency level (routine, urgent, or emergency)
3. Key medical keywords extracted

AGGRESSIVE ROUTING — FAVOR SUBSPECIALTIES OVER FAMILY MEDICINE:
Route to a subspecialty even at moderate confidence (60%+). Only use family_medicine as a LAST RESORT when the complaint is genuinely multi-system or truly non-specific.

Priority routing rules (check in this order):
1. ORTHOPEDICS → joint pain, bone pain, muscle pain, back pain, neck pain, knee, shoulder, hip, ankle, wrist, elbow, spine, fracture, sprain, arthritis, osteoporosis, gout, tendon, ligament, cartilage, disc herniation, sciatica, sports injury, stiffness, swelling in joints, limited range of motion, numbness/tingling in extremities
2. DERMATOLOGY → skin, rash, acne, moles, eczema, psoriasis, hair loss, nail problems, itching, hives, blisters, warts, sunburn, cosmetic skin concerns, wound that won't heal, skin discoloration, allergic skin reaction
3. PSYCHIATRY → depression, anxiety, mood changes, sleep problems, insomnia, stress, panic attacks, ADHD, bipolar, psychosis, trauma/PTSD, self-harm, substance abuse, eating disorder (behavioral), OCD, phobias, grief, burnout
4. PEDIATRICS → child health, infant, toddler, baby, newborn, childhood illness, pediatric fever, growth concerns, development delays, vaccination, teething, colic, childhood rash, ear infection in children, school problems, bedwetting
5. DIET & NUTRITION → weight management, nutrition, diet plan, eating habits, obesity, underweight, meal planning, BMI, food intolerance, dietary supplement, malnutrition, metabolic diet, cholesterol diet, diabetes diet, food allergy management
6. FAMILY MEDICINE (LAST RESORT) → ONLY if the complaint spans multiple unrelated systems, is extremely vague ("I don't feel well"), or genuinely fits no subspecialty above. Examples: general checkup, multiple unrelated symptoms, fever without localizing signs, chronic disease management spanning multiple specialties
7. EMERGENCY → life-threatening symptoms (specialty = null)

IMPORTANT: Do NOT default to family_medicine. If ANY subspecialty above matches with even moderate confidence, route there.

Respond in JSON: { "specialty": string|null, "category": string, "urgency": "routine"|"urgent"|"emergency", "keywords": string[], "confidence": number, "reasoning": string }

Language: ${language}`;

    const result = await callOpenAI(system, `Patient concern: ${concern}`, 500);
    return safeJsonParse(result, {
        specialty: 'family_medicine',
        category: 'general',
        urgency: 'routine',
        keywords: [],
        confidence: 0,
        reasoning: 'Failed to parse AI response',
    });
}

async function generateQuestion(
    concern: string,
    previousAnswers: { question: string; answer: string }[],
    section: string,
    language: string,
) {
    const sectionDescriptions: Record<string, string> = {
        hpi: 'History of Present Illness - onset, duration, course, location, character, aggravating/relieving factors, associated symptoms',
        pmh: 'Past Medical History - chronic conditions, surgeries, previous issues, hospitalizations',
        medications: 'Current Medications - prescription, OTC, vitamins, supplements, herbal remedies',
        allergies: 'Allergies - drug allergies, food allergies, environmental allergies',
        family_history: 'Family History - similar conditions in family, genetic conditions',
        social_history: 'Social History - occupation, hobbies, exposures, smoking/alcohol',
        review_of_systems: 'Review of Systems - constitutional symptoms, system-by-system check',
        physical_exam: 'Physical Examination - self-reported observations, photo description for dermatology',
    };

    const prevContext = previousAnswers.length > 0
        ? `Previous Q&A:\n${previousAnswers.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}`
        : 'No previous questions yet.';

    const system = `You are a medical intake AI for cliniq.one. Generate ONE clear follow-up question for the patient.

Current section: ${section} — ${sectionDescriptions[section] || section}

Rules:
- Ask one clear question at a time
- Use patient-friendly language (no medical jargon)
- Consider all previous answers to avoid repetition
- Adapt to the concern (dermatology → skin characteristics; family medicine → systemic)
- If the question can be answered with options, provide them
- Language: ${language === 'ar' ? 'Arabic' : 'English'}

Respond in JSON: { "question": string, "options": string[]|null, "type": "multiple_choice"|"free_text"|"yes_no", "required": true, "helperText": string|null }`;

    const result = await callOpenAI(system, `Chief complaint: ${concern}\n\n${prevContext}`, 500);
    return safeJsonParse(result, {
        question: 'Could you provide more details about your symptoms?',
        options: null,
        type: 'free_text',
        required: true,
        helperText: null,
    });
}

async function checkSection(
    section: string,
    answersInSection: { question: string; answer: string }[],
    concern: string,
    language: string,
) {
    const sections = ['hpi', 'pmh', 'medications', 'allergies', 'family_history', 'social_history', 'review_of_systems', 'physical_exam'];
    const currentIdx = sections.indexOf(section);
    const nextSection = currentIdx < sections.length - 1 ? sections[currentIdx + 1] : 'done';

    const system = `You are a medical intake AI. Determine if enough questions have been asked for the "${section}" section.

Rules:
- Each section needs 2-4 meaningful questions minimum
- Move on if the patient has provided sufficient information
- Don't over-question — be efficient
- If answers are vague, you may continue the section with 1 more question

Respond in JSON: { "complete": boolean, "nextSection": "${nextSection}"|"${section}" }`;

    const prevContext = answersInSection.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n');

    const result = await callOpenAI(system, `Concern: ${concern}\n\nSection "${section}" Q&A so far:\n${prevContext}\n\nTotal answers in section: ${answersInSection.length}`, 200);
    return safeJsonParse(result, { complete: true, nextSection });
}

async function analyzeQA(
    qaHistory: { question: string; answer: string }[],
    patientInfo: Record<string, unknown>,
    language: string,
) {
    const system = `You are a clinical documentation AI for cliniq.one. Generate a comprehensive clinical summary from the patient interview.

Output JSON with these fields:
{
    "summary": "2-3 sentence overview",
    "keyFindings": ["bullet-pointed clinical observations"],
    "redFlags": ["concerning symptoms, empty if none"],
    "hpi": "narrative of present illness",
    "pmh": "past medical history summary",
    "medications": ["list of medications mentioned"],
    "allergies": ["list of allergies mentioned"],
    "socialHistory": "social history summary",
    "familyHistory": "family history summary",
    "assessment": "clinical interpretation",
    "recommendedSpecialty": "dermatology|family_medicine",
    "priorityLevel": "routine|urgent|emergency",
    "suggestedWorkup": ["suggested tests/workup"],
    "preliminaryDiagnosis": [{"diagnosis": string, "likelihood": "high|moderate|low", "reasoning": string}],
    "recommendedTreatment": ["treatment suggestions"],
    "patientEducation": ["patient education points"],
    "followUp": "follow-up recommendation"
}

Language: ${language === 'ar' ? 'Arabic' : 'English'}`;

    const qaText = qaHistory.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n');
    const result = await callOpenAI(system, `Patient info: ${JSON.stringify(patientInfo)}\n\nInterview:\n${qaText}`, 2000);
    return safeJsonParse(result, {
        summary: 'Unable to generate summary.',
        keyFindings: [],
        redFlags: [],
        hpi: '',
        pmh: '',
        medications: [],
        allergies: [],
        socialHistory: '',
        familyHistory: '',
        assessment: '',
        recommendedSpecialty: 'family_medicine',
        priorityLevel: 'routine',
        suggestedWorkup: [],
        preliminaryDiagnosis: [],
        recommendedTreatment: [],
        patientEducation: [],
        followUp: '',
    });
}

async function detectMedication(text: string) {
    const system = `You are a medication extraction AI. Extract all medications from the text.

Include: prescriptions, OTC, vitamins, supplements, herbal remedies.
Map brand names to generic names when possible (Tylenol → Acetaminophen).

Respond in JSON: [{ "name": string, "genericName": string|null, "dose": string|null, "unit": string|null, "frequency": string|null, "route": string|null, "indication": string|null, "confidence": number }]`;

    const result = await callOpenAI(system, text, 500);
    return safeJsonParse(result, []);
}

// ── Main Handler ────────────────────────────────
serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ── Auth Check ──────────────────────────────
        const auth = await verifyAuth(req);
        if (!auth) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized. Valid authentication required.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const body = await req.json();
        const { action, ...params } = body;

        // ── Input validation ────────────────────────
        if (params.conversationHistory) {
            // Truncate overly long messages in history
            params.conversationHistory = params.conversationHistory.map(
                (m: { role: string; content: string }) => ({
                    role: m.role,
                    content: typeof m.content === 'string'
                        ? m.content.slice(0, MAX_MESSAGE_LENGTH)
                        : '',
                })
            );
        }

        let result: unknown;

        switch (action) {
            case 'analyze-concern':
                result = await analyzeConcern(
                    (params.concern || '').slice(0, MAX_MESSAGE_LENGTH),
                    params.language || 'en',
                );
                break;
            case 'generate-question':
                result = await generateQuestion(
                    params.concern,
                    params.previousAnswers || [],
                    params.section || 'hpi',
                    params.language || 'en',
                );
                break;
            case 'check-section':
                result = await checkSection(
                    params.section,
                    params.answersInSection || [],
                    params.concern,
                    params.language || 'en',
                );
                break;
            case 'analyze-qa':
                result = await analyzeQA(
                    params.qaHistory || [],
                    params.patientInfo || {},
                    params.language || 'en',
                );
                break;
            case 'detect-medication':
                result = await detectMedication(
                    (params.text || '').slice(0, MAX_MESSAGE_LENGTH),
                );
                break;
            case 'check-specialty-gate': {
                // ── Specialty Disable Gate ───────────────────────
                // Called after analyze-concern to check if the target
                // specialty is temporarily disabled. Returns routing decision.
                const targetSpecialty = params.specialty || '';
                const concern = (params.concern || '').slice(0, MAX_MESSAGE_LENGTH);
                const language = params.language || 'en';
                const patientId = params.patientId || auth.userId;

                // 1. Check if specialty is disabled
                const { data: override } = await supabaseAdmin
                    .from('specialty_overrides')
                    .select('*')
                    .eq('specialty', targetSpecialty)
                    .eq('is_disabled', true)
                    .maybeSingle();

                if (!override) {
                    // Specialty is active — proceed normally
                    result = { allowed: true, specialty: targetSpecialty };
                    break;
                }

                // 2. Specialty IS disabled — AI triage: can FM handle this?
                const triageSystem = `You are a medical triage AI for cliniq.one. A medical specialty ("${targetSpecialty}") has been temporarily disabled on the platform.

Determine if this patient's complaint could reasonably be managed by a Family Medicine / General Practitioner (GP) instead.

GUIDELINES:
- FM/GP CAN handle: common musculoskeletal pain (back pain, mild sprains, non-surgical joint pain), mild-moderate skin conditions (rashes, acne), general wellness, chronic disease management (diabetes, hypertension, cholesterol), common infections, minor acute illness, headaches, mild anxiety/stress, nutritional counseling, routine pediatric illnesses (cold, fever, ear infection)
- FM/GP CANNOT adequately handle: active psychosis, severe psychiatric crises (suicidal ideation, self-harm), complex surgical conditions, fractures requiring specialist assessment, severe eating disorders, specialized pediatric conditions (developmental delays, congenital issues), conditions explicitly requiring specialist diagnostics or procedures

Be GENEROUS toward FM capability — GPs are broadly trained. Only flag as "cannot manage" if specialist care is truly essential.

Respond in JSON:
{
  "canBeManaged": boolean,
  "confidence": number (0-100),
  "reasoning": string (1-2 sentences explaining why FM can or cannot handle this),
  "riskLevel": "low" | "medium" | "high"
}`;

                const triageResult = await callOpenAI(
                    triageSystem,
                    `Patient complaint: "${concern}"\nDisabled specialty: ${targetSpecialty}`,
                    400,
                );
                const triage = safeJsonParse(triageResult, {
                    canBeManaged: false,
                    confidence: 50,
                    reasoning: 'Unable to determine',
                    riskLevel: 'medium' as const,
                });

                // Read admin-configured FM confidence threshold (default 50)
                const fmThreshold = override.fm_confidence_threshold ?? 50;

                if (triage.canBeManaged && triage.confidence >= fmThreshold) {
                    // 3a. FM CAN handle AND meets confidence threshold — reroute
                    if (override.mode === 'silent') {
                        result = {
                            allowed: false,
                            redirected: true,
                            mode: 'silent',
                            fallback: 'family_medicine',
                            originalSpecialty: targetSpecialty,
                        };
                    } else {
                        // Announced mode — include admin reason + patient message
                        const adminReasonLabel = override.reason_code === 'doctor_unavailable' ? 'The doctor for this specialty is currently unavailable'
                            : override.reason_code === 'scheduling_conflict' ? 'There is a scheduling conflict for this specialty'
                                : override.reason_code === 'system_maintenance' ? 'This specialty service is undergoing maintenance'
                                    : override.reason_code === 'quality_review' ? 'This specialty is currently under quality review'
                                        : override.reason_code === 'regulatory' ? 'Regulatory requirements have temporarily paused this specialty'
                                            : override.reason_code === 'staffing_shortage' ? 'We are experiencing a temporary staffing shortage in this specialty'
                                                : 'This specialty is temporarily unavailable';

                        // Generate patient-friendly message if admin didn't provide one
                        const patientMessage = override.patient_message || (
                            language === 'ar'
                                ? `نعتذر، خدمة ${targetSpecialty === 'orthopedics' ? 'جراحة العظام' : targetSpecialty === 'psychiatry' ? 'الطب النفسي' : targetSpecialty === 'dermatology' ? 'الأمراض الجلدية' : targetSpecialty === 'pediatrics' ? 'طب الأطفال' : (targetSpecialty === 'diet' || targetSpecialty === 'diet_nutrition') ? 'التغذية' : targetSpecialty} غير متاحة مؤقتاً. يمكننا تحويل استشارتك إلى طبيب أسرة مؤهل يمكنه مساعدتك.`
                                : `We apologize, but our ${targetSpecialty.replace(/_/g, ' ')} service is temporarily unavailable. We can route your consultation to a qualified Family Medicine doctor who can assist you.`
                        );

                        result = {
                            allowed: false,
                            redirected: true,
                            mode: 'announced',
                            fallback: 'family_medicine',
                            originalSpecialty: targetSpecialty,
                            adminReason: adminReasonLabel,
                            patientMessage,
                            reasonText: override.reason_text,
                        };
                    }
                } else {
                    // 3b. FM CANNOT handle — block and log incident
                    try {
                        await supabaseAdmin
                            .from('specialty_incidents')
                            .insert({
                                override_id: override.id,
                                patient_id: patientId,
                                specialty: targetSpecialty,
                                chief_complaint: concern,
                                ai_reasoning: triage.reasoning,
                                ai_confidence: triage.confidence,
                                status: 'open',
                            });
                    } catch (incidentErr) {
                        console.error('Failed to log specialty incident:', incidentErr);
                    }

                    const apologyMessage = language === 'ar'
                        ? `نعتذر بشدة، خدمة ${targetSpecialty === 'orthopedics' ? 'جراحة العظام' : targetSpecialty === 'psychiatry' ? 'الطب النفسي' : targetSpecialty === 'dermatology' ? 'الأمراض الجلدية' : targetSpecialty === 'pediatrics' ? 'طب الأطفال' : (targetSpecialty === 'diet' || targetSpecialty === 'diet_nutrition') ? 'التغذية' : targetSpecialty} غير متاحة حالياً، وشكواك تتطلب أخصائياً. نعتذر عن الإزعاج وقد تم إبلاغ الإدارة. سيتم التواصل معك في أقرب وقت.`
                        : `We sincerely apologize, but our ${targetSpecialty.replace(/_/g, ' ')} service is currently unavailable, and your concern requires specialist attention that cannot be addressed by a general practitioner. Our administration has been notified and we will reach out to you as soon as this service is restored.`;

                    result = {
                        allowed: false,
                        redirected: false,
                        blocked: true,
                        mode: override.mode,
                        originalSpecialty: targetSpecialty,
                        fallback: null,
                        apologyMessage,
                        riskLevel: triage.riskLevel,
                    };
                }
                break;
            }
            case 'classify-pathway': {
                // ── Pathway Classification (Silent Node ③) ──────────
                // Reads the problem_input conversation and determines:
                // new_visit / refill / follow_up
                const pathwayHistory = params.conversationHistory || [];
                const pathwayLang = params.language || 'en';

                const pathwaySystemPrompt = `You are a medical pathway classifier for cliniq.one. Based on the patient's description of their concern, determine the visit type.

Classification rules:
- "refill" = Patient explicitly mentions needing a prescription refill, medication renewal, running out of medication, or wanting the same medication again. Examples: "I need more of my blood pressure medication", "my prescription ran out", "I need a refill of metformin"
- "follow_up" = Patient references a previous visit, ongoing treatment, checking on test results, post-surgery check, or monitoring a known condition. Examples: "I'm following up on my last appointment", "checking on my lab results", "my doctor told me to come back"  
- "new_visit" = New complaint, first time experiencing symptoms, or no reference to prior visits/medications. This is the DEFAULT if unclear.

IMPORTANT: When in doubt, classify as "new_visit". Only classify as "refill" or "follow_up" if the patient's language clearly indicates it.

Respond in JSON: { "pathway": "new_visit" | "refill" | "follow_up", "confidence": <number 0-100>, "reasoning": "<1 sentence explanation>" }

Language context: ${pathwayLang === 'ar' ? 'Patient may be speaking Arabic' : 'Patient is speaking English'}`;

                const pathwayUserText = pathwayHistory
                    .filter((m: { role: string }) => m.role === 'patient' || m.role === 'user')
                    .map((m: { content: string }) => m.content)
                    .join('\n');

                const pathwayRaw = await callOpenAI(
                    pathwaySystemPrompt,
                    `Patient messages:\n${pathwayUserText || 'No messages available'}`,
                    300,
                );
                result = safeJsonParse(pathwayRaw, {
                    pathway: 'new_visit',
                    confidence: 50,
                    reasoning: 'Default classification — unable to parse response',
                });
                console.log(`[classify-pathway] Result: ${JSON.stringify(result)}`);
                break;
            }
            case 'chat':
                // Legacy: client sends admin-configured prompt + conversation
                result = {
                    response: await chatWithConversation(
                        sanitizeSystemPrompt(params.systemPrompt || 'You are a medical intake AI assistant.'),
                        params.conversationHistory || [],
                        params.maxTokens || 1000,
                    ),
                };
                break;
            case 'chat-section': {
                // Unified chat action: server resolves prompt, appends rules, post-processes
                const section = params.section || 'greeting';
                const mode: 'draft' | 'active' = params.mode === 'draft' ? 'draft' : 'active';
                const language = params.language || 'en';
                const promptId = params.promptId;
                const maxTokens = params.maxTokens || 1000;
                const history = params.conversationHistory || [];
                const patientContext = params.patientContext || '';
                const wantDebug = params.debug === true;
                const turnCount = params.turnCount || 0;
                const maxTurns = params.maxTurns || 0;

                // 1. Resolve prompt
                let systemPrompt = '';
                let promptVersion = 0;
                let promptName = section;
                let promptSource = 'hardcoded';
                let resolvedPromptId: string | null = null;

                if (promptId) {
                    const promptData = await getPromptById(promptId, mode);
                    if (promptData) {
                        systemPrompt = promptData.content;
                        promptVersion = promptData.version;
                        promptName = `prompt:${promptId}`;
                        promptSource = 'explicit';
                        resolvedPromptId = promptId;
                    }
                }

                // Fallback if no prompt found
                if (!systemPrompt) {
                    if (section === 'greeting') {
                        systemPrompt = 'You are a friendly, professional medical intake AI assistant for cliniq.one. Greet the patient warmly and ask what brings them in today. Keep your greeting concise (2-3 sentences max).';
                    } else if (section === 'summary') {
                        systemPrompt = 'You are a clinical documentation AI for cliniq.one. Based on the entire conversation, generate a comprehensive clinical summary.';
                    } else {
                        systemPrompt = `You are a medical intake AI assistant for cliniq.one conducting a virtual medical interview. Current section: ${section}. Ask relevant follow-up questions. When done, end with: [SECTION_COMPLETE]`;
                    }
                }

                // 2. Append [SECTION_COMPLETE] suffix for interview sections
                if (!NO_COMPLETE_SECTIONS.includes(section)) {
                    systemPrompt += '\n\nWhen you feel you have enough information for this section, end your message with exactly: [SECTION_COMPLETE]';
                }

                // 2b. Section isolation — prevent AI from skipping sections based on prior conversation
                if (!NO_COMPLETE_SECTIONS.includes(section)) {
                    systemPrompt += `\n\nCRITICAL — NEW SECTION STARTING: This is the "${section.replace(/_/g, ' ').toUpperCase()}" section. This is a completely new, independent section of the intake interview. You MUST NOT skip this section or emit [SECTION_COMPLETE] without engaging the patient. If the patient already mentioned information relevant to this section earlier in the conversation, you should acknowledge/confirm that information and then ask if there is anything else to add. For example: "Earlier you mentioned [X]. Is that correct? Do you have any other [topic]?" If no prior info was mentioned, ask your standard opening question. Either way, you must have at least one exchange with the patient before completing this section.`;
                }

                // 3. Append behavioral rules (except greeting/summary)
                if (!NO_COMPLETE_SECTIONS.includes(section) || section === 'pathway') {
                    systemPrompt += BEHAVIOR_SUFFIX;
                }

                // 3a. Append concise rules for non-HPI interview sections
                const CONCISE_SECTIONS = ['additional_complaints', 'medications', 'allergies', 'family_history', 'social_history', 'review_of_systems'];
                if (CONCISE_SECTIONS.includes(section)) {
                    systemPrompt += CONCISE_SECTIONS_SUFFIX;
                }

                // 3b. Append summary-specific rules
                if (section === 'summary') {
                    systemPrompt += SUMMARY_SUFFIX;
                }

                // 3c. Append addendum-specific rules
                if (section === 'patient_addendum') {
                    systemPrompt += ADDENDUM_SUFFIX;
                }

                // 3c. Inject patient context (brief background, not full history)
                if (patientContext && section !== 'greeting') {
                    systemPrompt += `\n\nPATIENT CONTEXT (for reference only — do NOT skip your questions based on this):\n${patientContext}`;
                }

                // 4. Append language instruction
                if (language === 'ar') {
                    systemPrompt += `\n\nCRITICAL LANGUAGE RULES — YOU MUST FOLLOW THESE:
- You MUST respond ONLY in Arabic (العربية). Do NOT use English at any point in your response.
- Use formal Arabic (فصحى) with a warm, patient-friendly tone.
- Transliterate medical terms the patient may not understand.
- BRAND NAME RULE: The name "cliniq.one" is a trademark. NEVER translate, transliterate, or convert it to Arabic script. Always write it exactly as: cliniq.one (in Latin characters). Do NOT write كلينيك وان or any Arabic equivalent.`;
                } else {
                    systemPrompt += `\n\nIMPORTANT: Respond in English. The brand name "cliniq.one" must always appear in Latin characters exactly as written.`;
                }

                // 5. Sanitize
                systemPrompt = sanitizeSystemPrompt(systemPrompt);

                // 6. Prepend global guard + Arabic guard (when Arabic)
                const guard = await getGlobalGuard(mode);
                const arabicGuard = language === 'ar' ? await getArabicGuard() : null;
                let finalPrompt: string;
                if (guard && arabicGuard) {
                    finalPrompt = `${guard}\n\n${arabicGuard}\n\n---\n\n${systemPrompt}`;
                } else if (guard) {
                    finalPrompt = `${guard}\n\n---\n\n${systemPrompt}`;
                } else {
                    finalPrompt = systemPrompt;
                }

                // 7. Gibberish pre-check — intercept before calling OpenAI (saves tokens)
                const lastUserMsg = [...history].reverse().find((m: { role: string }) => m.role === 'patient' || m.role === 'user');
                if (lastUserMsg && !NO_COMPLETE_SECTIONS.includes(section)) {
                    const gibCheck = detectGibberish(lastUserMsg.content);
                    if (gibCheck.isGibberish) {
                        console.log(`[chat-section] Gibberish detected in ${section}: "${lastUserMsg.content}" — reason: ${gibCheck.reason}`);

                        // Count consecutive gibberish
                        let consecutiveGibberish = 1;
                        for (let i = history.length - 1; i >= 0; i--) {
                            const m = history[i] as { role: string; content: string };
                            if (m.role === 'patient' || m.role === 'user') {
                                if (detectGibberish(m.content).isGibberish) consecutiveGibberish++;
                                else break;
                            }
                        }

                        const isAr = language === 'ar';
                        const responseText = consecutiveGibberish >= 3
                            ? (isAr ? GIBBERISH_ESCALATED_AR : GIBBERISH_ESCALATED_EN)
                            : (isAr ? GIBBERISH_RESPONSES_AR : GIBBERISH_RESPONSES)[Math.floor(Math.random() * (isAr ? GIBBERISH_RESPONSES_AR : GIBBERISH_RESPONSES).length)];

                        const chatbotVersion = await getChatbotVersion();
                        result = {
                            response: responseText,
                            sectionComplete: false,
                            violation: 'nonsense',
                            promptVersion,
                            chatbotVersion,
                        };
                        break;
                    }
                }

                // 8. Truncate history
                const trimmedHistory = truncateHistory(history);

                // 8. Build OpenAI messages
                const config = await getConfig();

                // ── Turn limit nudge — encourage AI to wrap up when approaching max turns ──
                let promptWithTurnNudge = finalPrompt;
                if (maxTurns > 0 && turnCount >= maxTurns - 2) {
                    promptWithTurnNudge += `\n\nCRITICAL: You are at turn ${turnCount + 1}/${maxTurns} for this section. You MUST conclude this section NOW. Summarize what you have gathered and end your response with [SECTION_COMPLETE].`;
                    console.log(`[chat-section] Turn limit nudge: ${turnCount + 1}/${maxTurns} for ${section}`);
                }

                const openaiMessages = [
                    { role: 'system', content: promptWithTurnNudge },
                    ...trimmedHistory.map((m: { role: string; content: string }) => ({
                        role: m.role === 'patient' ? 'user' : m.role === 'ai' ? 'assistant' : m.role,
                        content: m.content,
                    })),
                ];

                // 9. Call OpenAI
                const fetchStart = Date.now();
                const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: config.model,
                        temperature: config.temperature,
                        max_tokens: maxTokens,
                        messages: openaiMessages,
                    }),
                });

                if (!aiRes.ok) {
                    const errText = await aiRes.text();
                    throw new Error(`OpenAI error: ${aiRes.status} ${errText}`);
                }

                const aiData = await aiRes.json();
                const latencyMs = Date.now() - fetchStart;
                const rawContent = aiData.choices?.[0]?.message?.content || '';

                // 10. Post-process response
                let sectionComplete = rawContent.includes('[SECTION_COMPLETE]');
                const addendumDone = rawContent.includes('[ADDENDUM_DONE]');

                // ── FIRST-TURN GUARD ──────────────────────────
                // If the conversation history was empty (first AI turn in this section)
                // and the AI tried to immediately complete, strip the flag.
                // The AI MUST ask at least one question before completing.
                const isFirstTurn = history.length === 0;
                if (sectionComplete && isFirstTurn && !NO_COMPLETE_SECTIONS.includes(section)) {
                    console.log(`[chat-section] First-turn guard: stripping [SECTION_COMPLETE] from ${section}`);
                    sectionComplete = false;
                }

                const violationMatch = rawContent.match(/\[VIOLATION:([^\]]+)\]/);
                let violation: string | null = violationMatch ? violationMatch[1] : null;
                const cleanContent = rawContent
                    .replace(/\[SECTION_COMPLETE\]/g, '')
                    .replace(/\[ADDENDUM_DONE\]/g, '')
                    .replace(/\[VIOLATION:[^\]]+\]/g, '')
                    .trim();

                // Soft-redirect detection if no explicit violation
                if (!violation) {
                    violation = detectSoftRedirect(cleanContent);
                }

                // 11. Get chatbot version
                const chatbotVersion = await getChatbotVersion();

                result = {
                    response: cleanContent,
                    sectionComplete,
                    addendumDone,
                    violation,
                    promptVersion,
                    chatbotVersion,
                };

                // Debug payload for admin sandbox — never sent to patients
                if (wantDebug) {
                    (result as any).debug = {
                        systemPrompt: finalPrompt,
                        rawResponse: rawContent,
                        section,
                        messagesSent: openaiMessages,
                        prompt: { name: promptName, version: promptVersion, id: resolvedPromptId, source: promptSource },
                        tokenUsage: aiData.usage || null,
                        model: config.model,
                        temperature: config.temperature,
                        latencyMs,
                        aiTurnsInSection: turnCount + 1,
                        maxTurns: maxTurns || null,
                    };
                }
                break;
            }
            case 'verify-medication': {
                // FIG_53 — AI-powered medication verification with therapeutic range validation
                // Admin-configurable: check ai_prompts for prompt_type='medication_verify'
                const medications = params.medications || [];
                const language = params.language || 'en';

                if (!medications.length) {
                    return new Response(
                        JSON.stringify({ error: 'medications array is required' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
                    );
                }

                // Try admin-configured prompt first, fall back to built-in
                const adminVerifyPrompt = await getPromptByType('medication_verify');
                const verifySystem = adminVerifyPrompt || `You are a clinical pharmacology AI for cliniq.one. Verify each medication the patient reported.

For each medication, determine:
1. Whether the drug name is a real, recognizable medication
2. Whether the stated dosage falls within the normal therapeutic range
3. The standard therapeutic range for this medication
4. Common indications (what it's typically used for)

Respond in JSON:
{
  "verifications": [
    {
      "name": string,
      "genericName": string | null,
      "statedDosage": string,
      "status": "verified" | "needs_confirmation" | "unrecognized",
      "statusReason": string,
      "therapeuticRange": string | null,
      "commonIndications": string[],
      "dailyDoseStatus": string,
      "confidence": number
    }
  ]
}

Rules:
- "verified" = drug name recognized AND dosage within therapeutic range
- "needs_confirmation" = drug recognized BUT dosage unusual OR indication unclear
- "unrecognized" = drug name not recognized as a known medication
- Language: ${language === 'ar' ? 'Arabic' : 'English'} for statusReason and commonIndications`;

                const medsText = medications.map((m: { name: string; dosage?: string }, i: number) =>
                    `${i + 1}. ${m.name}${m.dosage ? ` ${m.dosage}` : ''}`
                ).join('\n');

                const verifyResult = await callOpenAI(verifySystem, `Patient-reported medications:\n${medsText}`, 1000);
                result = safeJsonParse(verifyResult, { verifications: [] });
                break;
            }
            case 'analyze-drug-label': {
                // FIG_55 — Vision API: OCR drug label photo and cross-validate
                // EPHEMERAL: Image is base64, forwarded to OpenAI, never stored
                // Admin-configurable: check ai_prompts for prompt_type='drug_label_analysis'
                const imageBase64 = params.imageBase64;
                const statedMedication = params.statedMedication || '';
                const statedDosage = params.statedDosage || '';
                const language = params.language || 'en';

                if (!imageBase64) {
                    return new Response(
                        JSON.stringify({ error: 'imageBase64 is required' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
                    );
                }

                const config = await getConfig();

                // Try admin-configured prompt first, fall back to built-in
                const adminLabelPrompt = await getPromptByType('drug_label_analysis');
                const labelSystem = adminLabelPrompt || `You are a pharmaceutical label OCR AI for cliniq.one. Extract medication information from the drug label photo and cross-validate against what the patient stated.

Respond in JSON:
{
  "extracted": {
    "drugName": string,
    "dosage": string,
    "form": string,
    "manufacturer": string,
    "batchNumber": string | null,
    "expiryDate": string | null,
    "additionalInfo": string | null
  },
  "crossValidation": {
    "nameMatch": boolean,
    "dosageMatch": boolean,
    "overallMatch": "match" | "partial_match" | "mismatch" | "unable_to_read",
    "discrepancies": string[]
  },
  "confidence": number,
  "processingNote": string
}

Rules:
- Extract ALL visible text from the label
- Compare extracted drug name against patient-stated: "${statedMedication}"
- Compare extracted dosage against patient-stated: "${statedDosage}"
- Confidence 0-100: how readable/clear the label was
- If label is blurry or unreadable, set overallMatch to "unable_to_read"
- Language for processingNote: ${language === 'ar' ? 'Arabic' : 'English'}`;

                // Vision API call — multimodal content array
                const visionRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: config.model,
                        temperature: 0.1,
                        max_tokens: 800,
                        response_format: { type: 'json_object' },
                        messages: [
                            {
                                role: 'system',
                                content: labelSystem,
                            },
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: `Extract medication details from this drug label photo. The patient stated they take: "${statedMedication}${statedDosage ? ` ${statedDosage}` : ''}"`,
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: {
                                            url: `data:image/jpeg;base64,${imageBase64}`,
                                            detail: 'high',
                                        },
                                    },
                                ],
                            },
                        ],
                    }),
                });

                if (!visionRes.ok) {
                    const errText = await visionRes.text();
                    throw new Error(`OpenAI Vision error: ${visionRes.status} ${errText}`);
                }

                const visionData = await visionRes.json();
                const visionContent = visionData.choices?.[0]?.message?.content || '{}';
                result = safeJsonParse(visionContent, {
                    extracted: { drugName: '', dosage: '', form: '', manufacturer: '' },
                    crossValidation: { nameMatch: false, dosageMatch: false, overallMatch: 'unable_to_read', discrepancies: [] },
                    confidence: 0,
                    processingNote: 'Failed to analyze label',
                });
                break;
            }
            case 'improve-inquiry': {
                // Doctor requests AI to polish their inquiry text for a patient
                const rawQuestion = (params.question || '').slice(0, MAX_MESSAGE_LENGTH);
                const language = params.language || 'en';

                if (!rawQuestion) {
                    return new Response(
                        JSON.stringify({ error: 'question is required' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
                    );
                }

                const improveSystem = `You are a medical communication AI for cliniq.one. A doctor wants to request additional information from a patient.

Your task: Rewrite the doctor's rough question to be:
1. Clear and patient-friendly — avoid medical jargon
2. Warm and reassuring — the patient should not feel alarmed
3. Specific enough to get useful clinical information
4. Concise — 1-3 sentences max

Language: ${language === 'ar' ? 'Arabic (Gulf dialect)' : 'English'}

Respond in JSON: { "improved": "the improved question text" }`;

                const improveResult = await callOpenAI(improveSystem, `Doctor's question: ${rawQuestion}`, 300);
                const parsed = safeJsonParse(improveResult, { improved: rawQuestion });
                result = { improved: parsed.improved || rawQuestion };
                break;
            }
            case 'resolve-locum': {
                // ── Locum Doctor Code Lookup ────────────────────
                // Patient enters a doctor code on the intake index page.
                // We resolve it to a doctor record and return a locum greeting prompt.
                const code = (params.code || '').trim().toUpperCase();

                if (!code) {
                    return new Response(
                        JSON.stringify({ error: 'code is required' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
                    );
                }

                // Look up doctor by locum_code
                const { data: doctor, error: docErr } = await supabaseAdmin
                    .from('doctors')
                    .select('id, display_name, specialty, locum_code')
                    .eq('locum_code', code)
                    .eq('status', 'active')
                    .maybeSingle();

                if (docErr || !doctor) {
                    result = { found: false };
                    break;
                }

                // Fetch the locum greeting prompt template
                const locumPrompt = await getPromptByType('locum_greeting');
                const greetingPrompt = locumPrompt
                    ? locumPrompt
                        .replace(/\{\{doctor_name\}\}/g, doctor.display_name || '')
                        .replace(/\{\{doctor_specialty\}\}/g, (doctor.specialty || '').replace(/_/g, ' '))
                        .replace(/\{\{language\}\}/g, params.language === 'ar' ? 'Arabic' : 'English')
                    : null;

                result = {
                    found: true,
                    doctor: {
                        id: doctor.id,
                        display_name: doctor.display_name,
                        specialty: doctor.specialty,
                        locum_code: doctor.locum_code,
                    },
                    greetingPrompt,
                };
                break;
            }
            case 'analyze-integrity': {
                // ── Chat Integrity Analysis ─────────────────────
                // Silent node that runs after Patient Addendum.
                // Analyzes the entire conversation for quality, timing, and fluidity.
                // Returns a structured report for doctor confidence + admin analytics.
                const conversationHistory = params.conversationHistory || [];
                const sectionTimings = params.sectionTimings || {};
                const metadata = params.metadata || {};

                const integritySystemPrompt = `You are a medical AI intake quality analyst. Analyze the following patient intake conversation and return a JSON report assessing its integrity and quality.

CONVERSATION METADATA:
- Total duration: ${metadata.totalDurationMs ? Math.round(metadata.totalDurationMs / 1000) : 'unknown'}s
- Pathway: ${metadata.pathway || 'unknown'}
- Detected specialty: ${metadata.detectedSpecialty || 'unknown'}
- Strike count (gibberish/violation): ${metadata.strikeCount ?? 0}
- Violation types: ${JSON.stringify(metadata.violationTypes || [])}

SECTION TIMINGS:
${JSON.stringify(sectionTimings, null, 2)}

Return ONLY a valid JSON object with this exact structure:
{
  "confidence_score": <number 0-100, overall confidence the intake data is reliable>,
  "fluidity_score": <number 0-100, how smoothly the conversation flowed>,
  "completion_rate": <number 0-100, percentage of expected information gathered>,
  "red_flags": [<array of string descriptions of any concerning patterns>],
  "section_quality": {
    "<section_key>": { "score": <0-100>, "note": "<brief assessment>" }
  },
  "patient_engagement": "<low|medium|high>",
  "response_consistency": "<low|medium|high>",
  "estimated_reliability": "<unreliable|low|moderate|high|very_high>",
  "summary": "<1-2 sentence overall assessment>",
  "interruption_count": <number of apparent session interruptions>,
  "avg_response_time_category": "<fast|normal|slow|very_slow>"
}`;

                const integrityUserPrompt = `Analyze this intake conversation:\n\n${JSON.stringify(conversationHistory.slice(-60))}`;

                const integrityRaw = await callOpenAI(integritySystemPrompt, integrityUserPrompt, 1500);
                result = safeJsonParse(integrityRaw, {
                    confidence_score: 50,
                    fluidity_score: 50,
                    completion_rate: 50,
                    red_flags: [],
                    section_quality: {},
                    patient_engagement: 'medium',
                    response_consistency: 'medium',
                    estimated_reliability: 'moderate',
                    summary: 'Analysis could not be completed.',
                    interruption_count: 0,
                    avg_response_time_category: 'normal',
                });
                break;
            }
            case 'analyze-report': {
                // ── AI-Verified Medical Report Analysis ──────────────
                // Uses OpenAI Vision API to:
                // 1. Verify document integrity (is this a real medical document?)
                // 2. Extract context (type, institution, key findings)
                // 3. Validate date (when was it issued? is it clinically relevant?)
                // 4. Generate a structured summary for the doctor
                //
                // Admin-configurable: report_analysis_model in platform_settings
                const imageBase64 = params.imageBase64;
                const fileUrl = params.fileUrl;
                const reportType = params.reportType || 'general';
                const specialty = params.specialty || 'family_medicine';
                const language = params.language || 'en';
                const uploadId = params.uploadId; // consultation_report_uploads.id

                if (!imageBase64 && !fileUrl) {
                    return new Response(
                        JSON.stringify({ error: 'imageBase64 or fileUrl is required' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
                    );
                }

                // 1. Read admin-configured model for report analysis
                let reportModel = 'gpt-4o'; // default to best vision model
                try {
                    const { data: modelSetting } = await supabaseAdmin
                        .from('platform_settings')
                        .select('value')
                        .eq('key', 'report_analysis_model')
                        .maybeSingle();
                    if (modelSetting?.value) reportModel = modelSetting.value;
                } catch { /* use default */ }

                const config = await getConfig();

                // 2. Build specialty-aware analysis prompt
                const specialtyHints: Record<string, string> = {
                    orthopedics: 'Focus on: fractures, joint degeneration, disc problems, bone density, ligament/tendon injuries, inflammatory markers (ESR, CRP, uric acid, vitamin D levels).',
                    psychiatry: 'Focus on: psychiatric evaluations, PHQ-9/GAD-7/MMPI scores, medication trial history, therapy progress notes, thyroid/lithium levels, neuropsychological test results.',
                    family_medicine: 'Focus on: CBC, metabolic panel, HbA1c, cholesterol/lipid panel, thyroid function, liver/kidney function, ECG findings, blood pressure trends.',
                    pediatrics: 'Focus on: growth percentiles (height/weight/head circumference), vaccination records, developmental milestones, newborn screening, pediatric blood work.',
                    dermatology: 'Focus on: skin biopsy/pathology reports, allergy patch test results, ANA/autoimmune panels, previous dermatology treatment records.',
                    diet: 'Focus on: metabolic panel, vitamin/mineral levels (D, B12, iron, folate), HbA1c, lipid panel, thyroid function, body composition/DEXA results, food allergy/intolerance tests.',
                    diet_nutrition: 'Focus on: metabolic panel, vitamin/mineral levels (D, B12, iron, folate), HbA1c, lipid panel, thyroid function, body composition/DEXA results, food allergy/intolerance tests.',
                };

                const specialtyHint = specialtyHints[specialty] || 'Analyze all findings comprehensively.';

                const arabicHint = language === 'ar'
                    ? `\n\nIMPORTANT: This document may be in Arabic. If so, read Arabic text carefully and extract all information in English for the structured response. Include original Arabic text in parentheses where clinically relevant (e.g., institution name, diagnosis terms).`
                    : '';

                const reportSystemPrompt = `You are a medical document analysis AI for cliniq.one — a telemedicine platform. Analyze the uploaded medical document image and extract all clinically relevant information.

SPECIALTY CONTEXT: ${specialty.replace(/_/g, ' ')}
${specialtyHint}

YOUR TASKS:
1. INTEGRITY CHECK: Determine if this is a legitimate medical document (lab report, imaging study, clinical letter, etc.). Reject: selfies, random photos, blank pages, screenshots of web searches, non-medical content.

2. DOCUMENT CLASSIFICATION: Identify the type:
   - lab: Blood tests, urine tests, metabolic panels, hormone levels
   - imaging: X-ray, MRI, CT, ultrasound, DEXA scan reports
   - pathology: Biopsy results, cytology, histology reports
   - prescription: Medication prescriptions, drug orders
   - psychiatric_evaluation: PHQ-9, MMPI, clinical evaluations
   - therapy_notes: Therapy session summaries, progress notes
   - growth_chart: Pediatric growth percentile charts
   - vaccination: Immunization records
   - body_composition: DEXA, bioimpedance, body fat measurements
   - surgical_report: Operation notes, surgical summaries
   - previous_report: Previous doctor consultation reports
   - general: Other medical documents
   - unknown: Cannot determine

3. DATE EXTRACTION: Find the report/test date. Determine relevance:
   - "current": Within last 3 months
   - "recent": 3-12 months old
   - "outdated": More than 12 months old
   - "unknown": No date found

4. DATA EXTRACTION: Extract ALL clinically useful data points:
   - Test names, values, units, and reference ranges
   - Key findings, interpretations, diagnoses
   - Institution name, ordering physician
   - Patient name (for cross-reference, NOT for diagnosis)

5. DOCTOR SUMMARY: Write a concise 1-2 sentence summary a specialist would find immediately useful.
${arabicHint}

Respond in JSON:
{
  "isValidDocument": boolean,
  "documentType": "lab" | "imaging" | "pathology" | "prescription" | "psychiatric_evaluation" | "therapy_notes" | "growth_chart" | "vaccination" | "body_composition" | "surgical_report" | "previous_report" | "general" | "unknown",
  "documentDate": "YYYY-MM-DD" | null,
  "dateRelevance": "current" | "recent" | "outdated" | "unknown",
  "documentLanguage": "en" | "ar" | "other",
  "extractedData": {
    "title": string,
    "institution": string | null,
    "orderingPhysician": string | null,
    "patientName": string | null,
    "keyFindings": string[],
    "values": [{ "name": string, "value": string, "unit": string, "reference": string, "flag": "normal" | "high" | "low" | "critical" | "unknown" }],
    "diagnoses": string[],
    "recommendations": string[]
  },
  "summary": string,
  "confidence": number,
  "rejectionReason": string | null
}`;

                // 3. Build image content for Vision API
                let imageContent: any;
                if (imageBase64) {
                    // Detect mime type from base64 header or default to jpeg
                    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
                    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                    imageContent = {
                        type: 'image_url',
                        image_url: {
                            url: mimeMatch ? imageBase64 : `data:${mimeType};base64,${cleanBase64}`,
                            detail: 'high',
                        },
                    };
                } else {
                    // Use file URL directly
                    imageContent = {
                        type: 'image_url',
                        image_url: {
                            url: fileUrl,
                            detail: 'high',
                        },
                    };
                }

                // 4. Call OpenAI Vision API
                const reportRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: reportModel,
                        temperature: 0.1,
                        max_tokens: 2000,
                        response_format: { type: 'json_object' },
                        messages: [
                            {
                                role: 'system',
                                content: reportSystemPrompt,
                            },
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: `Analyze this medical document. Specialty context: ${specialty.replace(/_/g, ' ')}. Expected report type: ${reportType}.`,
                                    },
                                    imageContent,
                                ],
                            },
                        ],
                    }),
                });

                if (!reportRes.ok) {
                    const errText = await reportRes.text();
                    throw new Error(`OpenAI Vision error: ${reportRes.status} ${errText}`);
                }

                const reportData = await reportRes.json();
                const reportContent = reportData.choices?.[0]?.message?.content || '{}';
                const analysis = safeJsonParse(reportContent, {
                    isValidDocument: false,
                    documentType: 'unknown',
                    documentDate: null,
                    dateRelevance: 'unknown',
                    documentLanguage: 'en',
                    extractedData: { title: '', institution: null, orderingPhysician: null, patientName: null, keyFindings: [], values: [], diagnoses: [], recommendations: [] },
                    summary: 'Unable to analyze document',
                    confidence: 0,
                    rejectionReason: 'Analysis failed',
                });

                // 5. Persist analysis to database (if uploadId provided)
                if (uploadId) {
                    try {
                        await supabaseAdmin
                            .from('consultation_report_uploads')
                            .update({
                                ai_analysis: analysis,
                                document_date: analysis.documentDate || null,
                                is_verified: analysis.isValidDocument === true && analysis.confidence >= 50,
                                rejection_reason: analysis.rejectionReason || null,
                                report_summary: analysis.summary || null,
                                ai_confidence: analysis.confidence || 0,
                                document_type: analysis.documentType || 'unknown',
                                date_relevance: analysis.dateRelevance || 'unknown',
                                document_language: analysis.documentLanguage || 'en',
                                status: analysis.isValidDocument ? 'uploaded' : 'pending',
                            })
                            .eq('id', uploadId);
                        console.log(`[analyze-report] Persisted analysis for upload ${uploadId}: verified=${analysis.isValidDocument}, confidence=${analysis.confidence}`);
                    } catch (dbErr) {
                        console.error('[analyze-report] Failed to persist analysis:', dbErr);
                    }
                }

                result = analysis;
                console.log(`[analyze-report] Completed: type=${analysis.documentType}, verified=${analysis.isValidDocument}, confidence=${analysis.confidence}, date=${analysis.documentDate}`);
                break;
            }
            default:
                return new Response(
                    JSON.stringify({ error: `Unknown action: ${action}` }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
                );
        }

        return new Response(
            JSON.stringify(result),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('Edge function error:', err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
