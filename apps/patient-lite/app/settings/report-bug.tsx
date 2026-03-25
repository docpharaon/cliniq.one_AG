import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { supabase, safeFetch } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import { t } from '@cliniqone/i18n';
import { useToast } from '../../components/ToastProvider';
import { APP } from '@cliniqone/config';

const CATEGORIES = [
    { key: 'chat', icon: '💬' },
    { key: 'payment', icon: '💳' },
    { key: 'ui', icon: '🖥️' },
    { key: 'other', icon: '📝' },
] as const;

type BugCategory = typeof CATEGORIES[number]['key'];

export default function ReportBugScreen() {
    const { user } = useAuthStore();
    const toast = useToast((s) => s.show);

    const [category, setCategory] = useState<BugCategory | null>(null);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (!category) {
            toast(t('bugReport.categoryRequired'), 'warning');
            return;
        }
        if (description.trim().length < 10) {
            toast(t('bugReport.descriptionTooShort'), 'warning');
            return;
        }
        if (!user?.id) return;

        setSubmitting(true);
        try {
            await safeFetch(
                () =>
                    supabase.from('error_reports').insert({
                        user_id: user.id,
                        category,
                        description: description.trim(),
                        status: 'open',
                    }),
                { timeout: 8000, retries: 1, label: 'submitBugReport' },
            );
            toast(t('bugReport.successMessage'), 'success');
            router.back();
        } catch (err: any) {
            toast(
                err?.message?.includes('timed out')
                    ? t('bugReport.connectionSlow')
                    : t('bugReport.submitFailed'),
                'error',
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>← {t('common.back')}</Text>
                </TouchableOpacity>

                <Text style={styles.title}>🐛 {t('bugReport.title')}</Text>
                <Text style={styles.subtitle}>{t('bugReport.subtitle')}</Text>

                {/* Category Picker */}
                <Text style={styles.sectionTitle}>{t('bugReport.categoryLabel')}</Text>
                <View style={styles.categoryGrid}>
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.key}
                            style={[
                                styles.categoryChip,
                                category === cat.key && styles.categoryChipActive,
                            ]}
                            onPress={() => setCategory(cat.key)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.categoryIcon}>{cat.icon}</Text>
                            <Text
                                style={[
                                    styles.categoryLabel,
                                    category === cat.key && styles.categoryLabelActive,
                                ]}
                            >
                                {t(`bugReport.category_${cat.key}`)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Description */}
                <Text style={styles.sectionTitle}>{t('bugReport.descriptionLabel')}</Text>
                <TextInput
                    style={styles.textArea}
                    value={description}
                    onChangeText={setDescription}
                    placeholder={t('bugReport.descriptionPlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={2000}
                />
                <Text style={styles.charCount}>{description.length} / 2000</Text>

                {/* Device Info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>ℹ️ {t('bugReport.deviceInfoTitle')}</Text>
                    <Text style={styles.infoText}>
                        {t('bugReport.deviceInfoDesc', { version: APP.VERSION })}
                    </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.submitText}>{t('bugReport.submit')}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },

    backButton: { paddingTop: spacing.lg, marginBottom: spacing.lg },
    backText: { ...typography.body, color: colors.accentTeal },

    title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 22,
        marginBottom: spacing['2xl'],
    },

    sectionTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },

    // Category chips
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing['2xl'],
    },
    categoryChip: {
        flex: 1,
        minWidth: '40%' as any,
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.border,
        ...shadows.card,
    },
    categoryChipActive: {
        borderColor: colors.accentTeal,
        backgroundColor: colors.accentTealFaded,
    },
    categoryIcon: { fontSize: 24, marginBottom: spacing.xs },
    categoryLabel: { ...typography.bodySm, color: colors.textSecondary, fontWeight: '600' },
    categoryLabelActive: { color: colors.accentTeal },

    // Text area
    textArea: {
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
        minHeight: 140,
        ...shadows.card,
    },
    charCount: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'right',
        marginTop: spacing.xs,
        marginBottom: spacing.xl,
    },

    // Info card
    infoCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing['2xl'],
        borderLeftWidth: 3,
        borderLeftColor: colors.accentTeal,
    },
    infoTitle: { ...typography.bodySm, color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.xs },
    infoText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },

    // Submit
    submitButton: {
        backgroundColor: colors.accentTeal,
        borderRadius: radius.lg,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    submitButtonDisabled: { opacity: 0.6 },
    submitText: { ...typography.button, color: '#fff', fontWeight: '700' },
});
