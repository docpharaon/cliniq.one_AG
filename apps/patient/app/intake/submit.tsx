import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { CONSULTATION_COSTS } from '@cliniqone/types';
import { useIntakeStore } from '../../stores/intakeStore';
import { useAuthStore } from '../../stores/authStore';
import { useCreateConsultation } from '../../hooks/useConsultations';

export default function SubmitScreen() {
    const [phase, setPhase] = useState<'submitting' | 'success' | 'error'>('submitting');
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0.7)).current;
    const { user } = useAuthStore();
    const intake = useIntakeStore();
    const mutation = useCreateConsultation();

    useEffect(() => {
        // Create real consultation
        mutation.mutate(
            {
                patientId: user?.id || '',
                specialty: intake.specialty,
                chiefComplaint: intake.chiefComplaint,
                medications: intake.medications,
                allergies: intake.allergies,
                aiSession: { qaHistory: intake.qaHistory, aiSummary: intake.aiSummary, photos: intake.photos },
                tokenCost: CONSULTATION_COSTS.new,
            },
            {
                onSuccess: () => {
                    setPhase('success');
                    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
                    intake.reset();
                },
                onError: () => {
                    setPhase('error');
                },
            },
        );

        // Pulse while submitting
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.7, duration: 600, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    if (phase === 'submitting') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Animated.Text style={[styles.bigIcon, { opacity: pulseAnim }]}>📤</Animated.Text>
                    <Text style={styles.title}>{t('intake.submitting')}</Text>
                    <Text style={styles.subtitle}>{t('intake.submittingDesc')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.center}>
                <Animated.Text style={[styles.bigIcon, { transform: [{ scale: scaleAnim }] }]}>✅</Animated.Text>
                <Text style={styles.titleSuccess}>{t('intake.submitted')}</Text>
                <Text style={styles.subtitle}>{t('intake.submittedDesc')}</Text>

                {/* Timeline */}
                <View style={styles.timeline}>
                    <TimelineItem icon="✅" label={t('intake.timelineSubmitted')} active />
                    <TimelineItem icon="🤖" label={t('intake.timelineAI')} />
                    <TimelineItem icon="👨‍⚕️" label={t('intake.timelineDoctor')} time="2-4 hrs" />
                    <TimelineItem icon="📋" label={t('intake.timelineReport')} />
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <Button
                        title={t('intake.viewConsultations')}
                        onPress={() => router.replace('/(tabs)/consultations')}
                        size="lg"
                    />
                    <View style={{ height: spacing.md }} />
                    <Button
                        title={t('intake.backToDashboard')}
                        onPress={() => router.replace('/(tabs)')}
                        variant="outline"
                        size="lg"
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

function TimelineItem({ icon, label, time, active }: { icon: string; label: string; time?: string; active?: boolean }) {
    return (
        <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, active && styles.timelineDotActive]}>
                <Text style={styles.timelineIcon}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.timelineLabel, active && styles.timelineLabelActive]}>{label}</Text>
                {time && <Text style={styles.timelineTime}>{time}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },

    bigIcon: { fontSize: 72, marginBottom: spacing.xl },
    title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
    titleSuccess: { ...typography.h1, color: colors.success, textAlign: 'center' },
    subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing['3xl'] },

    timeline: { width: '100%', gap: spacing.lg, marginBottom: spacing['3xl'] },
    timelineItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    timelineDot: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.bgTertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timelineDotActive: { backgroundColor: colors.successFaded },
    timelineIcon: { fontSize: 18 },
    timelineLabel: { ...typography.body, color: colors.textSecondary },
    timelineLabelActive: { color: colors.textPrimary, fontWeight: '600' },
    timelineTime: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },

    actions: { width: '100%' },
});
