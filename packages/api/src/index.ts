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
    signOut,
    resetPassword,
    getSession,
    getCurrentUserRole,
    getUserProfile,
    updateUserProfile,
    acceptLegalTerms,
    requestKycToken,
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
} from './admin';
