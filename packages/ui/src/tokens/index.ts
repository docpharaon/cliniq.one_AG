/**
 * cliniq.one Design Tokens
 * 
 * Derived from the UI/UX Design Guide.
 * All apps share these tokens for visual consistency.
 * 
 * Light theme is the DEFAULT — aligned with the cliniq.one landing page
 * for brand continuity and clinical readability.
 * Dark theme is preserved for the opt-in toggle.
 */

// ──────────────────────────────────────────
// Colors — Light Theme (Default)
// ──────────────────────────────────────────

export const lightColors = {
    // Backgrounds
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F5F8FA',
    bgTertiary: '#EDF2F7',
    bgCard: '#FFFFFF',
    bgElevated: '#FFFFFF',

    // Accent — Teal (unified with landing page)
    accentTeal: '#1A8A9E',
    accentTealDark: '#157A8C',
    accentTealLight: '#2BA3B8',
    accentTealFaded: 'rgba(26, 138, 158, 0.08)',

    // Accent — Blue
    accentBlue: '#3B82F6',
    accentBlueDark: '#2563EB',
    accentBlueLight: '#60A5FA',
    accentBlueFaded: 'rgba(59, 130, 246, 0.08)',

    // Accent — Purple
    purple: '#7C3AED',
    purpleFaded: 'rgba(124, 58, 237, 0.08)',

    // Accent — Pink
    pink: '#B9568A',
    pinkFaded: 'rgba(185, 86, 138, 0.08)',

    // Accent — Gold
    gold: '#D97706',
    goldFaded: 'rgba(217, 119, 6, 0.08)',

    // Text
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',

    // Semantic
    success: '#059669',
    successFaded: 'rgba(5, 150, 105, 0.08)',
    warning: '#D97706',
    warningFaded: 'rgba(217, 119, 6, 0.08)',
    error: '#DC2626',
    errorFaded: 'rgba(220, 38, 38, 0.08)',
    info: '#2563EB',
    infoFaded: 'rgba(37, 99, 235, 0.08)',

    // Borders
    border: '#DEE5ED',
    borderFocused: '#1A8A9E',
    borderError: '#DC2626',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayLight: 'rgba(0, 0, 0, 0.15)',

    // White / Transparent
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
} as const;

// ──────────────────────────────────────────
// Colors — Dark Theme (Opt-in toggle)
// ──────────────────────────────────────────

export const darkColors = {
    // Backgrounds
    bgPrimary: '#0A0E1A',
    bgSecondary: '#111827',
    bgTertiary: '#1A2235',
    bgCard: '#1E293B',
    bgElevated: '#243044',

    // Accent — Teal
    accentTeal: '#2DD4BF',
    accentTealDark: '#14B8A6',
    accentTealLight: '#5EEAD4',
    accentTealFaded: 'rgba(45, 212, 191, 0.15)',

    // Accent — Blue
    accentBlue: '#3B82F6',
    accentBlueDark: '#2563EB',
    accentBlueLight: '#60A5FA',
    accentBlueFaded: 'rgba(59, 130, 246, 0.15)',

    // Accent — Purple
    purple: '#9B72CF',
    purpleFaded: 'rgba(155, 114, 207, 0.15)',

    // Accent — Pink
    pink: '#C98BB9',
    pinkFaded: 'rgba(201, 139, 185, 0.15)',

    // Accent — Gold
    gold: '#FFD700',
    goldFaded: 'rgba(255, 215, 0, 0.15)',

    // Text
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textInverse: '#0F172A',

    // Semantic
    success: '#22C55E',
    successFaded: 'rgba(34, 197, 94, 0.15)',
    warning: '#F59E0B',
    warningFaded: 'rgba(245, 158, 11, 0.15)',
    error: '#EF4444',
    errorFaded: 'rgba(239, 68, 68, 0.15)',
    info: '#3B82F6',
    infoFaded: 'rgba(59, 130, 246, 0.15)',

    // Borders
    border: '#1E293B',
    borderFocused: '#2DD4BF',
    borderError: '#EF4444',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',

    // White / Transparent
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
} as const;

// Type for color tokens — widened so both light and dark sets satisfy the same type
export type ColorTokens = { readonly [K in keyof typeof lightColors]: string };

// Default export — light theme
export const colors: ColorTokens = lightColors;

// ──────────────────────────────────────────
// Spacing (8px grid)
// ──────────────────────────────────────────

export const spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
    '6xl': 64,
} as const;

// ──────────────────────────────────────────
// Border Radius
// ──────────────────────────────────────────

export const radius = {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    '2xl': 24,
    full: 9999,
} as const;

// ──────────────────────────────────────────
// Typography
// ──────────────────────────────────────────

export const typography = {
    h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
    h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
    h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
    h4: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
    bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    bodySm: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
    caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 14 },
    button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 20 },
    buttonSm: { fontSize: 14, fontWeight: '600' as const, lineHeight: 18 },
    label: { fontSize: 13, fontWeight: '500' as const, lineHeight: 16 },
} as const;

// ──────────────────────────────────────────
// Shadows
// ──────────────────────────────────────────

export const shadows = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    elevated: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    glow: (color: string) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    }),
} as const;

// ──────────────────────────────────────────
// Animation Durations
// ──────────────────────────────────────────

export const animation = {
    fast: 150,
    normal: 300,
    slow: 500,
    spring: { damping: 15, stiffness: 150, mass: 1 },
} as const;
