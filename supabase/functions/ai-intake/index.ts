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
const NO_COMPLETE_SECTIONS = ['greeting', 'pathway', 'summary', 'photo_capture', 'patient_addendum'];

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

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
};

// ── Singleton Supabase admin client ─────────────
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ── Auth Verification ───────────────────────────
// Supports both user JWT tokens and admin service-role key
async function verifyAuth(req: Request): Promise<{ userId: string; isAdmin?: boolean } | null> {
    // Admin bypass via service-role key header
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey && adminKey === supabaseServiceKey) {
        return { userId: 'admin', isAdmin: true };
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return null;

    try {
        const token = authHeader.replace('Bearer ', '');
        // Use admin client to verify user token (avoids anon key format issues)
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) return null;
        return { userId: user.id };
    } catch {
        return null;
    }
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

function detectGibberish(text: string): { isGibberish: boolean; reason?: string } {
    const trimmed = text.trim();
    if (!trimmed) return { isGibberish: false };

    // Allow short valid responses
    if (VALID_SHORT.has(trimmed.toLowerCase())) return { isGibberish: false };

    // Strip spaces and check the alpha content
    const alphaOnly = trimmed.replace(/[^a-zA-Z\u0600-\u06FF]/g, ''); // keep Latin + Arabic
    if (alphaOnly.length < 3) return { isGibberish: false }; // too short to judge

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
1. Which specialty to route to (dermatology, family_medicine, psychiatry, orthopedics, pediatrics, or diet)
2. The urgency level (routine, urgent, or emergency)
3. Key medical keywords extracted

Routing rules:
- Skin/hair/nail/rash/acne/eczema/psoriasis/cosmetic concerns → dermatology
- Joint pain/bone pain/muscle pain/back pain/neck pain/knee/shoulder/hip/ankle/wrist/elbow/spine/fracture/sprain/arthritis/osteoporosis/gout/tendon/ligament/cartilage/disc/sciatica/orthopedic concerns → orthopedics
- Mental health/depression/anxiety/mood/sleep disturbance/psychiatric/ADHD/bipolar/psychosis/stress/trauma → psychiatry
- Child health/infant/toddler/baby/newborn/childhood illness/pediatric fever/growth/development/vaccination/teething/colic/childhood rash/ear infection in children → pediatrics
- Weight management/nutrition/diet plan/eating habits/obesity/underweight/meal planning/calorie/BMI/food allergy/dietary supplement/malnutrition/metabolic diet/cholesterol diet/diabetes diet → diet
- General illness/fever/pain/chronic disease/multi-system → family_medicine
- Life-threatening symptoms → emergency (specialty = null)

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

                if (triage.canBeManaged) {
                    // 3a. FM CAN handle — reroute
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
                                ? `نعتذر، خدمة ${targetSpecialty === 'orthopedics' ? 'جراحة العظام' : targetSpecialty === 'psychiatry' ? 'الطب النفسي' : targetSpecialty === 'dermatology' ? 'الأمراض الجلدية' : targetSpecialty === 'pediatrics' ? 'طب الأطفال' : targetSpecialty === 'diet' ? 'التغذية' : targetSpecialty} غير متاحة مؤقتاً. يمكننا تحويل استشارتك إلى طبيب أسرة مؤهل يمكنه مساعدتك.`
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
                        ? `نعتذر بشدة، خدمة ${targetSpecialty === 'orthopedics' ? 'جراحة العظام' : targetSpecialty === 'psychiatry' ? 'الطب النفسي' : targetSpecialty === 'dermatology' ? 'الأمراض الجلدية' : targetSpecialty === 'pediatrics' ? 'طب الأطفال' : targetSpecialty === 'diet' ? 'التغذية' : targetSpecialty} غير متاحة حالياً، وشكواك تتطلب أخصائياً. نعتذر عن الإزعاج وقد تم إبلاغ الإدارة. سيتم التواصل معك في أقرب وقت.`
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

                // 1. Resolve prompt
                let systemPrompt = '';
                let promptVersion = 0;

                if (promptId) {
                    const promptData = await getPromptById(promptId, mode);
                    if (promptData) {
                        systemPrompt = promptData.content;
                        promptVersion = promptData.version;
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
                const CONCISE_SECTIONS = ['medications', 'allergies', 'family_history', 'social_history', 'review_of_systems'];
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
                    systemPrompt += '\n\nIMPORTANT: Respond entirely in Arabic (العربية). Use formal Arabic (فصحى) with a warm, patient-friendly tone. Transliterate any medical terms the patient may not understand.';
                } else {
                    systemPrompt += `\n\nIMPORTANT: Respond in English.`;
                }

                // 5. Sanitize
                systemPrompt = sanitizeSystemPrompt(systemPrompt);

                // 6. Prepend global guard
                const guard = await getGlobalGuard(mode);
                const finalPrompt = guard
                    ? `${guard}\n\n---\n\n${systemPrompt}`
                    : systemPrompt;

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

                        const responseText = consecutiveGibberish >= 3
                            ? "I've noticed several unclear messages. If you're having trouble, please try typing your response more carefully, or simply respond with 'yes', 'no', or a brief answer."
                            : GIBBERISH_RESPONSES[Math.floor(Math.random() * GIBBERISH_RESPONSES.length)];

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
                const openaiMessages = [
                    { role: 'system', content: finalPrompt },
                    ...trimmedHistory.map((m: { role: string; content: string }) => ({
                        role: m.role === 'patient' ? 'user' : m.role === 'ai' ? 'assistant' : m.role,
                        content: m.content,
                    })),
                ];

                // 9. Call OpenAI
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
