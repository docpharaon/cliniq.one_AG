import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
    mode: ThemeMode;
    isDark: boolean;
    setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'cliniq-admin-theme';

function getSystemDark(): boolean {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function resolveIsDark(mode: ThemeMode): boolean {
    return mode === 'dark' || (mode === 'system' && getSystemDark());
}

function applyTheme(isDark: boolean) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

const ThemeContext = createContext<ThemeContextValue>({
    mode: 'dark',
    isDark: true,
    setMode: () => {},
});

export function AdminThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>(() => {
        return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'dark';
    });
    const [isDark, setIsDark] = useState(() => resolveIsDark(mode));

    const setMode = useCallback((m: ThemeMode) => {
        localStorage.setItem(STORAGE_KEY, m);
        setModeState(m);
        const dark = resolveIsDark(m);
        setIsDark(dark);
        applyTheme(dark);
    }, []);

    // Apply on mount
    useEffect(() => {
        applyTheme(isDark);
    }, []);

    // Listen for system changes
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (mode === 'system') {
                const dark = getSystemDark();
                setIsDark(dark);
                applyTheme(dark);
            }
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [mode]);

    return (
        <ThemeContext.Provider value={{ mode, isDark, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useAdminTheme() {
    return useContext(ThemeContext);
}
