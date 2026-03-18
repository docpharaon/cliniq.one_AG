import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { CONSULTATION_COSTS } from '@cliniqone/types';
import { COUNTRIES } from '@cliniqone/config';
import { useAuthStore } from '../../stores/authStore';
import { useIntakeStore } from '../../stores/intakeStore';

export default function ReviewScreen() {
    const { user } = useAuthStore();
    const { chiefComplaint, specialty, qaHistory, medications, allergies, aiSummary } = useIntakeStore();
    const summary = aiSummary as Record<string, unknown> | null;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '95%' }]} />
                    </View>
                </View>

                <Text style={styles.title}>📋 {t('intake.reviewTitle')}</Text>
                <Text style={styles.subtitle}>{t('intake.reviewDesc')}</Text>

                {/* Summary Cards */}
                <ReviewCard icon="🏥" title={t('intake.specialty')} value={specialty || 'General Consultation'} />
                <ReviewCard icon="💬" title={t('intake.chiefComplaintTitle')} value={chiefComplaint || '—'} />
                <ReviewCard icon="🤖" title={t('aiChat.title')} value={`${qaHistory.length} ${t('aiChat.questionsAnswered')}`} />
                <ReviewCard icon="💊" title={t('intake.medsTitle')} value={medications.length > 0 ? medications.join(', ') : t('intake.noCurrentMeds')} />
                <ReviewCard icon="⚠️" title={t('intake.allergiesTitle')} value={allergies.length > 0 ? allergies.join(', ') : t('intake.noKnownAllergies')} />

                {/* Medical History Summary */}
                {summary && (
                    <View style={styles.historyCard}>
                        <Text style={styles.historyTitle}>📄 Medical History Summary</Text>

                        {/* Narrative paragraph from AI — skip if using raw fallback */}
                        {!summary.raw && (summary.summary || summary.hpi) ? (
                            <Text style={styles.historyText}>
                                {summary.summary as string || ''}
                                {summary.hpi && summary.summary ? '\n\n' : ''}
                                {summary.hpi && !summary.summary ? (summary.hpi as string) : ''}
                            </Text>
                        ) : null}

                        {/* HPI */}
                        {summary.hpi && summary.summary ? (
                            <View style={styles.historySection}>
                                <Text style={styles.historySectionLabel}>History of Present Illness</Text>
                                <Text style={styles.historyText}>{summary.hpi as string}</Text>
                            </View>
                        ) : null}

                        {/* PMH */}
                        {summary.pmh ? (
                            <View style={styles.historySection}>
                                <Text style={styles.historySectionLabel}>Past Medical History</Text>
                                <Text style={styles.historyText}>{summary.pmh as string}</Text>
                            </View>
                        ) : null}

                        {/* Family History */}
                        {summary.familyHistory ? (
                            <View style={styles.historySection}>
                                <Text style={styles.historySectionLabel}>Family History</Text>
                                <Text style={styles.historyText}>{summary.familyHistory as string}</Text>
                            </View>
                        ) : null}

                        {/* Social History */}
                        {summary.socialHistory ? (
                            <View style={styles.historySection}>
                                <Text style={styles.historySectionLabel}>Social History</Text>
                                <Text style={styles.historyText}>{summary.socialHistory as string}</Text>
                            </View>
                        ) : null}

                        {/* Assessment */}
                        {summary.assessment ? (
                            <View style={styles.historySection}>
                                <Text style={styles.historySectionLabel}>Assessment</Text>
                                <Text style={styles.historyText}>{summary.assessment as string}</Text>
                            </View>
                        ) : null}

                        {/* Key Findings */}
                        {Array.isArray(summary.keyFindings) && (summary.keyFindings as string[]).length > 0 ? (
                            <View style={styles.historySection}>
                                <Text style={styles.historySectionLabel}>Key Findings</Text>
                                {(summary.keyFindings as string[]).map((f, i) => (
                                    <Text key={i} style={styles.historyBullet}>• {f}</Text>
                                ))}
                            </View>
                        ) : null}

                        {/* Medications (from structured summary) */}
                        {summary.medicationsText ? (
                            <View style={styles.historySection}>
                                <Text style={styles.historySectionLabel}>Medications</Text>
                                <Text style={styles.historyText}>{summary.medicationsText as string}</Text>
                            </View>
                        ) : null}

                        {/* Allergies (from structured summary) */}
                        {summary.allergiesText ? (
                            <View style={styles.historySection}>
                                <Text style={styles.historySectionLabel}>Allergies</Text>
                                <Text style={styles.historyText}>{summary.allergiesText as string}</Text>
                            </View>
                        ) : null}

                        {/* Review of Systems */}
                        {summary.reviewOfSystems ? (
                            <View style={styles.historySection}>
                                <Text style={styles.historySectionLabel}>Review of Systems</Text>
                                <Text style={styles.historyText}>{summary.reviewOfSystems as string}</Text>
                            </View>
                        ) : null}

                        {/* Red Flags */}
                        {Array.isArray(summary.redFlags) && (summary.redFlags as string[]).length > 0 ? (
                            <View style={[styles.historySection, styles.redFlagSection]}>
                                <Text style={styles.redFlagLabel}>🚨 Red Flags</Text>
                                {(summary.redFlags as string[]).map((f, i) => (
                                    <Text key={i} style={styles.redFlagText}>• {f}</Text>
                                ))}
                            </View>
                        ) : null}
                    </View>
                )}

                {/* Patient Info */}
                {(() => {
                    const currentYear = new Date().getFullYear();
                    const age = user?.year_of_birth ? currentYear - user.year_of_birth : null;
                    const countryEntry = COUNTRIES.find((c) => c.code === user?.country);
                    const countryLabel = countryEntry ? `${countryEntry.flag} ${countryEntry.name}` : user?.country || null;
                    const genderLabel = user?.gender === 'male' ? 'Male'
                        : user?.gender === 'female' ? 'Female'
                        : user?.gender === 'prefer_not_to_say' ? 'Prefer not to say'
                        : null;
                    const profileIncomplete = !user?.gender || !user?.country || !user?.year_of_birth;

                    return (
                        <View style={styles.patientCard}>
                            <View style={styles.patientHeader}>
                                <Text style={styles.patientTitle}>👤 {t('intake.patientInfo')}</Text>
                                <TouchableOpacity onPress={() => router.push('/settings/edit-profile')}>
                                    <Text style={styles.editLink}>✏️ Edit</Text>
                                </TouchableOpacity>
                            </View>

                            {profileIncomplete && (
                                <TouchableOpacity
                                    style={styles.incompleteWarning}
                                    onPress={() => router.push('/settings/edit-profile')}
                                >
                                    <Text style={styles.incompleteText}>
                                        ⚠️ Profile incomplete — tap to add missing info
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <View style={styles.patientRow}>
                                <Text style={styles.patientLabel}>{t('registration.gender')}</Text>
                                <Text style={styles.patientValue}>{genderLabel || '—'}</Text>
                            </View>
                            <View style={styles.patientRow}>
                                <Text style={styles.patientLabel}>Age</Text>
                                <Text style={styles.patientValue}>{age ? `${age} years` : '—'}</Text>
                            </View>
                            <View style={styles.patientRow}>
                                <Text style={styles.patientLabel}>{t('registration.country')}</Text>
                                <Text style={styles.patientValue}>{countryLabel || '—'}</Text>
                            </View>
                            <View style={styles.patientRow}>
                                <Text style={styles.patientLabel}>City</Text>
                                <Text style={styles.patientValue}>{user?.city || '—'}</Text>
                            </View>
                            <View style={styles.patientRow}>
                                <Text style={styles.patientLabel}>Insurance</Text>
                                <Text style={styles.patientValue}>{user?.insurance_provider || 'None'}</Text>
                            </View>
                        </View>
                    );
                })()}

                {/* Cost Summary */}
                <View style={styles.costCard}>
                    <View style={styles.costRow}>
                        <Text style={styles.costLabel}>{t('intake.consultationCost')}</Text>
                        <Text style={styles.costValue}>{CONSULTATION_COSTS.new} {t('tokens.tokensLabel')}</Text>
                    </View>
                    <View style={styles.costRow}>
                        <Text style={styles.costLabel}>{t('intake.yourBalance')}</Text>
                        <Text style={styles.costValue}>{user?.tokens_balance ?? 0} {t('tokens.tokensLabel')}</Text>
                    </View>
                    <View style={[styles.costRow, styles.costRowTotal]}>
                        <Text style={styles.costTotalLabel}>{t('intake.remaining')}</Text>
                        <Text style={styles.costTotalValue}>
                            {(user?.tokens_balance ?? 0) - CONSULTATION_COSTS.new} {t('tokens.tokensLabel')}
                        </Text>
                    </View>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        🔒 {t('intake.reviewDisclaimer')}
                    </Text>
                </View>

                {/* Submit */}
                <Button
                    title={`${t('intake.submitConsultation')} (${CONSULTATION_COSTS.new} ${t('tokens.tokensLabel')})`}
                    onPress={() => router.push('/intake/submit')}
                    size="lg"
                />
            </ScrollView>
        </SafeAreaView>
    );
}

function ReviewCard({ icon, title, value, editable, onEdit }: {
    icon: string; title: string; value: string; editable?: boolean; onEdit?: () => void;
}) {
    return (
        <View style={styles.reviewCard}>
            <View style={styles.reviewCardContent}>
                <Text style={styles.reviewIcon}>{icon}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.reviewLabel}>{title}</Text>
                    <Text style={styles.reviewValue}>{value}</Text>
                </View>
            </View>
            {editable && (
                <TouchableOpacity onPress={onEdit}>
                    <Text style={styles.editText}>✏️ {t('common.edit')}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing.xl },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    progressBar: { height: 4, backgroundColor: colors.bgTertiary, borderRadius: 2 },
    progressFill: { height: 4, backgroundColor: colors.accentTeal, borderRadius: 2 },

    title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing['2xl'] },

    reviewCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    reviewCardContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    reviewIcon: { fontSize: 24 },
    reviewLabel: { ...typography.caption, color: colors.textTertiary },
    reviewValue: { ...typography.body, color: colors.textPrimary, marginTop: 2 },
    editText: { ...typography.bodySm, color: colors.accentTeal, fontWeight: '600', marginTop: spacing.sm },

    patientCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    patientTitle: { ...typography.h4, color: colors.textPrimary },
    patientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    editLink: { ...typography.bodySm, color: colors.accentTeal, fontWeight: '600' },
    incompleteWarning: {
        backgroundColor: colors.warningFaded || '#F59E0B15',
        borderRadius: radius.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.warning || '#F59E0B',
    },
    incompleteText: { ...typography.bodySm, color: colors.warning || '#F59E0B' },
    patientRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
    patientLabel: { ...typography.body, color: colors.textSecondary },
    patientValue: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },

    costCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginVertical: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
    costLabel: { ...typography.body, color: colors.textSecondary },
    costValue: { ...typography.body, color: colors.textPrimary },
    costRowTotal: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.md },
    costTotalLabel: { ...typography.h4, color: colors.textPrimary },
    costTotalValue: { ...typography.h4, color: colors.accentTeal },

    disclaimer: {
        backgroundColor: colors.infoFaded,
        padding: spacing.lg,
        borderRadius: radius.md,
        marginBottom: spacing['2xl'],
    },
    disclaimerText: { ...typography.bodySm, color: colors.accentBlueLight, lineHeight: 18 },

    // Medical history summary
    historyCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    historyTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },
    historyText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
    historySection: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
    historySectionLabel: { ...typography.label, color: colors.accentTeal, marginBottom: spacing.xs, textTransform: 'uppercase' as const },
    historyBullet: { ...typography.body, color: colors.textSecondary, paddingLeft: spacing.sm, marginTop: 2 },
    redFlagSection: { backgroundColor: '#EF444415', borderRadius: radius.md, padding: spacing.md, borderTopWidth: 0 },
    redFlagLabel: { ...typography.label, color: '#EF4444', marginBottom: spacing.xs },
    redFlagText: { ...typography.body, color: '#EF4444', paddingLeft: spacing.sm, marginTop: 2 },
});
