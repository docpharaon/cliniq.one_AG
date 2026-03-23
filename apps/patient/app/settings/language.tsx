import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { getLocale, setLocale, t } from '@cliniqone/i18n';
import { supabase } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';

const LANGUAGES = [
    { code: 'en' as const, label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
    { code: 'ar' as const, label: 'Arabic', nativeLabel: 'العربية', flag: '🇸🇦' },
];

export default function LanguageScreen() {
    const [selected, setSelected] = useState<'en' | 'ar'>(getLocale());
    const toast = useToast((s) => s.show);
    const user = useAuthStore((s) => s.user);

    async function handleSelect(code: 'en' | 'ar') {
        if (code === selected) return;

        // Language change requires app restart — confirm via browser confirm on web
        const confirmMsg = code === 'ar'
            ? 'سيتم إعادة تشغيل التطبيق لتطبيق اللغة العربية'
            : 'The app will restart to apply the new language.';

        const confirmed = (globalThis as any).confirm?.(confirmMsg) ?? true;
        if (!confirmed) return;

        setSelected(code);
        await setLocale(code);

        // Sync to user profile so the AI knows the language
        if (user?.id) {
            supabase.from('users').update({ language: code }).eq('id', user.id).then(() => {});
        }

        toast(code === 'ar' ? 'جاري تغيير اللغة...' : 'Changing language...', 'info');

        // Reload to apply RTL/LTR changes
        try {
            const Updates = require('expo-updates');
            await Updates.reloadAsync();
        } catch {
            if (Platform.OS === 'web') {
                (globalThis as any).location?.reload();
            } else {
                router.back();
            }
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>← {t('common.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('profile.language')}</Text>
                <Text style={styles.subtitle}>{t('settings.chooseLanguage')}</Text>
            </View>

            <View style={styles.list}>
                {LANGUAGES.map((lang) => {
                    const isActive = selected === lang.code;
                    return (
                        <TouchableOpacity
                            key={lang.code}
                            style={[styles.langCard, isActive && styles.langCardActive]}
                            activeOpacity={0.7}
                            onPress={() => handleSelect(lang.code)}
                        >
                            <Text style={styles.flag}>{lang.flag}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                                    {lang.nativeLabel}
                                </Text>
                                <Text style={styles.langSublabel}>{lang.label}</Text>
                            </View>
                            <View style={[styles.radio, isActive && styles.radioActive]}>
                                {isActive && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text style={styles.infoText}>
                    {t('settings.languageSwitchInfo')}
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary, paddingHorizontal: spacing.xl },
    header: { paddingTop: spacing.lg, marginBottom: spacing['2xl'] },
    backButton: { marginBottom: spacing.lg },
    backText: { ...typography.body, color: colors.accentTeal },
    title: { ...typography.h2, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },

    list: { gap: spacing.md, marginBottom: spacing['2xl'] },
    langCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        backgroundColor: colors.bgCard,
        padding: spacing.xl,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: colors.border,
        ...shadows.card,
    },
    langCardActive: {
        borderColor: colors.accentTeal,
        backgroundColor: colors.accentTealFaded,
    },
    flag: { fontSize: 32 },
    langLabel: { ...typography.h4, color: colors.textPrimary },
    langLabelActive: { color: colors.accentTeal },
    langSublabel: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },

    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioActive: { borderColor: colors.accentTeal },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.accentTeal,
    },

    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        backgroundColor: colors.infoFaded,
        padding: spacing.lg,
        borderRadius: radius.lg,
    },
    infoIcon: { fontSize: 16 },
    infoText: { ...typography.bodySm, color: colors.textSecondary, flex: 1, lineHeight: 18 },
});
