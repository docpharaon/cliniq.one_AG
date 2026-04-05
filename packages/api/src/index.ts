// ── Async Resilience ──
export { withTimeout, withRetry, safeFetch, sleep } from './async';
export type { RetryOptions, SafeFetchOptions } from './async';

// ── Client ──
export { supabase, getSupabase } from './client';

// ── Auth ──
export {
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    getSession,
    getCurrentUserRole,
    getUserProfile,
    updateUserProfile,
    acceptLegalTerms,
    requestKycToken,
    ensureUserProfile,
} from './auth';

// ── Consultations (Patient) ──
export {
    getConsultations,
    getConsultation,
    createConsultation,
    getMessages,
    sendMessage,
    getTokenHistory,
    subscribeToConsultation,
    subscribeToMessages,
    saveIntakeSession,
    getActiveIntakeSession,
    deleteIntakeSession,
    lookupDoctorByCode,
    searchDoctorsForPatient,
    requestPatientRefund,
    getPatientRefundRequests,
} from './consultations';

// ── Doctor ──
export {
    getDoctorProfile,
    updateDoctorProfile,
    toggleDoctorAccepting,
    getDoctorConsultations,
    getPendingConsultations,
    claimConsultation,
    updateConsultationStatus,
    submitReport,
    getDoctorStats,
    getConsultationForDoctor,
    createInterventionOrder,
    createDoctorInquiry,
    getDoctorInquiries,
    getPatientPendingInquiries,
    submitInquiryResponse,
    requestDoctorRefund,
    getDoctorRefundRequests,
    hasRefundPending,
} from './doctor';

// ── Admin ──
export {
    getAllUsers,
    adminUpdateUser,
    getAllDoctors,
    createDoctor,
    verifyDoctor,
    updateDoctorStatus,
    getAllConsultations,
    forceAssignConsultation,
    grantTokens,
    getAllTokenTransactions,
    getProtocolLogs,
    resolveProtocolLog,
    getPlatformStats,
    getKycStats,
    getAppSetting,
    setAppSetting,
    adminExemptUser,
    adminResetKyc,
    getKycUsers,
    getAllRefundRequests,
    reviewRefundRequest,
    createAdminRefund,
    processRefund,
    getRefundStats,
} from './admin';

// ── Doctor Applications ──
export {
    getMyApplication,
    getMyApplicationWithDocs,
    createApplication,
    updateApplication,
    uploadApplicationDocument,
    removeApplicationDocument,
    getApplicationDocuments,
    acceptDisclaimer,
    submitApplication,
    resubmitApplication,
    getDocumentUrl,
    getMyApplicationAudit,
} from './applications';
export type { ApplicationData, ApplicationDocument, DoctorApplication } from './applications';

// ── Voice (Transcription) ──
export {
    transcribeAudio,
    getVoiceConfig,
    TranscriptionError,
    VoiceDisabledError,
} from './voice';
export type { VoiceConfig, TranscriptionResult } from './voice';
