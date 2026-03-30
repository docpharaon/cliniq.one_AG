// ─────────────────────────────────────────────────
// FIG_55: Drug Label Analysis Results
// Displays OCR extraction results, cross-validation panel,
// and AI confidence bar after analyzing a drug label photo.
// ─────────────────────────────────────────────────
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import type { DrugLabelAnalysis } from '../services/aiService';

interface DrugAnalysisResultsProps {
    /** The analysis result from the Vision API */
    analysis: DrugLabelAnalysis;
    /** Original photo URI for display */
    photoUri?: string;
    /** Called when user confirms the results */
    onConfirm: () => void;
    /** Called when user wants to retake the photo */
    onRetake: () => void;
}

// ── Match status config ──────────────────────────
const MATCH_CONFIG = {
    match: {
        emoji: '✅',
        label: 'drugAnalysis.match',
        color: colors.success,
        bgColor: colors.successFaded,
    },
    partial_match: {
        emoji: '⚠️',
        label: 'drugAnalysis.partialMatch',
        color: colors.warning,
        bgColor: colors.warningFaded,
    },
    mismatch: {
        emoji: '❌',
        label: 'drugAnalysis.mismatch',
        color: colors.error,
        bgColor: colors.errorFaded,
    },
    unable_to_read: {
        emoji: '❓',
        label: 'drugAnalysis.unableToRead',
        color: colors.textTertiary,
        bgColor: colors.bgTertiary,
    },
};

export function DrugAnalysisResults({
    analysis,
    photoUri,
    onConfirm,
    onRetake,
}: DrugAnalysisResultsProps) {
    const matchConfig = MATCH_CONFIG[analysis.crossValidation.overallMatch as keyof typeof MATCH_CONFIG];

    return (
        <View style={styles.container}>
            {/* Source photo thumbnail + processing time */}
            {photoUri && (
                <View style={styles.sourceRow}>
                    <Image source={{ uri: photoUri }} style={styles.sourceThumbnail} />
                    <View style={styles.sourceInfo}>
                        <Text style={styles.sourceLabel}>{t('drugAnalysis.sourceImage')}</Text>
                        <Text style={styles.sourceNote}>{t('drugAnalysis.aiProcessed')}</Text>
                    </View>
                </View>
            )}

            {/* Extracted Information Panel */}
            <View style={styles.panel}>
                <Text style={styles.panelTitle}>{t('drugAnalysis.extractedInfo')}</Text>

                <View style={styles.extractRow}>
                    <Text style={styles.extractLabel}>{t('drugAnalysis.drugName')}</Text>
                    <View style={styles.extractValueRow}>
                        <Text style={styles.extractValue}>
                            {analysis.extracted.drugName || '—'}
                        </Text>
                        {analysis.crossValidation.nameMatch && (
                            <Text style={styles.checkMark}>✓</Text>
                        )}
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.extractRow}>
                    <Text style={styles.extractLabel}>{t('drugAnalysis.dosage')}</Text>
                    <View style={styles.extractValueRow}>
                        <Text style={styles.extractValue}>
                            {analysis.extracted.dosage || '—'}
                        </Text>
                        {analysis.crossValidation.dosageMatch && (
                            <Text style={styles.checkMark}>✓</Text>
                        )}
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.extractRow}>
                    <Text style={styles.extractLabel}>{t('drugAnalysis.form')}</Text>
                    <Text style={styles.extractValue}>
                        {analysis.extracted.form || '—'}
                    </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.extractRow}>
                    <Text style={styles.extractLabel}>{t('drugAnalysis.manufacturer')}</Text>
                    <Text style={[styles.extractValue, styles.manufacturerText]}>
                        {analysis.extracted.manufacturer || '—'}
                    </Text>
                </View>

                {analysis.extracted.expiryDate && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.extractRow}>
                            <Text style={styles.extractLabel}>{t('drugAnalysis.expiry')}</Text>
                            <Text style={styles.extractValue}>
                                {analysis.extracted.expiryDate}
                            </Text>
                        </View>
                    </>
                )}
            </View>

            {/* Cross-Validation Result */}
            <View style={[styles.matchPanel, { backgroundColor: matchConfig.bgColor, borderColor: matchConfig.color }]}>
                <View style={styles.matchHeader}>
                    <Text style={styles.matchEmoji}>{matchConfig.emoji}</Text>
                    <Text style={[styles.matchLabel, { color: matchConfig.color }]}>
                        {t(matchConfig.label)}
                    </Text>
                </View>

                {/* Discrepancies */}
                {analysis.crossValidation.discrepancies.length > 0 && (
                    <View style={styles.discrepancies}>
                        {analysis.crossValidation.discrepancies.map((disc: string, i: number) => (
                            <Text key={i} style={styles.discrepancyText}>• {disc}</Text>
                        ))}
                    </View>
                )}

                {/* Processing note */}
                {analysis.processingNote && (
                    <Text style={styles.processingNote}>{analysis.processingNote}</Text>
                )}
            </View>

            {/* AI Confidence Bar */}
            <View style={styles.confidencePanel}>
                <View style={styles.confidenceHeader}>
                    <Text style={styles.confidenceLabel}>{t('drugAnalysis.aiConfidence')}</Text>
                    <Text style={[
                        styles.confidenceValue,
                        {
                            color: analysis.confidence >= 80
                                ? colors.success
                                : analysis.confidence >= 50
                                    ? colors.warning
                                    : colors.error,
                        },
                    ]}>
                        {analysis.confidence}%
                    </Text>
                </View>
                <View style={styles.confidenceBarOuter}>
                    <View
                        style={[
                            styles.confidenceBarInner,
                            {
                                width: `${Math.min(analysis.confidence, 100)}%`,
                                backgroundColor: analysis.confidence >= 80
                                    ? colors.success
                                    : analysis.confidence >= 50
                                        ? colors.warning
                                        : colors.error,
                            },
                        ]}
                    />
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={onConfirm}
                    activeOpacity={0.7}
                >
                    <Text style={styles.confirmButtonText}>
                        ✅ {t('drugAnalysis.confirmContinue')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={onRetake}
                    activeOpacity={0.7}
                >
                    <Text style={styles.retakeButtonText}>
                        📷 {t('drugAnalysis.retakePhoto')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Styles ────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        padding: spacing.lg,
    },
    // Source image
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        gap: spacing.md,
    },
    sourceThumbnail: {
        width: 56,
        height: 56,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sourceInfo: {
        flex: 1,
    },
    sourceLabel: {
        ...typography.label,
        color: colors.textPrimary,
    },
    sourceNote: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    // Extracted info panel
    panel: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.card,
    },
    panelTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
    },
    extractRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    extractLabel: {
        ...typography.label,
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    extractValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    extractValue: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '500',
        textAlign: 'right',
    },
    manufacturerText: {
        color: colors.info,
    },
    checkMark: {
        color: colors.success,
        fontSize: 14,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
    },
    // Match panel
    matchPanel: {
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
    },
    matchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    matchEmoji: {
        fontSize: 20,
    },
    matchLabel: {
        ...typography.h4,
    },
    discrepancies: {
        marginTop: spacing.md,
    },
    discrepancyText: {
        ...typography.bodySm,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    processingNote: {
        ...typography.caption,
        color: colors.textTertiary,
        fontStyle: 'italic',
        marginTop: spacing.sm,
    },
    // Confidence bar
    confidencePanel: {
        marginBottom: spacing.xl,
    },
    confidenceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    confidenceLabel: {
        ...typography.label,
        color: colors.textSecondary,
    },
    confidenceValue: {
        ...typography.h3,
        fontWeight: '700',
    },
    confidenceBarOuter: {
        height: 8,
        backgroundColor: colors.bgTertiary,
        borderRadius: radius.full,
        overflow: 'hidden',
    },
    confidenceBarInner: {
        height: '100%',
        borderRadius: radius.full,
    },
    // Actions
    actions: {
        gap: spacing.md,
    },
    confirmButton: {
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.lg,
        borderRadius: radius.lg,
        alignItems: 'center',
        ...shadows.elevated,
    },
    confirmButtonText: {
        ...typography.button,
        color: colors.textInverse,
    },
    retakeButton: {
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    retakeButtonText: {
        ...typography.buttonSm,
        color: colors.textSecondary,
    },
});
