// ──────────────────────────────────────────
// Environment (cross-platform: Expo + Next.js)
// ──────────────────────────────────────────

// IMPORTANT: Each process.env.* reference MUST be a full static string literal.
// Expo/Metro Babel plugin replaces process.env.EXPO_PUBLIC_* at build time,
// but ONLY when the key is written out statically (not constructed dynamically).

function pickEnv(...candidates: (string | undefined)[]): string {
    for (const v of candidates) {
        if (v) return v;
    }
    return '';
}

export const ENV = {
    SUPABASE_URL: pickEnv(
        process.env.EXPO_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_URL,
    ),
    SUPABASE_ANON_KEY: pickEnv(
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        process.env.SUPABASE_ANON_KEY,
    ),
    GOOGLE_WEB_CLIENT_ID: pickEnv(
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_WEB_CLIENT_ID,
    ),
    APP_ENV: (pickEnv(
        process.env.EXPO_PUBLIC_APP_ENV,
        process.env.NEXT_PUBLIC_APP_ENV,
        process.env.APP_ENV,
    ) || 'development') as 'development' | 'staging' | 'production',
} as const;

// ──────────────────────────────────────────
// App Constants
// ──────────────────────────────────────────

export const APP = {
    NAME: 'cliniq.one',
    VERSION: '1.0.0',
    SUPPORT_EMAIL: 'support@cliniq.one',
    WEBSITE: 'https://cliniq.one',
    ADMIN_URL: 'https://admin.cliniq.one',
} as const;

// ──────────────────────────────────────────
// AI Limits
// ──────────────────────────────────────────

export const AI = {
    MAX_INTAKE_ROUNDS: 8,
    MAX_INPUT_TOKENS: 8000,
    MAX_OUTPUT_TOKENS: 4000,
    MAX_PHOTOS_PER_CONSULT: 5,
    DAILY_BUDGET_USD: 100,
    TARGET_COST_PER_CONSULT_USD: 0.15,
} as const;

// ──────────────────────────────────────────
// Consultation
// ──────────────────────────────────────────

export const CONSULT = {
    DOCTOR_RESPONSE_TARGET_MINUTES: 30,
    MAX_WAIT_HOURS: 4,
    URGENT_FEE_TOKENS: 5,       // extra tokens for urgent
    URGENT_DEADLINE_MINUTES: 15, // shorter deadline for urgent
    CLOUD_RETENTION_DAYS: 90,    // purge-eligible after this
    DOCTOR_REVENUE_SPLIT: 0.7,  // 70% to doctor
    PLATFORM_SPLIT: 0.3,        // 30% to platform
} as const;

// ──────────────────────────────────────────
// Payout
// ──────────────────────────────────────────

export const PAYOUT = {
    MIN_BALANCE_TOKENS: 400,    // 2,000 SAR
    SCHEDULE: 'monthly',        // 1st of every month
    PROCESSING_DAYS: 5,
    EARLY_FEE_PERCENT: 2,
} as const;

// ──────────────────────────────────────────
// Token Exchange Rates
// ──────────────────────────────────────────

export const EXCHANGE = {
    TOKEN_TO_SAR: 5.0,
    TOKEN_TO_USD: 1.33,
    TOKEN_TO_KWD: 0.35,
} as const;

// ──────────────────────────────────────────
// Security
// ──────────────────────────────────────────

export const SECURITY = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_MINUTES: 15,
    SESSION_TIMEOUT_MINUTES: 60,
    OTP_EXPIRY_SECONDS: 180,
    OTP_MAX_RESENDS: 3,
    PASSWORD_MIN_LENGTH: 8,
    REMEMBER_ME_DAYS: 30,
} as const;

// ──────────────────────────────────────────
// Supported Countries
// ──────────────────────────────────────────

export const COUNTRIES = [
    { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', flag: '🇸🇦', dialCode: '+966', ibanPrefix: 'SA' },
    { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', flag: '🇦🇪', dialCode: '+971', ibanPrefix: 'AE' },
    { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼', dialCode: '+965', ibanPrefix: 'KW' },
    { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭', dialCode: '+973', ibanPrefix: 'BH' },
    { code: 'QA', name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦', dialCode: '+974', ibanPrefix: 'QA' },
    { code: 'OM', name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲', dialCode: '+968', ibanPrefix: 'OM' },
] as const;

// ──────────────────────────────────────────
// Specialties
// ──────────────────────────────────────────

export const SPECIALTIES = [
    { id: 'general', label: 'General Consultation', icon: '🏥', description: 'General Medical Intake' },
    { id: 'dermatology', label: 'Dermatology', icon: '🩺', description: 'Skin, Hair & Nails' },
    { id: 'family_medicine', label: 'Family Medicine', icon: '👨‍⚕️', description: 'General Health' },
] as const;

// ──────────────────────────────────────────
// Consultation Status Labels (unified mapping for all apps)
// ──────────────────────────────────────────

export const CONSULTATION_STATUS_LABELS: Record<string, { label: string; emoji: string }> = {
    draft: { label: 'Draft', emoji: '📝' },
    intake_in_progress: { label: 'AI Intake', emoji: '🤖' },
    pending_payment: { label: 'Pending Payment', emoji: '💳' },
    submitted: { label: 'Submitted', emoji: '📤' },
    assigned: { label: 'Doctor Assigned', emoji: '👨‍⚕️' },
    in_progress: { label: 'In Progress', emoji: '🔄' },
    report_ready: { label: 'Report Ready', emoji: '📋' },
    completed: { label: 'Completed', emoji: '✅' },
    cancelled: { label: 'Cancelled', emoji: '❌' },
};
