import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, useTheme } from '@cliniqone/ui';
import type { ThemeMode } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { Ionicons } from '@expo/vector-icons';

const THEME_OPTIONS: { mode: ThemeMode; icon: string; labelKey: string; descKey: string }[] = [
    {
        mode: 'light',
        icon: '☀️',
        labelKey: 'appearance.light',
        descKey: 'appearance.lightDesc',
    },
    {
        mode: 'dark',
        icon: '🌙',
        labelKey: 'appearance.dark',
        descKey: 'appearance.darkDesc',
    },
    {
        mode: 'system',
        icon: '📱',
        labelKey: 'appearance.system',
        descKey: 'appearance.systemDesc',
    },
];

export default function AppearanceScreen() {
    const { mode, setMode, resolvedTheme, isDark } = useTheme();

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>🎨 {t('settings.appearance') || 'Appearance'}</Text>
            </View>

            {/* Theme Picker */}
            <View style={styles.body}>
                <Text style={styles.sectionTitle}>{t('appearance.themeTitle') || 'Theme'}</Text>
                <Text style={styles.sectionDesc}>
                    {t('appearance.themeDesc') || 'Choose how cliniq.one looks on your device'}
                </Text>

                <View style={styles.optionsList}>
                    {THEME_OPTIONS.map((option) => {
                        const isActive = mode === option.mode;
                        return (
                            <TouchableOpacity
                                key={option.mode}
                                style={[styles.optionCard, isActive && styles.optionCardActive]}
                                onPress={() => setMode(option.mode)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionRow}>
                                    <Text style={styles.optionIcon}>{option.icon}</Text>
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                                            {t(option.labelKey) || option.mode}
                                        </Text>
                                        <Text style={styles.optionDesc}>
                                            {t(option.descKey) || ''}
                                        </Text>
                                    </View>
                                    {/* Radio */}
                                    <View style={[styles.radio, isActive && styles.radioActive]}>
                                        {isActive && <View style={styles.radioInner} />}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Current status */}
                <View style={styles.statusCard}>
                    <Ionicons
                        name={isDark ? 'moon' : 'sunny'}
                        size={18}
                        color={colors.accentTeal}
                    />
                    <Text style={styles.statusText}>
                        {t('appearance.currentlyUsing') || 'Currently using'}{' '}
                        <Text style={styles.statusBold}>
                            {resolvedTheme === 'dark'
                                ? (t('appearance.dark') || 'Dark')
                                : (t('appearance.light') || 'Light')
                            }
                        </Text>
                        {' '}{t('appearance.mode') || 'mode'}
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.md,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    body: {
        padding: spacing.xl,
    },
    sectionTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    sectionDesc: {
        ...typography.bodySm,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
        lineHeight: 20,
    },
    optionsList: {
        gap: spacing.sm,
    },
    optionCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    optionCardActive: {
        borderColor: colors.accentTeal,
        backgroundColor: colors.accentTealFaded,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionIcon: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionLabel: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    optionLabelActive: {
        color: colors.accentTeal,
    },
    optionDesc: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },

    // Radio button
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.textTertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioActive: {
        borderColor: colors.accentTeal,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.accentTeal,
    },

    // Status
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing['2xl'],
        padding: spacing.md,
        backgroundColor: colors.accentTealFaded,
        borderRadius: radius.md,
    },
    statusText: {
        ...typography.bodySm,
        color: colors.textSecondary,
    },
    statusBold: {
        fontWeight: '700',
        color: colors.accentTeal,
    },
});
