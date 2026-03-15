// ──────────────────────────────────────────
// Environment (cross-platform: Expo + Next.js)
// ──────────────────────────────────────────

// Helper: pick first defined env var across platform prefixes
function env(key: string): string {
    // Try EXPO_PUBLIC_ prefix (React Native / Expo)
    const expoKey = `EXPO_PUBLIC_${key}`;
    // Try NEXT_PUBLIC_ prefix (Next.js / Web)
    const nextKey = `NEXT_PUBLIC_${key}`;
    // Try bare key (server-side)

    return (
        (typeof process !== 'undefined' && process.env?.[expoKey]) ||
        (typeof process !== 'undefined' && process.env?.[nextKey]) ||
        (typeof process !== 'undefined' && process.env?.[key]) ||
        ''
    );
}

export const ENV = {
    SUPABASE_URL: env('SUPABASE_URL'),
    SUPABASE_ANON_KEY: env('SUPABASE_ANON_KEY'),
    GOOGLE_WEB_CLIENT_ID: env('GOOGLE_WEB_CLIENT_ID'),
    APP_ENV: (env('APP_ENV') || 'development') as 'development' | 'staging' | 'production',
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
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966', ibanPrefix: 'SA' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971', ibanPrefix: 'AE' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dialCode: '+965', ibanPrefix: 'KW' },
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dialCode: '+973', ibanPrefix: 'BH' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974', ibanPrefix: 'QA' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲', dialCode: '+968', ibanPrefix: 'OM' },
] as const;

// ──────────────────────────────────────────
// Specialties
// ──────────────────────────────────────────

export const SPECIALTIES = [
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
