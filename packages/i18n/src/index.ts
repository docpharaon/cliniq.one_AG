// Platform-agnostic I18n — works on web (Vite/Next.js) and React Native
import en from './locales/en.json';
import ar from './locales/ar.json';

export type TranslationKeys = typeof en;

const LOCALE_KEY = '@cliniqone_locale';
let currentLocale: 'en' | 'ar' = 'en';
const translations: Record<string, typeof en> = { en, ar };

// Reactive locale change listeners
type LocaleListener = (locale: 'en' | 'ar') => void;
const listeners = new Set<LocaleListener>();

export function onLocaleChange(fn: LocaleListener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

function notifyListeners() {
    listeners.forEach(fn => fn(currentLocale));
}

// Detect platform
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Initialize locale from storage. Call once at app startup.
 */
export async function initLocale(): Promise<'en' | 'ar'> {
    try {
        const saved = isWeb ? localStorage.getItem(LOCALE_KEY) : null;
        if (saved === 'ar' || saved === 'en') {
            currentLocale = saved;
            applyDirection(saved);
        }
    } catch { /* first launch — use default 'en' */ }
    return currentLocale;
}

export async function setLocale(locale: 'en' | 'ar') {
    currentLocale = locale;
    applyDirection(locale);
    try {
        if (isWeb) localStorage.setItem(LOCALE_KEY, locale);
    } catch { /* storage write failed — locale still set in memory */ }
    notifyListeners();
}

export function getLocale() {
    return currentLocale;
}

export function isRTL() {
    return currentLocale === 'ar';
}

/**
 * Apply text direction for RTL/LTR.
 */
function applyDirection(locale: 'en' | 'ar') {
    const shouldBeRTL = locale === 'ar';
    if (isWeb && document?.documentElement) {
        document.documentElement.dir = shouldBeRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = locale;
    }
}

/**
 * Get a translated string by dot-path key.
 * Supports interpolation: t('welcome.greeting', { name: 'Sarah' })
 */
export function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: any = translations[currentLocale] || translations.en;

    for (const k of keys) {
        value = value?.[k];
    }

    if (typeof value !== 'string') {
        // Fallback to English
        value = translations.en;
        for (const k of keys) {
            value = value?.[k];
        }
    }

    if (typeof value !== 'string') {
        return key; // Return key as fallback
    }

    // Interpolate {{param}} placeholders
    if (params) {
        return value.replace(/\{\{(\w+)\}\}/g, (_: string, paramKey: string) => {
            return String(params[paramKey] ?? `{{${paramKey}}}`);
        });
    }

    return value;
}

/**
 * Convert Western digits (0-9) to Arabic-Indic digits (٠-٩) when locale is Arabic.
 * Pass any value — numbers, strings, or mixed content.
 */
export function toLocalNum(value: string | number): string {
    const str = String(value);
    if (currentLocale !== 'ar') return str;
    return str.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

/**
 * Format a date string/Date in a locale-aware way.
 * Uses Arabic locale when currentLocale is 'ar'.
 */
export function localDate(
    date: string | Date,
    options?: Intl.DateTimeFormatOptions,
): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = currentLocale === 'ar' ? 'ar-SA' : 'en-US';
    const defaults: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString(locale, options || defaults);
}

export { en, ar };

// React hook — use in components to get reactive locale updates
import { useState, useEffect } from 'react';
export function useLocale(): 'en' | 'ar' {
    const [locale, setLoc] = useState(currentLocale);
    useEffect(() => {
        return onLocaleChange((newLocale) => setLoc(newLocale));
    }, []);
    return locale;
}
