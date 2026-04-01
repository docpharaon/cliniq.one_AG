import { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { colors, typography, radius, spacing, shadows } from '@cliniqone/ui';
import { DOCTOR_REFUND_REASON_LABELS } from '@cliniqone/types';
import type { DoctorRefundReason } from '@cliniqone/types';
import { requestDoctorRefund } from '@cliniqone/api';

interface RefundRequestModalProps {
    visible: boolean;
    onClose: () => void;
    consultationId: string;
    doctorUserId: string;
    tokenCost: number;
    onSuccess?: () => void;
}

const REASONS = Object.entries(DOCTOR_REFUND_REASON_LABELS) as [DoctorRefundReason, { en: string; ar: string }][];

export default function RefundRequestModal({
    visible,
    onClose,
    consultationId,
    doctorUserId,
    tokenCost,
    onSuccess,
}: RefundRequestModalProps) {
    const [selectedReason, setSelectedReason] = useState<DoctorRefundReason | null>(null);
    const [explanation, setExplanation] = useState('');
    const [step, setStep] = useState<'reason' | 'confirm'>('reason');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const canProceed = selectedReason !== null && explanation.trim().length >= 20;

    function handleReset() {
        setSelectedReason(null);
        setExplanation('');
        setStep('reason');
        setError('');
        setSubmitting(false);
    }

    function handleClose() {
        handleReset();
        onClose();
    }

    async function handleSubmit() {
        if (!selectedReason || !canProceed) return;
        setSubmitting(true);
        setError('');

        try {
            await requestDoctorRefund({
                consultationId,
                doctorUserId,
                reasonCategory: selectedReason,
                reasonText: explanation.trim(),
            });
            setStep('reason');
            handleReset();
            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to submit refund request');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerHandle} />
                        <View style={styles.headerRow}>
                            <Text style={styles.headerTitle}>
                                {step === 'reason' ? '⚠️ Request Refund' : '📋 Confirm Refund'}
                            </Text>
                            <TouchableOpacity onPress={handleClose}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.headerSubtitle}>
                            {step === 'reason'
                                ? 'Select a reason for requesting a refund for this consultation'
                                : 'Please review the details below before submitting'}
                        </Text>
                    </View>

                    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                        {step === 'reason' ? (
                            <>
                                {/* Reason Categories */}
                                <Text style={styles.label}>Reason</Text>
                                <View style={styles.reasonGrid}>
                                    {REASONS.map(([key, labels]) => (
                                        <TouchableOpacity
                                            key={key}
                                            style={[
                                                styles.reasonChip,
                                                selectedReason === key && styles.reasonChipActive,
                                            ]}
                                            onPress={() => setSelectedReason(key)}
                                        >
                                            <Text
                                                style={[
                                                    styles.reasonChipText,
                                                    selectedReason === key && styles.reasonChipTextActive,
                                                ]}
                                            >
                                                {labels.en}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Explanation */}
                                <Text style={styles.label}>
                                    Explanation <Text style={styles.required}>(min 20 chars)</Text>
                                </Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Describe why this consultation should be refunded..."
                                    placeholderTextColor={colors.textTertiary}
                                    value={explanation}
                                    onChangeText={setExplanation}
                                    multiline
                                    numberOfLines={4}
                                    maxLength={500}
                                />
                                <Text style={styles.charCount}>{explanation.length}/500</Text>

                                {/* CTA */}
                                <TouchableOpacity
                                    style={[styles.proceedButton, !canProceed && styles.proceedButtonDisabled]}
                                    onPress={() => setStep('confirm')}
                                    disabled={!canProceed}
                                >
                                    <Text style={styles.proceedButtonText}>Review & Confirm</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                {/* Confirmation Summary */}
                                <View style={styles.summaryCard}>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Reason</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedReason ? DOCTOR_REFUND_REASON_LABELS[selectedReason].en : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Refund Amount</Text>
                                        <Text style={styles.summaryTokens}>💎 {tokenCost} tokens</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Explanation</Text>
                                    </View>
                                    <Text style={styles.summaryExplanation}>{explanation}</Text>
                                </View>

                                {/* Impact Notice */}
                                <View style={styles.impactNotice}>
                                    <Text style={styles.impactIcon}>ℹ️</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.impactTitle}>What happens next</Text>
                                        <Text style={styles.impactText}>
                                            • Request will be sent to admin for review{'\n'}
                                            • Patient will be refunded {tokenCost} tokens upon approval{'\n'}
                                            • Consultation will be marked as "refunded"{'\n'}
                                            • Your earned tokens will be adjusted accordingly
                                        </Text>
                                    </View>
                                </View>

                                {error ? (
                                    <View style={styles.errorBanner}>
                                        <Text style={styles.errorText}>❌ {error}</Text>
                                    </View>
                                ) : null}

                                {/* Actions */}
                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.backButton} onPress={() => setStep('reason')}>
                                        <Text style={styles.backButtonText}>← Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.submitButton, submitting && { opacity: 0.6 }]}
                                        onPress={handleSubmit}
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <ActivityIndicator color={colors.bgPrimary} size="small" />
                                        ) : (
                                            <Text style={styles.submitButtonText}>Submit Refund Request</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.bgPrimary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        ...shadows.elevated,
    },
    header: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: { ...typography.h3, color: colors.textPrimary },
    headerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
    closeBtn: { fontSize: 20, color: colors.textTertiary, padding: spacing.sm },
    body: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl,
        paddingBottom: spacing['4xl'],
    },
    label: {
        ...typography.label,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
    },
    required: { color: colors.warning, fontSize: 10, textTransform: 'none', letterSpacing: 0 },

    // Reason grid
    reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    reasonChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgCard,
    },
    reasonChipActive: {
        borderColor: colors.warning,
        backgroundColor: colors.warningFaded,
    },
    reasonChipText: { ...typography.bodySm, color: colors.textSecondary },
    reasonChipTextActive: { color: colors.warning, fontWeight: '600' },

    // Text area
    textArea: {
        ...typography.body,
        color: colors.textPrimary,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.lg,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: { ...typography.caption, color: colors.textTertiary, textAlign: 'right', marginTop: spacing.xs },

    // Proceed
    proceedButton: {
        backgroundColor: colors.warning,
        borderRadius: radius.lg,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    proceedButtonDisabled: { opacity: 0.4 },
    proceedButtonText: { ...typography.button, color: colors.bgPrimary, fontWeight: '700' },

    // Confirmation
    summaryCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
    summaryLabel: { ...typography.caption, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1 },
    summaryValue: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    summaryTokens: { ...typography.h4, color: colors.accentTeal, fontWeight: '700' },
    summaryExplanation: { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginTop: spacing.xs },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

    // Impact notice
    impactNotice: {
        flexDirection: 'row',
        gap: spacing.md,
        backgroundColor: colors.infoFaded,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginTop: spacing.xl,
    },
    impactIcon: { fontSize: 18 },
    impactTitle: { ...typography.bodySm, color: colors.info, fontWeight: '700', marginBottom: spacing.xs },
    impactText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },

    // Error
    errorBanner: {
        backgroundColor: colors.errorFaded,
        borderRadius: radius.md,
        padding: spacing.md,
        marginTop: spacing.md,
    },
    errorText: { ...typography.bodySm, color: colors.error },

    // Actions
    actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
    backButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },
    backButtonText: { ...typography.button, color: colors.textSecondary },
    submitButton: {
        flex: 2,
        backgroundColor: colors.error,
        borderRadius: radius.lg,
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },
    submitButtonText: { ...typography.button, color: '#fff', fontWeight: '700' },
});
