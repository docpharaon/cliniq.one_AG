import React, { useEffect } from 'react';
import { useColorScheme, StatusBar, Platform } from 'react-native';
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

// ── ThemeProvider Component ──────────────────────
// Wraps the app to:
// 1. Initialize theme from storage on mount
// 2. Listen to system color scheme changes
// 3. Set StatusBar appearance

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useColorScheme();
    const initialize = useThemeStore((s) => s.initialize);
    const setSystemPreference = useThemeStore((s) => s.setSystemPreference);
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

    // Initialize on mount
    useEffect(() => {
        initialize();
    }, []);

    // Update system preference when OS changes
    useEffect(() => {
        setSystemPreference(systemColorScheme === 'dark');
    }, [systemColorScheme]);

    // StatusBar appearance
    useEffect(() => {
        if (Platform.OS !== 'web') {
            StatusBar.setBarStyle(
                resolvedTheme === 'dark' ? 'light-content' : 'dark-content',
                true,
            );
        }
    }, [resolvedTheme]);

    return <>{children}</>;
}
