import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import ar from './locales/ar.json';

export type TranslationKeys = typeof en;

/**
 * Translation engine with RTL support.
 * Supports English (LTR) and Arabic (RTL).
 * Persists locale choice via AsyncStorage.
 */

const LOCALE_KEY = '@cliniqone_locale';
let currentLocale: 'en' | 'ar' = 'en';
const translations: Record<string, typeof en> = { en, ar };

/**
 * Initialize locale from storage. Call once at app startup.
 */
export async function initLocale(): Promise<'en' | 'ar'> {
    try {
        // On web, also try synchronous localStorage first for faster init
        if (Platform.OS === 'web') {
            const ls = (globalThis as any).localStorage;
            if (ls) {
                const webSaved = ls.getItem(LOCALE_KEY);
                if (webSaved === 'ar' || webSaved === 'en') {
                    currentLocale = webSaved;
                    applyDirection(webSaved);
                    return currentLocale;
                }
            }
        }
        const saved = await AsyncStorage.getItem(LOCALE_KEY);
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
        // On web, write synchronously to localStorage so it survives page reload
        if (Platform.OS === 'web') {
            const ls = (globalThis as any).localStorage;
            if (ls) ls.setItem(LOCALE_KEY, locale);
        }
        await AsyncStorage.setItem(LOCALE_KEY, locale);
    } catch { /* storage write failed — locale still set in memory */ }
}

export function getLocale() {
    return currentLocale;
}

export function isRTL() {
    return currentLocale === 'ar';
}

/**
 * Apply text direction for RTL/LTR.
 * On web, sets document.documentElement.dir.
 * On native, uses I18nManager.
 */
function applyDirection(locale: 'en' | 'ar') {
    const shouldBeRTL = locale === 'ar';
    if (Platform.OS === 'web') {
        const doc = (globalThis as any).document;
        if (doc?.documentElement) {
            doc.documentElement.dir = shouldBeRTL ? 'rtl' : 'ltr';
            doc.documentElement.lang = locale;
        }
    }
    if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.forceRTL(shouldBeRTL);
        I18nManager.allowRTL(shouldBeRTL);
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

