import { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { supabase, safeFetch } from '@cliniqone/api';
import { useIntakeStore } from '../../stores/intakeStore';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';

// ── Report Categories ────────────────────────────
const CATEGORIES = [
    { key: 'wrong_question', label: '❓ Wrong or irrelevant question', },
    { key: 'repeated_question', label: '🔁 Asked the same thing again', },
    { key: 'inappropriate', label: '⚠️ Inappropriate response', },
    { key: 'stuck_loop', label: '🔄 Stuck in a loop', },
    { key: 'skipped_section', label: '⏭️ Skipped a section', },
    { key: 'other', label: '📝 Other issue', },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

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
            toast('Please provide more detail (at least 10 characters).', 'warning');
            return;
        }
        if (!user?.id) {
            toast('You must be logged in to submit a report.', 'error');
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
            toast('Report submitted — thank you!', 'success');
            setTimeout(() => {
                router.back();
            }, 2000);
        } catch (err: any) {
            console.error('Report submission error:', err);
            const msg = err?.message?.includes('timed out')
                ? 'Connection is slow. Please try again.'
                : 'Failed to submit report. Please try again.';
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
                    <Text style={styles.confirmTitle}>Thank you for your feedback</Text>
                    <Text style={styles.confirmText}>
                        Your report has been submitted and will be reviewed by our team.
                    </Text>
                    <Text style={styles.confirmRedirect}>Returning to chat...</Text>
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
                    <Text style={styles.backText}>← Back to chat</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>⚑ Report an Issue</Text>
            </View>

            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.formContent}>
                {/* Description */}
                <Text style={styles.description}>
                    If the AI asked something wrong, repeated itself, or behaved unexpectedly,
                    let us know so we can improve.
                </Text>

                {/* Category Picker */}
                <Text style={styles.sectionTitle}>What happened?</Text>
                <View style={styles.categoryList}>
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.key}
                            style={[
                                styles.categoryItem,
                                category === cat.key && styles.categoryItemSelected,
                            ]}
                            onPress={() => setCategory(cat.key)}
                        >
                            <View style={[
                                styles.radio,
                                category === cat.key && styles.radioSelected,
                            ]}>
                                {category === cat.key && <View style={styles.radioInner} />}
                            </View>
                            <Text style={[
                                styles.categoryLabel,
                                category === cat.key && styles.categoryLabelSelected,
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Note */}
                <Text style={styles.sectionTitle}>Describe the issue</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Tell us what went wrong..."
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
                        ℹ️ Your chat history will be attached to this report so our team can
                        diagnose the issue. No personal data beyond what you've shared in the
                        chat will be included.
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
                        <Text style={styles.submitText}>Submit Report</Text>
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
