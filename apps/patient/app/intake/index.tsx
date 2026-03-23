import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { useIntakeStore } from '../../stores/intakeStore';
import { t } from '@cliniqone/i18n';
import { CONSULTATION_COSTS } from '@cliniqone/types';
import { getActiveIntakeSession, deleteIntakeSession } from '@cliniqone/api';
import { useToast } from '../../components/ToastProvider';

export default function IntakePreflightScreen() {
    const { user } = useAuthStore();
    const reset = useIntakeStore((s) => s.reset);
    const requestedDoctorId = useIntakeStore((s) => s.requestedDoctorId);
    const tokenBalance = user?.tokens_balance ?? 0;
    const cost = CONSULTATION_COSTS.new;
    const hasEnoughTokens = true; // TODO: TESTING ONLY – was: tokenBalance >= cost
    const profileComplete = !!(user?.gender && user?.country && user?.year_of_birth);
    const toast = useToast((s) => s.show);

    // ── Resume session state ────────────────────
    const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
    const [existingSessionDate, setExistingSessionDate] = useState<string | null>(null);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        checkForExistingSession();
    }, []);

    async function checkForExistingSession() {
        if (!user?.id) {
            setCheckingSession(false);
            return;
        }
        try {
            const existing = await getActiveIntakeSession(user.id);
            if (existing) {
                setExistingSessionId(existing.id);
                setExistingSessionDate(
                    new Date(existing.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })
                );
            }
        } catch (err) {
            console.warn('Session check failed:', err);
        }
        setCheckingSession(false);
    }

    function handleStart() {
        if (!profileComplete) {
            toast(t('intake.profileIncompleteToast'), 'warning');
            router.push('/settings/edit-profile');
            return;
        }
        router.push('/intake/ai-chat');
    }

    async function handleStartFresh() {
        console.log('[Start Fresh] Starting...');
        try {
            // Delete the old session first
            if (existingSessionId) {
                try {
                    await deleteIntakeSession(existingSessionId);
                    console.log('[Start Fresh] Old session deleted');
                } catch (err) {
                    console.warn('[Start Fresh] Delete session failed (non-blocking):', err);
                }
            }
            // Reset the intake store
            reset();
            setExistingSessionId(null);
            console.log('[Start Fresh] Navigating to ai-chat...');
            router.push('/intake/ai-chat');
        } catch (err) {
            console.error('[Start Fresh] Unexpected error:', err);
            // Force navigate even on error
            reset();
            router.push('/intake/ai-chat');
        }
    }

    function confirmStartFresh() {
        if (Platform.OS === 'web') {
            // Expo web suppresses window.confirm() — just proceed directly
            handleStartFresh().catch((err) => {
                console.error('[Start Fresh] Unhandled error:', err);
                reset();
                router.push('/intake/ai-chat');
            });
        } else {
            Alert.alert(
                t('intake.startFreshConfirmTitle'),
                t('intake.startFreshConfirmMsg'),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('intake.startFresh'), style: 'destructive', onPress: () => handleStartFresh() },
                ],
            );
        }
    }

    function handleResume() {
        if (!profileComplete) { handleStart(); return; }
        // Don't reset the store — ai-chat will detect and restore the session
        router.push('/intake/ai-chat');
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('intake.title')}</Text>
                    <Text style={styles.subtitle}>{t('intake.subtitle')}</Text>
                </View>

                {/* Resume Banner */}
                {checkingSession ? (
                    <View style={styles.resumeBanner}>
                        <ActivityIndicator size="small" color={colors.accentTeal} />
                    </View>
                ) : existingSessionId ? (
                    <View style={styles.resumeBanner}>
                        <View style={styles.resumeContent}>
                            <Text style={styles.resumeIcon}>📝</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.resumeTitle}>{t('intake.unfinishedSession')}</Text>
                                <Text style={styles.resumeDate}>{t('intake.startedAt', { date: existingSessionDate || '' })}</Text>
                            </View>
                        </View>
                        <View style={styles.resumeActions}>
                            <TouchableOpacity style={styles.resumeButton} onPress={handleResume}>
                                <Text style={styles.resumeButtonText}>{t('intake.resume')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.startFreshButton}
                                onPress={confirmStartFresh}
                            >
                                <Text style={styles.startFreshText}>{t('intake.startFresh')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : null}

                {/* Consultation Type */}
                <View style={styles.specialtyCard}>
                    <Text style={styles.specialtyIcon}>🏥</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.specialtyValue}>{t('intake.generalMedicalConsultation')}</Text>
                        <Text style={styles.specialtyLabel}>{t('intake.generalMedicalDesc')}</Text>
                    </View>
                </View>

                {/* Choose Doctor */}
                <TouchableOpacity
                    style={styles.doctorSelectCard}
                    onPress={() => router.push('/intake/doctor-select' as never)}
                >
                    <Text style={styles.specialtyIcon}>👨‍⚕️</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.specialtyValue}>Choose Your Doctor</Text>
                        {requestedDoctorId ? (
                            <Text style={[styles.specialtyLabel, { color: colors.accentTeal }]}>Doctor selected ✓</Text>
                        ) : (
                            <Text style={styles.specialtyLabel}>Optional — search, enter code, or skip</Text>
                        )}
                    </View>
                    <Text style={{ color: colors.textTertiary, fontSize: 18 }}>›</Text>
                </TouchableOpacity>

                {/* Pre-flight Checks */}
                <Text style={styles.sectionTitle}>{t('intake.preflightChecks')}</Text>

                <CheckItem
                    icon={profileComplete ? '✅' : '⚠️'}
                    title={t('intake.profileCheck')}
                    subtitle={profileComplete ? t('intake.profileComplete') : t('intake.profileIncomplete')}
                    ok={profileComplete}
                />
                <CheckItem
                    icon={hasEnoughTokens ? '✅' : '❌'}
                    title={t('intake.tokenCheck')}
                    subtitle={`${tokenBalance} / ${cost} ${t('tokens.tokensLabel')} ${t('intake.required')}`}
                    ok={hasEnoughTokens}
                />

                {/* How It Works */}
                <Text style={[styles.sectionTitle, { marginTop: spacing['2xl'] }]}>{t('intake.howItWorks')}</Text>
                <View style={styles.stepsList}>
                    <StepRow num="1" text={t('intake.step1')} time="~2 min" />
                    <StepRow num="2" text={t('intake.step2')} time="~5 min" />
                    <StepRow num="3" text={t('intake.step3')} time="~2 min" />
                    <StepRow num="4" text={t('intake.step4')} time="~1 min" />
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        ℹ️ {t('intake.disclaimer')}
                    </Text>
                </View>

                {/* Start Button — only show when no resume banner */}
                {!existingSessionId && (
                    <Button
                        title={t('intake.startIntake')}
                        onPress={handleStart}
                        size="lg"
                        disabled={!hasEnoughTokens || !profileComplete}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function CheckItem({ icon, title, subtitle, ok }: { icon: string; title: string; subtitle: string; ok: boolean }) {
    return (
        <View style={[styles.checkItem, !ok && styles.checkItemWarning]}>
            <Text style={styles.checkIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
                <Text style={styles.checkTitle}>{title}</Text>
                <Text style={[styles.checkSubtitle, !ok && styles.checkSubtitleWarning]}>{subtitle}</Text>
            </View>
        </View>
    );
}

function StepRow({ num, text, time }: { num: string; text: string; time: string }) {
    return (
        <View style={styles.stepRow}>
            <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{num}</Text>
            </View>
            <Text style={styles.stepText}>{text}</Text>
            <Text style={styles.stepTime}>{time}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing['2xl'] },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    title: { ...typography.h2, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },

    // Resume Banner
    resumeBanner: {
        backgroundColor: `${colors.accentTeal}15`,
        borderWidth: 1,
        borderColor: colors.accentTeal,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    resumeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    resumeIcon: { fontSize: 28 },
    resumeTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    resumeDate: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
    resumeActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    resumeButton: {
        flex: 1,
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    resumeButtonText: { ...typography.body, color: '#fff', fontWeight: '700' },
    startFreshButton: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.textTertiary,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    startFreshText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },

    specialtyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.md,
    },
    doctorSelectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing['2xl'],
        borderWidth: 1,
        borderColor: colors.border,
    },
    specialtyIcon: { fontSize: 32 },
    specialtyLabel: { ...typography.caption, color: colors.textTertiary },
    specialtyValue: { ...typography.h4, color: colors.textPrimary },

    sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },

    checkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    checkItemWarning: { borderColor: colors.warning, backgroundColor: colors.warningFaded },
    checkIcon: { fontSize: 20 },
    checkTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    checkSubtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
    checkSubtitleWarning: { color: colors.warning },

    stepsList: { gap: spacing.sm, marginBottom: spacing['2xl'] },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    stepNum: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.accentTealFaded,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumText: { ...typography.label, color: colors.accentTeal },
    stepText: { ...typography.body, color: colors.textPrimary, flex: 1 },
    stepTime: { ...typography.caption, color: colors.textTertiary },

    disclaimer: {
        backgroundColor: colors.infoFaded,
        padding: spacing.lg,
        borderRadius: radius.md,
        marginBottom: spacing['2xl'],
    },
    disclaimerText: { ...typography.bodySm, color: colors.accentBlueLight, lineHeight: 18 },
});
