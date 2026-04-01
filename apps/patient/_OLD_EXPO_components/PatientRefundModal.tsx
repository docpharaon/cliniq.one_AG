import { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { colors, typography, radius, spacing, shadows } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { PATIENT_REFUND_REASON_LABELS, REFUND_STATUS_LABELS } from '@cliniqone/types';
import type { PatientRefundReason, RefundRequest } from '@cliniqone/types';
import { requestPatientRefund } from '@cliniqone/api';

interface PatientRefundModalProps {
    visible: boolean;
    onClose: () => void;
    consultationId: string;
    patientId: string;
    tokenCost: number;
    onSuccess?: () => void;
}

const REASONS = Object.entries(PATIENT_REFUND_REASON_LABELS) as [PatientRefundReason, { en: string; ar: string }][];

export function PatientRefundModal({
    visible,
    onClose,
    consultationId,
    patientId,
    tokenCost,
    onSuccess,
}: PatientRefundModalProps) {
    const [selectedReason, setSelectedReason] = useState<PatientRefundReason | null>(null);
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    function handleClose() {
        setSelectedReason(null);
        setDetails('');
        setSubmitted(false);
        setError('');
        onClose();
    }

    async function handleSubmit() {
        if (!selectedReason) return;
        setSubmitting(true);
        setError('');

        try {
            await requestPatientRefund({
                consultationId,
                patientId,
                reasonCategory: selectedReason,
                reasonText: details.trim() || undefined,
            });
            setSubmitted(true);
            onSuccess?.();
        } catch (err: any) {
            setError(err?.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.headerHandle} />

                    {submitted ? (
                        /* Success State */
                        <View style={styles.successBody}>
                            <Text style={styles.successIcon}>✅</Text>
                            <Text style={styles.successTitle}>Request Submitted</Text>
                            <Text style={styles.successText}>
                                Your refund request has been submitted and will be reviewed within 24-48 hours.
                                You'll receive a notification once a decision is made.
                            </Text>

                            <View style={styles.trackingCard}>
                                <Text style={styles.trackingLabel}>TRACKING</Text>
                                <View style={styles.trackingRow}>
                                    <Text style={styles.trackingDot}>⏳</Text>
                                    <Text style={styles.trackingText}>Pending Admin Review</Text>
                                </View>
                                <Text style={styles.trackingHint}>
                                    You can track the status in your Wallet tab
                                </Text>
                            </View>

                            <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                                <Text style={styles.doneButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Form */
                        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                            <Text style={styles.title}>↩️ Request Refund</Text>
                            <Text style={styles.subtitle}>
                                Tell us why you'd like a refund for this consultation
                            </Text>

                            {/* Refund amount */}
                            <View style={styles.amountBanner}>
                                <Text style={styles.amountLabel}>Refund Amount</Text>
                                <Text style={styles.amountValue}>💎 {tokenCost} tokens</Text>
                            </View>

                            {/* Reasons */}
                            <Text style={styles.label}>Select a reason</Text>
                            <View style={styles.reasonList}>
                                {REASONS.map(([key, labels]) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.reasonOption,
                                            selectedReason === key && styles.reasonOptionActive,
                                        ]}
                                        onPress={() => setSelectedReason(key)}
                                    >
                                        <View style={[
                                            styles.reasonRadio,
                                            selectedReason === key && styles.reasonRadioActive,
                                        ]}>
                                            {selectedReason === key && <View style={styles.reasonRadioDot} />}
                                        </View>
                                        <Text style={[
                                            styles.reasonText,
                                            selectedReason === key && styles.reasonTextActive,
                                        ]}>
                                            {labels.en}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Details (optional) */}
                            <Text style={styles.label}>Additional details (optional)</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Help us understand your concern better..."
                                placeholderTextColor={colors.textTertiary}
                                value={details}
                                onChangeText={setDetails}
                                multiline
                                numberOfLines={3}
                                maxLength={500}
                            />

                            {/* Disclaimer */}
                            <View style={styles.disclaimer}>
                                <Text style={styles.disclaimerText}>
                                    ⏳ Your request will be reviewed by our team within 24-48 hours. If approved, tokens will be automatically credited back to your wallet.
                                </Text>
                            </View>

                            {error ? (
                                <View style={styles.errorBanner}>
                                    <Text style={styles.errorText}>❌ {error}</Text>
                                </View>
                            ) : null}

                            {/* Submit */}
                            <TouchableOpacity
                                style={[styles.submitButton, (!selectedReason || submitting) && styles.submitButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={!selectedReason || submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Submit Refund Request</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.cancelLink} onPress={handleClose}>
                                <Text style={styles.cancelLinkText}>Cancel</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

/** Compact refund status badge for wallet transaction list */
export function RefundStatusBadge({ status }: { status: string }) {
    const labels = REFUND_STATUS_LABELS[status as keyof typeof REFUND_STATUS_LABELS];
    if (!labels) return null;

    return (
        <View style={[badgeStyles.badge, { backgroundColor: labels.color + '20', borderColor: labels.color + '40' }]}>
            <Text style={badgeStyles.icon}>{labels.icon}</Text>
            <Text style={[badgeStyles.text, { color: labels.color }]}>{labels.en}</Text>
        </View>
    );
}

const badgeStyles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
    },
    icon: { fontSize: 10 },
    text: { fontSize: 10, fontWeight: '700' },
});

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.bgPrimary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        ...shadows.elevated,
    },
    headerHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: colors.border, alignSelf: 'center',
        marginTop: spacing.md,
    },
    body: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl,
        paddingBottom: spacing['4xl'],
    },
    title: { ...typography.h3, color: colors.textPrimary },
    subtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
    label: {
        ...typography.label, color: colors.textSecondary,
        textTransform: 'uppercase', letterSpacing: 1,
        marginBottom: spacing.sm, marginTop: spacing.lg,
    },

    // Amount banner
    amountBanner: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: colors.accentTealFaded, borderRadius: radius.lg,
        padding: spacing.lg, borderWidth: 1, borderColor: colors.accentTeal + '30',
    },
    amountLabel: { ...typography.bodySm, color: colors.textSecondary },
    amountValue: { ...typography.h4, color: colors.accentTeal, fontWeight: '700' },

    // Reason list
    reasonList: { gap: spacing.sm },
    reasonOption: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        padding: spacing.lg, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.bgCard,
    },
    reasonOptionActive: { borderColor: colors.accentTeal, backgroundColor: colors.accentTealFaded },
    reasonRadio: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 2, borderColor: colors.textTertiary,
        justifyContent: 'center', alignItems: 'center',
    },
    reasonRadioActive: { borderColor: colors.accentTeal },
    reasonRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accentTeal },
    reasonText: { ...typography.body, color: colors.textPrimary, flex: 1 },
    reasonTextActive: { fontWeight: '600' },

    // Text area
    textArea: {
        ...typography.body, color: colors.textPrimary,
        backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.lg, padding: spacing.lg,
        minHeight: 80, textAlignVertical: 'top',
    },

    // Disclaimer
    disclaimer: {
        backgroundColor: colors.warningFaded,
        borderRadius: radius.md, padding: spacing.md,
        marginTop: spacing.xl,
    },
    disclaimerText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },

    // Error
    errorBanner: { backgroundColor: colors.errorFaded, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
    errorText: { ...typography.bodySm, color: colors.error },

    // Submit
    submitButton: {
        backgroundColor: colors.accentTeal, borderRadius: radius.lg,
        paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.xl,
    },
    submitButtonDisabled: { opacity: 0.4 },
    submitButtonText: { ...typography.button, color: '#fff', fontWeight: '700' },
    cancelLink: { alignItems: 'center', padding: spacing.lg },
    cancelLinkText: { ...typography.bodySm, color: colors.textTertiary },

    // Success
    successBody: { padding: spacing['2xl'], alignItems: 'center' },
    successIcon: { fontSize: 48, marginBottom: spacing.lg },
    successTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
    successText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
    trackingCard: {
        backgroundColor: colors.bgCard, borderRadius: radius.xl,
        padding: spacing.xl, borderWidth: 1, borderColor: colors.border,
        width: '100%', marginBottom: spacing.xl,
    },
    trackingLabel: { ...typography.caption, color: colors.textTertiary, letterSpacing: 1, fontWeight: '700', marginBottom: spacing.md },
    trackingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    trackingDot: { fontSize: 16 },
    trackingText: { ...typography.body, color: colors.warning, fontWeight: '600' },
    trackingHint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.md },
    doneButton: {
        backgroundColor: colors.accentTeal, borderRadius: radius.lg,
        paddingVertical: spacing.lg, paddingHorizontal: spacing['3xl'],
        alignItems: 'center', width: '100%',
    },
    doneButtonText: { ...typography.button, color: '#fff', fontWeight: '700' },
});
