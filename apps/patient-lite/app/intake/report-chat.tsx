import { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { supabase, safeFetch } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useIntakeStore } from '../../stores/intakeStore';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';

// ── Report Categories ────────────────────────────
const CATEGORY_KEYS = [
    'wrong_question',
    'repeated_question',
    'inappropriate',
    'stuck_loop',
    'skipped_section',
    'other',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
    wrong_question: 'report.wrongQuestion',
    repeated_question: 'report.repeatedQuestion',
    inappropriate: 'report.inappropriate',
    stuck_loop: 'report.stuckLoop',
    skipped_section: 'report.skippedSection',
    other: 'report.otherIssue',
};

type CategoryKey = typeof CATEGORY_KEYS[number];

export default function ReportChatScreen() {
    const [category, setCategory] = useState<CategoryKey>('other');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const toast = useToast((s) => s.show);

    const {
        messages, sequenceNodes, currentNodeIndex,
        activePathway, gibberishCount, protocolFlags,
        chiefComplaint, specialty, sessionId,
        progressPercent,
    } = useIntakeStore();
    const { user } = useAuthStore();

    async function handleSubmit() {
        if (note.trim().length < 10) {
            toast(t('report.minCharsWarning'), 'warning');
            return;
        }
        if (!user?.id) {
            toast(t('report.mustBeLoggedIn'), 'error');
            return;
        }

        setSubmitting(true);

        try {
            // Build full diagnostic snapshot
            const diagnosticData = {
                chatbotVersion: useIntakeStore.getState().sessionId ? 'active' : 'unknown',
                pathway: activePathway,
                specialty,
                chiefComplaint,
                currentNodeIndex,
                progressPercent: Math.round(progressPercent),
                totalNodes: sequenceNodes.length,
                currentSection: sequenceNodes[currentNodeIndex]?.step_key || 'unknown',
                sectionsVisited: sequenceNodes.slice(0, currentNodeIndex + 1).map(n => ({
                    step_key: n.step_key,
                    label: n.label,
                    prompt_id: n.prompt_id,
                })),
                gibberishCount,
                protocolFlags,
                totalMessages: messages.length,
                timestamp: new Date().toISOString(),
            };

            const { error } = await safeFetch(
                () => supabase.from('chat_reports').insert({
                    patient_id: user.id,
                    session_id: sessionId || null,
                    category,
                    note: note.trim(),
                    chat_snapshot: messages,
                    diagnostic_data: diagnosticData,
                }),
                { timeout: 8000, retries: 1, label: 'submitReport' },
            );

            if (error) throw error;

            setSubmitted(true);
            toast(t('report.submitted'), 'success');
            setTimeout(() => {
                router.back();
            }, 2000);
        } catch (err: any) {
            console.error('Report submission error:', err);
            const msg = err?.message?.includes('timed out')
                ? t('report.connectionSlow')
                : t('report.submitFailed');
            toast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    }

    // ── Submitted confirmation ───────────────────
    if (submitted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.confirmationBox}>
                    <Text style={styles.confirmEmoji}>✅</Text>
                    <Text style={styles.confirmTitle}>{t('report.thankYou')}</Text>
                    <Text style={styles.confirmText}>
                        {t('report.submittedDesc')}
                    </Text>
                    <Text style={styles.confirmRedirect}>{t('report.returning')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── Report Form ──────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>{t('report.backToChat')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('report.title')}</Text>
            </View>

            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.formContent}>
                {/* Description */}
                <Text style={styles.description}>
                    {t('report.description')}
                </Text>

                {/* Category Picker */}
                <Text style={styles.sectionTitle}>{t('report.whatHappened')}</Text>
                <View style={styles.categoryList}>
                    {CATEGORY_KEYS.map((key) => (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.categoryItem,
                                category === key && styles.categoryItemSelected,
                            ]}
                            onPress={() => setCategory(key)}
                        >
                            <View style={[
                                styles.radio,
                                category === key && styles.radioSelected,
                            ]}>
                                {category === key && <View style={styles.radioInner} />}
                            </View>
                            <Text style={[
                                styles.categoryLabel,
                                category === key && styles.categoryLabelSelected,
                            ]}>
                                {t(CATEGORY_LABELS[key])}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Note */}
                <Text style={styles.sectionTitle}>{t('report.describeIssue')}</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder={t('report.placeholder')}
                    placeholderTextColor={colors.textTertiary}
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={1000}
                />
                <Text style={styles.charCount}>{note.length}/1000</Text>

                {/* Info notice */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        {t('report.infoNote')}
                    </Text>
                </View>

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitButton, (note.trim().length < 10 || submitting) && styles.submitDisabled]}
                    onPress={handleSubmit}
                    disabled={note.trim().length < 10 || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.submitText}>{t('report.submitButton')}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ───────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: { paddingVertical: spacing.xs },
    backText: { ...typography.bodySm, color: colors.accentTeal },
    headerTitle: { ...typography.h4, color: colors.textPrimary },
    scrollContent: { flex: 1 },
    formContent: { padding: spacing.lg, paddingBottom: 40 },
    description: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
        lineHeight: 22,
    },
    sectionTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },

    // Category picker
    categoryList: { gap: spacing.xs, marginBottom: spacing.lg },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgSecondary,
    },
    categoryItemSelected: {
        borderColor: colors.accentTeal,
        backgroundColor: 'rgba(45, 212, 191, 0.08)',
    },
    radio: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 2, borderColor: colors.textTertiary,
        justifyContent: 'center', alignItems: 'center',
        marginRight: spacing.sm,
    },
    radioSelected: { borderColor: colors.accentTeal },
    radioInner: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: colors.accentTeal,
    },
    categoryLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
    categoryLabelSelected: { color: colors.textPrimary, fontWeight: '600' },

    // Text area
    textArea: {
        ...typography.body,
        color: colors.textPrimary,
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
        minHeight: 120,
        fontSize: 15,
    },
    charCount: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'right',
        marginTop: spacing.xs,
    },

    // Info box
    infoBox: {
        backgroundColor: 'rgba(45, 212, 191, 0.08)',
        borderRadius: radius.md,
        padding: spacing.md,
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(45, 212, 191, 0.2)',
    },
    infoText: {
        ...typography.caption,
        color: colors.textSecondary,
        lineHeight: 18,
    },

    // Submit
    submitButton: {
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    submitDisabled: { opacity: 0.5 },
    submitText: { ...typography.button, color: '#0A0E1A', fontWeight: '700' },

    // Confirmation
    confirmationBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    confirmEmoji: { fontSize: 48, marginBottom: spacing.md },
    confirmTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
    confirmText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
    confirmRedirect: { ...typography.caption, color: colors.textTertiary },
});
