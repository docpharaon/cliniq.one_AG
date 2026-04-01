import React, { useEffect } from 'react';
import { useThemeStore, type ThemeMode } from './themeStore';
import type { ColorTokens } from '../tokens';

// ── useTheme Hook ────────────────────────────────
// Primary API for components to access the current theme colors.
// Automatically re-renders when theme changes.

export function useTheme() {
    const colors = useThemeStore((s) => s.colors);
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
    const mode = useThemeStore((s) => s.mode);
    const setMode = useThemeStore((s) => s.setMode);
    const isReady = useThemeStore((s) => s.isReady);

    return {
        /** Active color tokens for the current theme */
        colors,
        /** 'light' or 'dark' — the resolved theme after system preference */
        resolvedTheme,
        /** 'light', 'dark', or 'system' — user's explicit choice */
        mode,
        /** Set the theme mode */
        setMode,
        /** Whether theme has been loaded */
        isReady,
        /** Whether the current theme is dark */
        isDark: resolvedTheme === 'dark',
    };
}

// ── CSS Variable Injection ───────────────────────
// Maps theme color tokens to CSS custom properties on :root
// so existing hardcoded colors can be progressively replaced.
function applyCSSVariables(colors: ColorTokens, isDark: boolean) {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', colors.bgPrimary);
    root.style.setProperty('--bg-secondary', colors.bgSecondary);
    root.style.setProperty('--bg-tertiary', colors.bgTertiary);
    root.style.setProperty('--bg-card', colors.bgCard);
    root.style.setProperty('--bg-elevated', colors.bgElevated);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--text-tertiary', colors.textTertiary);
    root.style.setProperty('--text-inverse', colors.textInverse);
    root.style.setProperty('--accent-teal', colors.accentTeal);
    root.style.setProperty('--accent-teal-dark', colors.accentTealDark);
    root.style.setProperty('--accent-teal-faded', colors.accentTealFaded);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--border-focused', colors.borderFocused);
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--error', colors.error);
    root.style.setProperty('--overlay', colors.overlay);

    // Sync browser/PWA theme-color meta tag
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
    }
    meta.content = colors.bgPrimary;

    // Sync Capacitor StatusBar if available (native apps)
    try {
        import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
            StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
            StatusBar.setBackgroundColor({ color: colors.bgPrimary }).catch(() => {});
        }).catch(() => {});
    } catch { /* not available */ }
}

// ── ThemeProvider Component ──────────────────────
// Wraps the app to:
// 1. Initialize theme from storage on mount
// 2. Listen to system color scheme changes via matchMedia
// 3. Inject CSS custom properties for progressive color migration

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const initialize = useThemeStore((s) => s.initialize);
    const setSystemPreference = useThemeStore((s) => s.setSystemPreference);
    const colors = useThemeStore((s) => s.colors);
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

    // Initialize on mount
    useEffect(() => {
        initialize();
    }, []);

    // Listen to system color scheme changes via matchMedia
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        setSystemPreference(mq.matches);

        const handler = (e: MediaQueryListEvent) => setSystemPreference(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Apply CSS variables whenever colors change
    useEffect(() => {
        applyCSSVariables(colors, resolvedTheme === 'dark');
    }, [colors, resolvedTheme]);

    return <>{children}</>;
}
