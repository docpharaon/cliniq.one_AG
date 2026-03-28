// ─────────────────────────────────────────────────
// AI Service — Calls Supabase Edge Function for AI intake
// ─────────────────────────────────────────────────
import { supabase, safeFetch } from '@cliniqone/api';

// ── Types ───────────────────────────────────────

export interface ConcernAnalysis {
    specialty: 'dermatology' | 'family_medicine' | null;
    category: string;
    urgency: 'routine' | 'urgent' | 'emergency';
    keywords: string[];
    confidence: number;
    reasoning: string;
}

export interface AIQuestion {
    question: string;
    options?: string[];
    type: 'multiple_choice' | 'free_text' | 'yes_no';
    required: boolean;
    helperText?: string;
}

export interface QAAnalysis {
    summary: string;
    keyFindings: string[];
    redFlags: string[];
    hpi: string;
    pmh: string;
    medications: string[];
    allergies: string[];
    socialHistory: string;
    familyHistory: string;
    assessment: string;
    recommendedSpecialty: string;
    priorityLevel: string;
    suggestedWorkup: string[];
    preliminaryDiagnosis: { diagnosis: string; likelihood: string; reasoning: string }[];
    recommendedTreatment: string[];
    patientEducation: string[];
    followUp: string;
}

export interface DetectedMedication {
    name: string;
    genericName?: string;
    dose?: string;
    unit?: string;
    frequency?: string;
    route?: string;
    indication?: string;
    confidence: number;
}

// ── Sequence Node (from admin) ──────────────────
export interface SequenceNode {
    id: string;
    sequence_id: string;
    step_key: string;
    label: string;
    emoji: string;
    prompt_id: string | null;
    sort_order: number;
    parent_node_id: string | null;
    pathway_condition: string | null;
    gender_condition: string | null;
    // Joined prompt content
    ai_prompts: {
        id: string;
        name: string;
        prompt_type: string;
        content: string;
        is_active: boolean;
        version: number;
    } | null;
}

// ── Interview Sections (legacy fallback) ────────
export const INTERVIEW_SECTIONS = [
    { id: 'hpi', label: 'History of Present Illness', progress: [20, 35] },
    { id: 'pmh', label: 'Past Medical History', progress: [35, 45] },
    { id: 'medications', label: 'Medications', progress: [45, 55] },
    { id: 'allergies', label: 'Allergies', progress: [55, 65] },
    { id: 'family_history', label: 'Family History', progress: [65, 75] },
    { id: 'social_history', label: 'Social History', progress: [75, 85] },
    { id: 'review_of_systems', label: 'Review of Systems', progress: [85, 92] },
    { id: 'physical_exam', label: 'Physical Examination', progress: [92, 98] },
] as const;

export type SectionId = typeof INTERVIEW_SECTIONS[number]['id'];

// ── Timeout & Retry Config ──────────────────────
const AI_CALL_TIMEOUT_MS = 25_000;  // 25 seconds
const MAX_RETRIES = 1;              // 1 automatic retry before surfacing error

/** Typed error so the UI can distinguish timeouts from other failures */
export class AITimeoutError extends Error {
    constructor() {
        super('AI response timed out');
        this.name = 'AITimeoutError';
    }
}

// ── Edge Function Caller ────────────────────────

async function callAI<T>(action: string, payload: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), AI_CALL_TIMEOUT_MS);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const { data: fnData, error: fnError } = await supabase.functions.invoke('ai-intake', {
                body: { action, ...payload },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            clearTimeout(timer);

            if (fnError) {
                throw new Error(fnError.message || 'Edge function error');
            }
            if (fnData?.error) {
                throw new Error(fnData.error);
            }
            return fnData as T;
        } catch (err: any) {
            clearTimeout(timer);

            const isTimeout = err?.name === 'AbortError' ||
                err?.message?.includes('timed out') ||
                err?.message?.includes('aborted');
            const isNetworkError = err?.message?.includes('Failed to fetch') ||
                err?.message?.includes('NetworkError') ||
                err?.message?.includes('network');

            // Retry on timeout or network errors (not on logical errors)
            if ((isTimeout || isNetworkError) && attempt < MAX_RETRIES) {
                console.warn(`AI call attempt ${attempt + 1} failed (${isTimeout ? 'timeout' : 'network'}), retrying in 2s...`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            // Final failure
            if (isTimeout) throw new AITimeoutError();
            throw err;
        }
    }

    // Should never reach here, but TypeScript needs it
    throw new AITimeoutError();
}

// ── Check if AI Chatbot is enabled by admin ─────
export async function checkChatbotEnabled(): Promise<boolean> {
    try {
        const { data, error } = await safeFetch(
            () => supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'ai_chatbot_enabled')
                .maybeSingle(),
            { timeout: 5000, retries: 0, label: 'checkChatbotEnabled' },
        );
        // Only disable if we got a definitive 'false' from the database
        // On errors or missing data, default to ENABLED (don't block patients)
        if (error || !data) return true;
        return data.value !== 'false';
    } catch {
        // Network/auth errors should NOT disable the chatbot
        return true;
    }
}

// ── Fetch Chatbot Version from Admin Config ─────
export async function fetchChatbotVersion(): Promise<string> {
    try {
        const { data, error } = await safeFetch(
            () => supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'chatbot_version')
                .maybeSingle(),
            { timeout: 5000, retries: 0, label: 'fetchChatbotVersion' },
        );
        if (error || !data) return '';
        return `v${data.value}`;
    } catch {
        return '';
    }
}

// ── Fetch Protocol Config from Admin Settings ───
export async function fetchProtocolConfig(): Promise<Record<string, unknown>> {
    try {
        const keys = [
            'protocol_emergency_keywords_en',
            'protocol_emergency_keywords_ar',
            'protocol_refusal_keywords',
            'protocol_escalation_thresholds',
            'protocol_cooldown_seconds',
        ];
        const { data, error } = await safeFetch(
            () => supabase
                .from('platform_settings')
                .select('key, value')
                .in('key', keys),
            { timeout: 5000, retries: 0, label: 'fetchProtocolConfig' },
        );

        if (error || !data || data.length === 0) return {};

        const config: Record<string, unknown> = {};
        for (const row of data) {
            try {
                if (row.key === 'protocol_emergency_keywords_en') {
                    config.emergencyKeywordsEn = JSON.parse(row.value);
                } else if (row.key === 'protocol_emergency_keywords_ar') {
                    config.emergencyKeywordsAr = JSON.parse(row.value);
                } else if (row.key === 'protocol_refusal_keywords') {
                    config.refusalKeywords = JSON.parse(row.value);
                } else if (row.key === 'protocol_escalation_thresholds') {
                    config.escalationThresholds = JSON.parse(row.value);
                } else if (row.key === 'protocol_cooldown_seconds') {
                    config.cooldownSeconds = parseInt(row.value, 10);
                }
            } catch { /* skip malformed JSON */ }
        }
        return config;
    } catch {
        return {};
    }
}

// ── Log Protocol Event (for staff review) ───────
export async function logProtocolEvent(params: {
    patientId: string;
    consultationId?: string;
    protocolCode: string;
    severity: string;
    triggerText: string;
    actionTaken: string;
}): Promise<void> {
    try {
        await safeFetch(
            () => supabase.from('protocol_logs').insert({
                patient_id: params.patientId,
                consultation_id: params.consultationId || null,
                protocol_code: params.protocolCode,
                severity: params.severity,
                trigger_text: params.triggerText,
                action_taken: params.actionTaken,
                resolved: false,
            }),
            { timeout: 5000, retries: 0, label: 'logProtocolEvent' },
        );
    } catch (err) {
        console.error('Failed to log protocol event:', err);
    }
}

// ── Fetch Active Sequence from Admin Config ─────
export async function fetchDefaultSequence(): Promise<SequenceNode[]> {
    try {
        // 1. First try the admin-configured active sequence ID
        const { data: setting } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'ai_active_sequence_id')
            .single();

        if (setting?.value) {
            const nodes = await fetchSequenceNodes(setting.value);
            if (nodes.length > 0) return nodes;
        }

        // 2. Fallback: get the default sequence
        const { data: seq, error: seqErr } = await supabase
            .from('prompt_sequences')
            .select('id')
            .eq('is_default', true)
            .single();

        if (seqErr || !seq) {
            // 3. Fallback: get the first sequence
            const { data: fallback } = await supabase
                .from('prompt_sequences')
                .select('id')
                .order('created_at')
                .limit(1)
                .single();
            if (!fallback) return [];

            return fetchSequenceNodes(fallback.id);
        }

        return fetchSequenceNodes(seq.id);
    } catch (err) {
        console.error('Failed to fetch default sequence:', err);
        return [];
    }
}

// ── Fetch Sequence by Specialty ──────────────────
// Used when a patient pre-selects a doctor with a mapped specialty (e.g. orthopedics, psychiatry).
// Falls back to the default sequence if none found.
export async function fetchSequenceBySpecialty(specialty: string): Promise<SequenceNode[]> {
    try {
        const { data: seq, error } = await supabase
            .from('prompt_sequences')
            .select('id')
            .eq('specialty', specialty)
            .limit(1)
            .maybeSingle();

        if (error || !seq) {
            console.warn(`No sequence found for specialty "${specialty}", falling back to default`);
            return fetchDefaultSequence();
        }

        const nodes = await fetchSequenceNodes(seq.id);
        if (nodes.length === 0) {
            return fetchDefaultSequence();
        }
        return nodes;
    } catch (err) {
        console.error('Failed to fetch sequence by specialty:', err);
        return fetchDefaultSequence();
    }
}

async function fetchSequenceNodes(sequenceId: string): Promise<SequenceNode[]> {
    const { data: nodes, error } = await safeFetch(
        () => supabase
            .from('prompt_sequence_nodes')
            .select('*, ai_prompts(id, name, prompt_type, content, is_active, version)')
            .eq('sequence_id', sequenceId)
            .order('sort_order'),
        { timeout: 8000, retries: 1, label: 'fetchSequenceNodes' },
    );

    if (error) {
        console.error('Failed to fetch sequence nodes:', error.message);
        return [];
    }

    return (nodes ?? []) as unknown as SequenceNode[];
}

// ── Sequence-Driven Chat ────────────────────────
export async function chatWithSequence(
    systemPrompt: string,
    conversationHistory: { role: string; content: string }[],
    language: 'en' | 'ar' = 'en',
): Promise<string> {
    // Append language instruction to the system prompt
    const promptWithLanguage = `${systemPrompt}\n\nIMPORTANT: Respond in ${language === 'ar' ? 'Arabic' : 'English'}.`;

    const result = await callAI<{ response: string }>('chat', {
        systemPrompt: promptWithLanguage,
        conversationHistory,
        maxTokens: 1000,
    });

    return result.response;
}

// ── Unified Chat Section (server-side prompt resolution) ──
export interface ChatSectionResult {
    response: string;
    sectionComplete: boolean;
    addendumDone?: boolean;
    violation: string | null;
    promptVersion: number;
    chatbotVersion: string;
}

/**
 * Calls the unified `chat-section` action on the edge function.
 * All prompt resolution, behavioral rules, global guard, violation detection,
 * and section-completion parsing are done server-side.
 * Patients always use mode='active' (only published prompts).
 */
export async function chatSection(params: {
    section: string;
    promptId?: string;
    conversationHistory: { role: string; content: string }[];
    language: 'en' | 'ar';
    patientContext?: string;
}): Promise<ChatSectionResult> {
    return callAI<ChatSectionResult>('chat-section', {
        ...params,
        mode: 'active',
        maxTokens: 1000,
    });
}

// ── Legacy functions (still used by fallback) ───

// 1. Analyze Concern
export async function analyzeConcern(
    concern: string,
    language: 'en' | 'ar' = 'en',
): Promise<ConcernAnalysis> {
    return callAI<ConcernAnalysis>('analyze-concern', { concern, language });
}

// 2. Generate Question
export async function generateQuestion(
    concern: string,
    previousAnswers: { question: string; answer: string }[],
    section: SectionId,
    language: 'en' | 'ar' = 'en',
): Promise<AIQuestion> {
    return callAI<AIQuestion>('generate-question', {
        concern,
        previousAnswers,
        section,
        language,
    });
}

// 3. Analyze QA (Final Summary)
export async function analyzeQA(
    qaHistory: { question: string; answer: string }[],
    patientInfo: {
        nickname: string;
        yearOfBirth: number | null;
        gender: string | null;
        country: string | null;
    },
    language: 'en' | 'ar' = 'en',
): Promise<QAAnalysis> {
    return callAI<QAAnalysis>('analyze-qa', {
        qaHistory,
        patientInfo,
        language,
    });
}

// 4. Detect Medication
export async function detectMedication(
    text: string,
): Promise<DetectedMedication[]> {
    return callAI<DetectedMedication[]>('detect-medication', { text });
}

// 5. Check if section complete (AI decides) — legacy
export async function shouldAdvanceSection(
    section: SectionId,
    answersInSection: { question: string; answer: string }[],
    concern: string,
    language: 'en' | 'ar' = 'en',
): Promise<{ complete: boolean; nextSection: SectionId | 'done' }> {
    return callAI<{ complete: boolean; nextSection: SectionId | 'done' }>(
        'check-section',
        { section, answersInSection, concern, language },
    );
}
