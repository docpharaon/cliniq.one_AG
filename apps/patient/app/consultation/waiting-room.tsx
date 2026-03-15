import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { CONSULT } from '@cliniqone/config';
import { useConsultation } from '../../hooks/useConsultations';
import { subscribeToConsultation } from '@cliniqone/api';
import type { Consultation, ConsultationStatus } from '@cliniqone/types';

// ── Steps definition ─────────────────────────────
const STEPS: { key: ConsultationStatus; icon: string; label: string }[] = [
    { key: 'submitted', icon: '📤', label: 'Submitted' },
    { key: 'assigned', icon: '👨‍⚕️', label: 'Doctor Assigned' },
    { key: 'in_progress', icon: '🔄', label: 'In Review' },
    { key: 'report_ready', icon: '📋', label: 'Report Ready' },
];

const STATUS_ORDER: ConsultationStatus[] = ['submitted', 'assigned', 'in_progress', 'report_ready', 'completed'];

// ── Health tips while waiting ────────────────────
const HEALTH_TIPS = [
    { icon: '💧', text: 'Stay hydrated — aim for 8 glasses of water daily.' },
    { icon: '🚶', text: 'A 30-minute walk each day can improve your mood and heart health.' },
    { icon: '😴', text: 'Adults need 7-9 hours of sleep for optimal health.' },
    { icon: '🥗', text: 'Add more fruits and vegetables to your diet for better nutrition.' },
    { icon: '🧘', text: 'Practice deep breathing for 5 minutes to reduce stress.' },
];

function getStepIndex(status: ConsultationStatus): number {
    const idx = STATUS_ORDER.indexOf(status);
    return idx >= 0 ? idx : 0;
}

export default function WaitingRoomScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: consultation, refetch } = useConsultation(id || '');
    const [currentStatus, setCurrentStatus] = useState<ConsultationStatus>('submitted');
    const [tipIndex, setTipIndex] = useState(0);
    const pulseAnim = useRef(new Animated.Value(0.6)).current;
    const dotAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;

    // Subscribe to real-time updates
    useEffect(() => {
        if (!id) return;
        const channel = subscribeToConsultation(id, (update) => {
            if (update.status) {
                setCurrentStatus(update.status as ConsultationStatus);
            }
        });
        return () => { channel.unsubscribe(); };
    }, [id]);

    // Sync from fetched data
    useEffect(() => {
        if (consultation?.status) {
            setCurrentStatus(consultation.status as ConsultationStatus);
        }
    }, [consultation?.status]);

    // Pulse animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Step dot animations
    useEffect(() => {
        const activeIdx = getStepIndex(currentStatus);
        dotAnims.forEach((anim, i) => {
            Animated.spring(anim, {
                toValue: i <= activeIdx ? 1 : 0,
                friction: 5,
                useNativeDriver: true,
            }).start();
        });
    }, [currentStatus]);

    // Rotate health tips
    useEffect(() => {
        const interval = setInterval(() => {
            setTipIndex((prev) => (prev + 1) % HEALTH_TIPS.length);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    const activeStepIdx = getStepIndex(currentStatus);
    const isComplete = currentStatus === 'report_ready' || currentStatus === 'completed';
    const tip = HEALTH_TIPS[tipIndex];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('waitingRoom.title')}</Text>
                    <Text style={styles.subtitle}>{t('waitingRoom.subtitle')}</Text>
                </View>

                {/* Progress Stepper */}
                <View style={styles.stepper}>
                    {STEPS.map((step, i) => {
                        const isActive = i <= activeStepIdx;
                        const isCurrent = i === activeStepIdx;
                        return (
                            <View key={step.key} style={styles.stepRow}>
                                <View style={styles.stepLeft}>
                                    <Animated.View style={[
                                        styles.stepDot,
                                        isActive && styles.stepDotActive,
                                        isCurrent && styles.stepDotCurrent,
                                        {
                                            transform: [{
                                                scale: dotAnims[i].interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0.8, 1],
                                                }),
                                            }],
                                        },
                                    ]}>
                                        <Text style={styles.stepIcon}>{isActive ? step.icon : '○'}</Text>
                                    </Animated.View>
                                    {i < STEPS.length - 1 && (
                                        <View style={[styles.stepLine, isActive && i < activeStepIdx && styles.stepLineActive]} />
                                    )}
                                </View>
                                <View style={styles.stepInfo}>
                                    <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                                        {step.label}
                                    </Text>
                                    {isCurrent && !isComplete && (
                                        <Animated.Text style={[styles.stepCurrentTag, { opacity: pulseAnim }]}>
                                            ● {t('waitingRoom.current')}
                                        </Animated.Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Estimated Wait */}
                {!isComplete && (
                    <View style={styles.waitCard}>
                        <Text style={styles.waitIcon}>⏱️</Text>
                        <View>
                            <Text style={styles.waitTitle}>{t('waitingRoom.estimatedWait')}</Text>
                            <Text style={styles.waitTime}>2–{CONSULT.MAX_WAIT_HOURS} {t('waitingRoom.hours')}</Text>
                        </View>
                    </View>
                )}

                {/* Health Tip */}
                {!isComplete && (
                    <View style={styles.tipCard}>
                        <Text style={styles.tipIcon}>{tip.icon}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tipLabel}>{t('waitingRoom.healthTip')}</Text>
                            <Text style={styles.tipText}>{tip.text}</Text>
                        </View>
                    </View>
                )}

                {/* CTA when complete */}
                {isComplete && (
                    <View style={styles.completeSection}>
                        <Text style={styles.completeIcon}>🎉</Text>
                        <Text style={styles.completeTitle}>{t('waitingRoom.reportReady')}</Text>
                        <Text style={styles.completeSubtitle}>{t('waitingRoom.reportReadyDesc')}</Text>
                        <View style={{ width: '100%', marginTop: spacing.xl }}>
                            <Button
                                title={t('waitingRoom.viewConsultation')}
                                onPress={() => router.replace(`/consultation/${id}`)}
                                size="lg"
                            />
                        </View>
                    </View>
                )}

                {/* Bottom actions */}
                {!isComplete && (
                    <View style={styles.bottomActions}>
                        <Button
                            title={t('waitingRoom.viewDetails')}
                            onPress={() => router.push(`/consultation/${id}`)}
                            variant="outline"
                            size="lg"
                        />
                        <View style={{ height: spacing.md }} />
                        <Button
                            title={t('intake.backToDashboard')}
                            onPress={() => router.replace('/(tabs)')}
                            variant="ghost"
                            size="md"
                        />
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    content: { flex: 1, paddingHorizontal: spacing.xl },

    // Header
    header: { paddingTop: spacing.lg, marginBottom: spacing['2xl'] },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    title: { ...typography.h1, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },

    // Stepper
    stepper: { marginBottom: spacing['2xl'] },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
    stepLeft: { alignItems: 'center', width: 48 },
    stepDot: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.bgTertiary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
    },
    stepDotActive: {
        backgroundColor: colors.accentTealFaded,
        borderColor: colors.accentTeal,
    },
    stepDotCurrent: {
        ...shadows.glow(colors.accentTeal),
    },
    stepIcon: { fontSize: 18 },
    stepLine: {
        width: 2,
        height: 28,
        backgroundColor: colors.border,
    },
    stepLineActive: { backgroundColor: colors.accentTeal },
    stepInfo: { flex: 1, marginLeft: spacing.md, paddingTop: spacing.sm },
    stepLabel: { ...typography.body, color: colors.textTertiary },
    stepLabelActive: { color: colors.textPrimary, fontWeight: '600' },
    stepCurrentTag: { ...typography.caption, color: colors.accentTeal, fontWeight: '600', marginTop: spacing.xxs },

    // Wait card
    waitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        backgroundColor: colors.bgCard,
        padding: spacing.xl,
        borderRadius: radius.xl,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    waitIcon: { fontSize: 28 },
    waitTitle: { ...typography.label, color: colors.textSecondary },
    waitTime: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.xxs },

    // Health tip
    tipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.accentTealFaded,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
    },
    tipIcon: { fontSize: 24 },
    tipLabel: { ...typography.caption, color: colors.accentTeal, fontWeight: '600', marginBottom: spacing.xxs },
    tipText: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 18 },

    // Complete
    completeSection: { alignItems: 'center', paddingVertical: spacing['2xl'] },
    completeIcon: { fontSize: 56, marginBottom: spacing.lg },
    completeTitle: { ...typography.h2, color: colors.success, textAlign: 'center' },
    completeSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },

    // Bottom
    bottomActions: { marginTop: 'auto' as any, paddingBottom: spacing['2xl'] },
});
