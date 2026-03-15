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
        const saved = await AsyncStorage.getItem(LOCALE_KEY);
        if (saved === 'ar' || saved === 'en') {
            currentLocale = saved;
            const shouldBeRTL = saved === 'ar';
            if (I18nManager.isRTL !== shouldBeRTL) {
                I18nManager.forceRTL(shouldBeRTL);
                I18nManager.allowRTL(shouldBeRTL);
            }
        }
    } catch { /* first launch — use default 'en' */ }
    return currentLocale;
}

export async function setLocale(locale: 'en' | 'ar') {
    currentLocale = locale;
    const shouldBeRTL = locale === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.forceRTL(shouldBeRTL);
        I18nManager.allowRTL(shouldBeRTL);
    }
    try {
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

export { en, ar };

