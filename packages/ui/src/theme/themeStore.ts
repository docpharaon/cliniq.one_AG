import { create } from 'zustand';
import { lightColors, darkColors, type ColorTokens } from '../tokens';

// ── Types ────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
    /** User's explicit preference */
    mode: ThemeMode;
    /** The actual resolved theme (after system preference) */
    resolvedTheme: 'light' | 'dark';
    /** Active color tokens */
    colors: ColorTokens;
    /** Whether theme has been loaded from storage */
    isReady: boolean;
    /** Set theme mode */
    setMode: (mode: ThemeMode) => void;
    /** Set system preference (called by ThemeProvider) */
    setSystemPreference: (isDark: boolean) => void;
    /** Load persisted theme from localStorage */
    initialize: () => Promise<void>;
}

const STORAGE_KEY = '@cliniqone/theme';

function resolveColors(mode: ThemeMode, systemIsDark: boolean): { resolved: 'light' | 'dark'; colors: ColorTokens } {
    const resolved = mode === 'system'
        ? (systemIsDark ? 'dark' : 'light')
        : mode;
    return {
        resolved,
        colors: resolved === 'dark' ? darkColors : lightColors,
    };
}

// ── Zustand Store ────────────────────────────────
let _systemIsDark = false;

export const useThemeStore = create<ThemeState>((set, get) => ({
    mode: 'dark',
    resolvedTheme: 'dark',
    colors: darkColors,
    isReady: false,

    setMode: (mode: ThemeMode) => {
        const { resolved, colors } = resolveColors(mode, _systemIsDark);
        set({ mode, resolvedTheme: resolved, colors });

        // Persist to localStorage (fire-and-forget)
        try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
    },

    setSystemPreference: (isDark: boolean) => {
        _systemIsDark = isDark;
        const { mode } = get();
        if (mode === 'system') {
            const { resolved, colors } = resolveColors(mode, isDark);
            set({ resolvedTheme: resolved, colors });
        }
    },

    initialize: async () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const mode = (stored === 'light' || stored === 'dark' || stored === 'system')
                ? stored as ThemeMode
                : 'dark'; // default to dark
            const { resolved, colors } = resolveColors(mode, _systemIsDark);
            set({ mode, resolvedTheme: resolved, colors, isReady: true });
        } catch {
            set({ isReady: true }); // Fail gracefully, use defaults
        }
    },
}));
