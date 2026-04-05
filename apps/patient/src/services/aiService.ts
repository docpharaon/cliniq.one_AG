// ─────────────────────────────────────────────────
// AI Service — Calls Supabase Edge Function for AI intake
// ─────────────────────────────────────────────────
import { supabase, safeFetch } from '@cliniqone/api';

// ── Types ───────────────────────────────────────

export interface ConcernAnalysis {
    specialty: 'dermatology' | 'family_medicine' | 'psychiatry' | 'orthopedics' | 'pediatrics' | 'diet' | null;
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
    specialty_condition: string | null;
    node_type: 'chat' | 'system_gate' | 'system_analysis' | 'system_integrity' | 'system_classify' | 'system_extract' | 'system_upload';
    max_turns: number | null;
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

// ── Sequence result with metadata ───────────────
export interface SequenceResult {
    nodes: SequenceNode[];
    sequenceId: string | null;
    sequenceName: string | null;
    sequenceType: string | null;
    specialty: string | null;
}

const EMPTY_SEQUENCE_RESULT: SequenceResult = { nodes: [], sequenceId: null, sequenceName: null, sequenceType: null, specialty: null };

// ── Locum Doctor (resolved from code) ───────────
export interface LocumDoctor {
    id: string;
    display_name: string;
    specialty: string;
    locum_code: string;
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
        if (error || !data) return true;
        return data.value !== 'false';
    } catch {
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

// ── Fetch Active Sequence from Admin Config (LEGACY FALLBACK) ─────
// In three-phase model, prefer fetchSequenceByType('global_intake') instead.
export async function fetchDefaultSequence(): Promise<SequenceResult> {
    try {
        // 1. First try the admin-configured active sequence ID
        const { data: setting } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'ai_active_sequence_id')
            .single();

        if (setting?.value) {
            const { data: seqRow } = await supabase
                .from('prompt_sequences')
                .select('id, name, sequence_type, specialty')
                .eq('id', setting.value)
                .single();
            const nodes = await fetchSequenceNodes(setting.value);
            if (nodes.length > 0) return {
                nodes,
                sequenceId: seqRow?.id || setting.value,
                sequenceName: seqRow?.name || 'Admin Active Sequence',
                sequenceType: seqRow?.sequence_type || 'legacy',
                specialty: seqRow?.specialty || null,
            };
        }

        // 2. Fallback: get the default sequence
        const { data: seq, error: seqErr } = await supabase
            .from('prompt_sequences')
            .select('id, name, sequence_type, specialty')
            .eq('is_default', true)
            .single();

        if (seqErr || !seq) {
            // 3. Fallback: get the first sequence
            const { data: fallback } = await supabase
                .from('prompt_sequences')
                .select('id, name, sequence_type, specialty')
                .order('created_at')
                .limit(1)
                .single();
            if (!fallback) return EMPTY_SEQUENCE_RESULT;

            const nodes = await fetchSequenceNodes(fallback.id);
            return { nodes, sequenceId: fallback.id, sequenceName: fallback.name, sequenceType: fallback.sequence_type, specialty: fallback.specialty };
        }

        const nodes = await fetchSequenceNodes(seq.id);
        return { nodes, sequenceId: seq.id, sequenceName: seq.name, sequenceType: seq.sequence_type, specialty: seq.specialty };
    } catch (err) {
        console.error('Failed to fetch default sequence:', err);
        return EMPTY_SEQUENCE_RESULT;
    }
}

// ── Filter Nodes by Specialty ──────────────────────
// In the unified flow, we don't fetch a separate sequence per specialty.
// Instead, we filter the unified sequence's nodes by specialty_condition.
export function filterNodesBySpecialty(allNodes: SequenceNode[], specialty: string): SequenceNode[] {
    return allNodes.filter(n =>
        !n.specialty_condition || // global nodes (null/empty) always included
        n.specialty_condition === specialty
    );
}

// ── Analyze Integrity (Chat Quality Report) ─────────
export interface IntegrityReport {
    integrityScore: number;
    fluidityScore: number;
    completeness: {
        overall: number;
        perSection: Record<string, { score: 'HIGH' | 'MEDIUM' | 'LOW'; notes: string }>;
    };
    timing: {
        totalMinutes: number;
        avgResponseTimeSec: number;
        slowestSection: string;
        fastestSection: string;
    };
    redFlags: string[];
    interruptionCount: number;
    violationSummary: { total: number; types: Record<string, number> };
    doctorConfidenceBadge: 'HIGH' | 'MEDIUM' | 'LOW';
    adminNotes: string;
}

export async function analyzeIntegrity(params: {
    conversationHistory: { role: string; content: string }[];
    sectionTimings: Record<string, { startedAt: string; completedAt: string; turnCount: number }>;
    metadata: {
        totalDurationMs: number;
        interruptions: number;
        pathway: string;
        detectedSpecialty: string;
        strikeCount: number;
        violationTypes: string[];
    };
}): Promise<IntegrityReport> {
    return callAI<IntegrityReport>('analyze-integrity', params);
}

// ── Drug Label Analysis (Vision API OCR) ────────
export interface DrugLabelAnalysis {
    extracted: {
        drugName: string;
        dosage: string;
        form: string;
        manufacturer: string;
        batchNumber: string | null;
        expiryDate: string | null;
        additionalInfo: string | null;
    };
    crossValidation: {
        nameMatch: boolean;
        dosageMatch: boolean;
        overallMatch: 'match' | 'partial_match' | 'mismatch' | 'unable_to_read';
        discrepancies: string[];
    };
    confidence: number;
    processingNote: string;
}

export async function analyzeDrugLabel(
    imageBase64: string,
    statedMedication: string,
    statedDosage: string = '',
    language: 'en' | 'ar' = 'en',
): Promise<DrugLabelAnalysis> {
    return callAI<DrugLabelAnalysis>('analyze-drug-label', {
        imageBase64,
        statedMedication,
        statedDosage,
        language,
    });
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

// ── Specialty Gate (Temporary Disable Check) ────
//
// Called after analyze-concern to check if the target
// specialty is temporarily disabled. Determines routing:
//   allowed     → proceed normally
//   silent      → silently use family_medicine
//   announced   → show patient message with FM fallback
//   blocked     → specialty unavailable, no fallback

export interface SpecialtyGateResult {
    allowed: boolean;
    specialty?: string;
    // Redirect fields (when allowed = false, redirected = true)
    redirected?: boolean;
    mode?: 'silent' | 'announced';
    fallback?: 'family_medicine' | null;
    originalSpecialty?: string;
    adminReason?: string;
    patientMessage?: string;
    reasonText?: string;
    // Block fields (when blocked = true — FM cannot handle)
    blocked?: boolean;
    apologyMessage?: string;
    riskLevel?: 'low' | 'medium' | 'high';
}

export async function checkSpecialtyGate(
    specialty: string,
    concern: string,
    language: 'en' | 'ar' = 'en',
): Promise<SpecialtyGateResult> {
    try {
        return await callAI<SpecialtyGateResult>('check-specialty-gate', {
            specialty,
            concern,
            language,
        });
    } catch (err) {
        // On error, fail open — allow the specialty through
        // so the patient can proceed (better than being blocked)
        console.error('Specialty gate check failed, allowing through:', err);
        return { allowed: true, specialty };
    }
}

// ── Resolve Locum Doctor Code ───────────────────
// Called when patient enters a doctor code on IntakeIndexPage
export interface ResolveLocumResult {
    found: boolean;
    doctor?: LocumDoctor;
    greetingPrompt?: string;
}

export async function resolveLocum(
    code: string,
): Promise<ResolveLocumResult> {
    try {
        return await callAI<ResolveLocumResult>('resolve-locum', { code });
    } catch (err) {
        console.error('Locum resolution failed:', err);
        return { found: false };
    }
}

// ── Three-Phase Sequence Model (Option C) ───────
// Fetch a sequence by its type (global_intake, global_wrapup, specialty, refill, followup)
// Returns full metadata for sequence tracking
export async function fetchSequenceByType(
    sequenceType: 'global_intake' | 'global_wrapup' | 'specialty' | 'refill' | 'followup',
    specialty?: string,
): Promise<SequenceResult> {
    try {
        let query = supabase
            .from('prompt_sequences')
            .select('id, name, sequence_type, specialty')
            .eq('sequence_type', sequenceType);

        if (sequenceType === 'specialty' && specialty) {
            query = query.eq('specialty', specialty);
        }

        const { data: seq, error } = await query.limit(1).maybeSingle();

        if (error || !seq) {
            console.warn(`[fetchSequenceByType] No sequence found for type="${sequenceType}" specialty="${specialty || 'none'}"`);
            return EMPTY_SEQUENCE_RESULT;
        }

        const nodes = await fetchSequenceNodes(seq.id);
        return {
            nodes,
            sequenceId: seq.id,
            sequenceName: seq.name,
            sequenceType: seq.sequence_type,
            specialty: seq.specialty,
        };
    } catch (err) {
        console.error('[fetchSequenceByType] Error:', err);
        return EMPTY_SEQUENCE_RESULT;
    }
}

// ── Classify Pathway (Silent AI — Node ③) ───────
// Determines if the patient needs: new_visit / refill / follow_up
export interface PathwayClassification {
    pathway: 'new_visit' | 'refill' | 'follow_up';
    confidence: number;
    reasoning: string;
}

export async function classifyPathway(
    conversationHistory: { role: string; content: string }[],
    language: 'en' | 'ar' = 'en',
): Promise<PathwayClassification> {
    try {
        return await callAI<PathwayClassification>('classify-pathway', {
            conversationHistory,
            language,
        });
    } catch (err) {
        console.error('Pathway classification failed, defaulting to new_visit:', err);
        return { pathway: 'new_visit', confidence: 0, reasoning: 'Classification failed' };
    }
}

// ── AI-Verified Medical Report Analysis ─────────
// Uses OpenAI Vision API to verify document integrity, extract context,
// validate dates, and generate a structured report for the doctor.

export interface ReportAnalysis {
    isValidDocument: boolean;
    documentType: 'lab' | 'imaging' | 'pathology' | 'prescription' | 'psychiatric_evaluation' |
        'therapy_notes' | 'growth_chart' | 'vaccination' | 'body_composition' |
        'surgical_report' | 'previous_report' | 'general' | 'unknown';
    documentDate: string | null;
    dateRelevance: 'current' | 'recent' | 'outdated' | 'unknown';
    documentLanguage: 'en' | 'ar' | 'other';
    extractedData: {
        title: string;
        institution: string | null;
        orderingPhysician: string | null;
        patientName: string | null;
        keyFindings: string[];
        values: { name: string; value: string; unit: string; reference: string; flag: 'normal' | 'high' | 'low' | 'critical' | 'unknown' }[];
        diagnoses: string[];
        recommendations: string[];
    };
    summary: string;
    confidence: number;
    rejectionReason: string | null;
}

export async function analyzeReport(
    imageBase64: string,
    reportType: string,
    specialty: string,
    language: 'en' | 'ar' = 'en',
    uploadId?: string,
): Promise<ReportAnalysis> {
    return callAI<ReportAnalysis>('analyze-report', {
        imageBase64,
        reportType,
        specialty,
        language,
        uploadId,
    });
}

