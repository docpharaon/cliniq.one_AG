// ─────────────────────────────────────────────────
// FIG_53: Medication Verification Card
// Chat-embedded verification cards showing AI verification status
// for patient-stated medications with therapeutic range validation.
// ─────────────────────────────────────────────────
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import type { MedicationVerification } from '../services/aiService';

interface MedicationVerificationCardProps {
    verification: MedicationVerification;
    /** Called when user taps "Photo Label" to capture a drug label photo */
    onPhotoLabel?: () => void;
    /** Called when user confirms a "needs_confirmation" medication */
    onConfirm?: () => void;
}

// ── Status config ────────────────────────────────
const STATUS_CONFIG = {
    verified: {
        emoji: '✅',
        labelKey: 'medVerify.verified',
        bgColor: colors.successFaded,
        borderColor: colors.success,
        textColor: colors.success,
    },
    needs_confirmation: {
        emoji: '⚠️',
        labelKey: 'medVerify.needsConfirmation',
        bgColor: colors.warningFaded,
        borderColor: colors.warning,
        textColor: colors.warning,
    },
    unrecognized: {
        emoji: '❌',
        labelKey: 'medVerify.unrecognized',
        bgColor: colors.errorFaded,
        borderColor: colors.error,
        textColor: colors.error,
    },
};

export function MedicationVerificationCard({
    verification,
    onPhotoLabel,
    onConfirm,
}: MedicationVerificationCardProps) {
    const config = STATUS_CONFIG[verification.status as keyof typeof STATUS_CONFIG];

    return (
        <View style={[styles.card, { borderLeftColor: config.borderColor }]}>
            {/* Header: Drug name + status badge */}
            <View style={styles.header}>
                <View style={styles.drugInfo}>
                    <Text style={styles.drugName}>{verification.name}</Text>
                    {verification.genericName && verification.genericName !== verification.name && (
                        <Text style={styles.genericName}>({verification.genericName})</Text>
                    )}
                </View>
                <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
                    <Text style={[styles.badgeText, { color: config.textColor }]}>
                        {config.emoji} {t(config.labelKey)}
                    </Text>
                </View>
            </View>

            {/* Dosage + therapeutic range */}
            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{t('medVerify.statedDosage')}</Text>
                    <Text style={styles.detailValue}>{verification.statedDosage || '—'}</Text>
                </View>
                {verification.therapeuticRange && (
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{t('medVerify.therapeuticRange')}</Text>
                        <Text style={styles.detailValue}>{verification.therapeuticRange}</Text>
                    </View>
                )}
            </View>

            {/* Daily dose status */}
            {verification.dailyDoseStatus && (
                <Text style={styles.doseStatus}>{verification.dailyDoseStatus}</Text>
            )}

            {/* Status reason */}
            <Text style={styles.statusReason}>{verification.statusReason}</Text>

            {/* Action buttons */}
            <View style={styles.actions}>
                {onPhotoLabel && (
                    <TouchableOpacity
                        style={styles.photoButton}
                        onPress={onPhotoLabel}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.photoButtonText}>📷 {t('medVerify.photoLabel')}</Text>
                    </TouchableOpacity>
                )}
                {verification.status === 'needs_confirmation' && onConfirm && (
                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={onConfirm}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.confirmButtonText}>✓ {t('medVerify.confirm')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Confidence indicator */}
            <View style={styles.confidenceRow}>
                <View style={styles.confidenceBar}>
                    <View
                        style={[
                            styles.confidenceFill,
                            {
                                width: `${Math.min(verification.confidence, 100)}%`,
                                backgroundColor: verification.confidence >= 80
                                    ? colors.success
                                    : verification.confidence >= 50
                                        ? colors.warning
                                        : colors.error,
                            },
                        ]}
                    />
                </View>
                <Text style={styles.confidenceText}>{verification.confidence}%</Text>
            </View>
        </View>
    );
}

// ── Styles ────────────────────────────────────────
const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        borderLeftWidth: 4,
        padding: spacing.lg,
        marginVertical: spacing.sm,
        ...shadows.card,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    drugInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    drugName: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    genericName: {
        ...typography.bodySm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
    },
    badgeText: {
        ...typography.caption,
        fontWeight: '600',
    },
    detailsRow: {
        flexDirection: 'row',
        gap: spacing.xl,
        marginBottom: spacing.sm,
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        ...typography.caption,
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    detailValue: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    doseStatus: {
        ...typography.bodySm,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    statusReason: {
        ...typography.bodySm,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginBottom: spacing.md,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.accentTealFaded,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.accentTeal,
    },
    photoButtonText: {
        ...typography.buttonSm,
        color: colors.accentTeal,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.successFaded,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.success,
    },
    confirmButtonText: {
        ...typography.buttonSm,
        color: colors.success,
    },
    confidenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    confidenceBar: {
        flex: 1,
        height: 4,
        backgroundColor: colors.bgTertiary,
        borderRadius: radius.full,
        overflow: 'hidden',
    },
    confidenceFill: {
        height: '100%',
        borderRadius: radius.full,
    },
    confidenceText: {
        ...typography.caption,
        color: colors.textTertiary,
        fontWeight: '600',
        minWidth: 32,
        textAlign: 'right',
    },
});
