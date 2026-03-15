import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';

export default function AnalyzingScreen() {
    const { complaint } = useLocalSearchParams<{ complaint: string }>();
    const pulseAnim = useRef(new Animated.Value(0.6)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
            ])
        ).start();

        // Rotate animation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 3000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Simulate AI analysis delay, then navigate to questions
        const timer = setTimeout(() => {
            router.replace({
                pathname: '/intake/questions',
                params: { complaint, round: '1' },
            });
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Progress */}
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '25%' }]} />
                </View>

                {/* Animated Icon */}
                <Animated.View style={[styles.iconContainer, { opacity: pulseAnim }]}>
                    <Animated.Text style={[styles.icon, { transform: [{ rotate: spin }] }]}>🧠</Animated.Text>
                </Animated.View>

                <Text style={styles.title}>{t('intake.analyzing')}</Text>
                <Text style={styles.subtitle}>{t('intake.analyzingDesc')}</Text>

                {/* Steps */}
                <View style={styles.steps}>
                    <AnalysisStep text={t('intake.analyzingStep1')} delay={0} />
                    <AnalysisStep text={t('intake.analyzingStep2')} delay={1000} />
                    <AnalysisStep text={t('intake.analyzingStep3')} delay={2000} />
                </View>
            </View>
        </SafeAreaView>
    );
}

function AnalysisStep({ text, delay }: { text: string; delay: number }) {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const timer = setTimeout(() => {
            Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }, delay);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View style={[styles.stepRow, { opacity }]}>
            <Text style={styles.stepCheck}>✅</Text>
            <Text style={styles.stepText}>{text}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
    progressBar: { position: 'absolute', top: spacing.xl, left: spacing.xl, right: spacing.xl, height: 4, backgroundColor: colors.bgTertiary, borderRadius: 2 },
    progressFill: { height: 4, backgroundColor: colors.accentTeal, borderRadius: 2 },

    iconContainer: { marginBottom: spacing['2xl'] },
    icon: { fontSize: 64 },

    title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing['3xl'] },

    steps: { gap: spacing.lg },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    stepCheck: { fontSize: 16 },
    stepText: { ...typography.body, color: colors.textPrimary },
});
