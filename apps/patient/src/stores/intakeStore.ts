import { create } from 'zustand';
import type { SectionId, SequenceNode, LocumDoctor } from '../services/aiService';

// ── Specialty → Pathway Mapping ─────────────────
// When a patient selects a doctor with one of these specialties,
// the intake flow forces the corresponding pathway (skipping AI detection).
export const SPECIALTY_PATHWAY_MAP: Record<string, string> = {
    psychiatry: 'psychiatry_general',
    orthopedics: 'orthopedics_general',
};

// ── Chat Message Type ───────────────────────────
export interface ChatMessage {
    id: string;
    role: 'ai' | 'patient' | 'system';
    content: string;
    timestamp: number;
    /** For AI messages that offer quick-reply options */
    options?: string[];
    /** Question type for AI questions */
    questionType?: 'multiple_choice' | 'free_text' | 'yes_no';
    /** Section label shown above the message */
    sectionLabel?: string;
    /** Photo URIs attached to this message (for skin photo capture) */
    imageUrls?: string[];
    /** Body location label for this photo */
    bodyLocation?: string;
}

/** Shape of the snapshot saved to / restored from the database */
export interface IntakeSnapshot {
    messages: ChatMessage[];
    currentNodeIndex: number;
    activePathway: string | null;
    qaHistory: { question: string; answer: string }[];
    progressPercent: number;
    sequenceNodes: SequenceNode[];
    chiefComplaint: string;
    specialty: string;
    protocolFlags: string[];
    gibberishCount: number;
    medications: string[];
    allergies: string[];
    patientAddendum: string | null;
    conversationHistory: { role: string; content: string }[];
    sectionTurnCount: number;
}

interface IntakeState {
    // Session persistence
    sessionId: string | null;

    // Flow state
    specialty: string;
    chiefComplaint: string;
    photos: string[]; // local URIs or data URLs

    // Chat state
    messages: ChatMessage[];
    currentSection: SectionId; // legacy fallback
    progressPercent: number;
    isAiTyping: boolean;
    protocolFlags: string[];
    gibberishCount: number;

    // Error/retry state
    lastFailedMessage: string | null;
    aiErrorType: 'timeout' | 'error' | null;

    // Sequence-driven state
    sequenceNodes: SequenceNode[];
    currentNodeIndex: number;
    activePathway: string | null;

    // QA tracking (for AI analysis)
    qaHistory: { question: string; answer: string }[];

    // Final AI summary
    aiSummary: Record<string, unknown> | null;

    // Patient addendum from final review step
    patientAddendum: string | null;

    // Extracted data from chat
    medications: string[];
    allergies: string[];

    // Doctor selection
    requestedDoctorId: string | null;
    doctorSelectionMethod: 'code' | 'qr' | 'search' | 'favorites' | 'auto' | null;
    requestedDoctorFee: number | null;
    requestedDoctorSpecialty: string | null;

    // Medication verification (ephemeral — not persisted in snapshot)
    medicationVerifications: Record<string, unknown>[];
    drugLabelAnalyses: Record<string, unknown>[];

    // Photo body location labels (maps photo URI → body part)
    photoBodyLocations: Record<string, string>;

    // Locum doctor (from code entry on IntakeIndexPage)
    locumDoctor: LocumDoctor | null;
    locumGreetingPrompt: string | null;

    // ── Actions ─────────────────────────────────
    setSessionId: (id: string | null) => void;
    setSpecialty: (specialty: string) => void;
    setChiefComplaint: (complaint: string) => void;
    addPhoto: (uri: string) => void;
    removePhoto: (uri: string) => void;

    // Chat actions
    addMessage: (msg: ChatMessage) => void;
    setSection: (section: SectionId) => void;
    setProgress: (percent: number) => void;
    setAiTyping: (typing: boolean) => void;
    addProtocolFlag: (flag: string) => void;
    incrementGibberish: () => void;
    resetGibberish: () => void;
    addQA: (question: string, answer: string) => void;
    setAiSummary: (summary: Record<string, unknown>) => void;
    setPatientAddendum: (addendum: string) => void;
    setMedications: (meds: string[]) => void;
    setAllergies: (allergies: string[]) => void;
    setRequestedDoctor: (doctorId: string | null, method: 'code' | 'qr' | 'search' | 'favorites' | 'auto' | null, fee?: number | null, specialty?: string | null) => void;
    setLocumDoctor: (doctor: LocumDoctor | null, greetingPrompt?: string | null) => void;

    // Error/retry actions
    setAiError: (errorType: 'timeout' | 'error', failedMessage: string | null) => void;
    clearAiError: () => void;

    // Sequence actions
    setSequenceNodes: (nodes: SequenceNode[]) => void;
    setCurrentNodeIndex: (index: number) => void;
    setActivePathway: (pathway: string | null) => void;

    // Medication verification actions
    setMedicationVerifications: (verifications: Record<string, unknown>[]) => void;
    addDrugLabelAnalysis: (analysis: Record<string, unknown>) => void;
    clearDrugLabelAnalyses: () => void;

    // Photo body location actions
    setPhotoBodyLocation: (photoUri: string, bodyLocation: string) => void;

    // Session persistence
    restoreFromSnapshot: (sessionId: string, snapshot: IntakeSnapshot) => void;

    reset: () => void;
}

const initialState = {
    sessionId: null as string | null,
    specialty: '',
    chiefComplaint: '',
    photos: [] as string[],
    messages: [] as ChatMessage[],
    currentSection: 'hpi' as SectionId,
    progressPercent: 0,
    isAiTyping: false,
    protocolFlags: [] as string[],
    gibberishCount: 0,
    lastFailedMessage: null as string | null,
    aiErrorType: null as 'timeout' | 'error' | null,
    sequenceNodes: [] as SequenceNode[],
    currentNodeIndex: 0,
    activePathway: null as string | null,
    qaHistory: [] as { question: string; answer: string }[],
    aiSummary: null as Record<string, unknown> | null,
    patientAddendum: null as string | null,
    medications: [] as string[],
    allergies: [] as string[],
    requestedDoctorId: null as string | null,
    doctorSelectionMethod: null as 'code' | 'qr' | 'search' | 'favorites' | 'auto' | null,
    requestedDoctorFee: null as number | null,
    requestedDoctorSpecialty: null as string | null,
    medicationVerifications: [] as Record<string, unknown>[],
    drugLabelAnalyses: [] as Record<string, unknown>[],
    photoBodyLocations: {} as Record<string, string>,
    locumDoctor: null as LocumDoctor | null,
    locumGreetingPrompt: null as string | null,
};

export const useIntakeStore = create<IntakeState>((set) => ({
    ...initialState,

    setSessionId: (sessionId) => set({ sessionId }),
    setSpecialty: (specialty) => set({ specialty }),
    setChiefComplaint: (chiefComplaint) => set({ chiefComplaint }),

    addPhoto: (uri) => set((s) => ({ photos: [...s.photos, uri] })),
    removePhoto: (uri) => set((s) => ({ photos: s.photos.filter((p) => p !== uri) })),

    // Chat
    addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
    setSection: (section) => set({ currentSection: section }),
    setProgress: (percent) => set({ progressPercent: percent }),
    setAiTyping: (typing) => set({ isAiTyping: typing }),
    addProtocolFlag: (flag) => set((s) => ({
        protocolFlags: [...s.protocolFlags, flag],
    })),
    incrementGibberish: () => set((s) => ({ gibberishCount: s.gibberishCount + 1 })),
    resetGibberish: () => set({ gibberishCount: 0 }),
    addQA: (question, answer) => set((s) => ({
        qaHistory: [...s.qaHistory, { question, answer }],
    })),
    setAiSummary: (summary) => set({ aiSummary: summary }),
    setPatientAddendum: (patientAddendum) => set({ patientAddendum }),
    setMedications: (medications) => set({ medications }),
    setAllergies: (allergies) => set({ allergies }),
    setRequestedDoctor: (requestedDoctorId, doctorSelectionMethod, requestedDoctorFee = null, requestedDoctorSpecialty = null) => set({ requestedDoctorId, doctorSelectionMethod, requestedDoctorFee, requestedDoctorSpecialty }),
    setLocumDoctor: (locumDoctor, locumGreetingPrompt = null) => set({ locumDoctor, locumGreetingPrompt }),

    // Error/retry
    setAiError: (aiErrorType, lastFailedMessage) => set({ aiErrorType, lastFailedMessage, isAiTyping: false }),
    clearAiError: () => set({ aiErrorType: null, lastFailedMessage: null }),

    // Sequence
    setSequenceNodes: (sequenceNodes) => set({ sequenceNodes }),
    setCurrentNodeIndex: (currentNodeIndex) => set({ currentNodeIndex }),
    setActivePathway: (activePathway) => set({ activePathway }),

    // Medication verification (ephemeral)
    setMedicationVerifications: (medicationVerifications) => set({ medicationVerifications }),
    addDrugLabelAnalysis: (analysis) => set((s) => ({
        drugLabelAnalyses: [...s.drugLabelAnalyses, analysis],
    })),
    clearDrugLabelAnalyses: () => set({ drugLabelAnalyses: [] }),

    // Photo body location labels
    setPhotoBodyLocation: (photoUri, bodyLocation) => set((s) => ({
        photoBodyLocations: { ...s.photoBodyLocations, [photoUri]: bodyLocation },
    })),

    // Session persistence — restore all state from a saved snapshot
    restoreFromSnapshot: (sessionId, snapshot) => set({
        sessionId,
        messages: snapshot.messages || [],
        currentNodeIndex: snapshot.currentNodeIndex ?? 0,
        activePathway: snapshot.activePathway ?? null,
        qaHistory: snapshot.qaHistory || [],
        progressPercent: snapshot.progressPercent ?? 0,
        sequenceNodes: snapshot.sequenceNodes || [],
        chiefComplaint: snapshot.chiefComplaint || '',
        specialty: snapshot.specialty || 'dermatology',
        protocolFlags: snapshot.protocolFlags || [],
        gibberishCount: snapshot.gibberishCount ?? 0,
        medications: snapshot.medications || [],
        allergies: snapshot.allergies || [],
        isAiTyping: false,
        lastFailedMessage: null,
        aiErrorType: null,
    }),

    reset: () => set(initialState),
}));

/** Build a snapshot of the current state for saving to the database.
 *  Called from ai-chat which also has access to local state like conversationHistory. */
export function buildSnapshot(
    state: IntakeState,
    extra: { conversationHistory: { role: string; content: string }[]; sectionTurnCount: number },
): IntakeSnapshot {
    return {
        messages: state.messages,
        currentNodeIndex: state.currentNodeIndex,
        activePathway: state.activePathway,
        qaHistory: state.qaHistory,
        progressPercent: state.progressPercent,
        sequenceNodes: state.sequenceNodes,
        chiefComplaint: state.chiefComplaint,
        specialty: state.specialty,
        protocolFlags: state.protocolFlags,
        gibberishCount: state.gibberishCount,
        medications: state.medications,
        allergies: state.allergies,
        patientAddendum: state.patientAddendum,
        conversationHistory: extra.conversationHistory,
        sectionTurnCount: extra.sectionTurnCount,
    };
}
