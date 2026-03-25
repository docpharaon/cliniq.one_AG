import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';

export default function AnalyzingScreen() {
    const { complaint } = useLocalSearchParams<{ complaint: string }>();

    useEffect(() => {
        // Navigate to questions after a brief delay
        const timer = setTimeout(() => {
            router.replace({
                pathname: '/intake/questions',
                params: { complaint, round: '1' },
            });
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Progress */}
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '25%' }]} />
                </View>

                {/* Icon */}
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>🧠</Text>
                </View>

                <Text style={styles.title}>{t('intake.analyzing')}</Text>
                <Text style={styles.subtitle}>{t('intake.analyzingDesc')}</Text>

                {/* Steps — all visible immediately */}
                <View style={styles.steps}>
                    <AnalysisStep text={t('intake.analyzingStep1')} />
                    <AnalysisStep text={t('intake.analyzingStep2')} />
                    <AnalysisStep text={t('intake.analyzingStep3')} />
                </View>
            </View>
        </SafeAreaView>
    );
}

function AnalysisStep({ text }: { text: string }) {
    return (
        <View style={styles.stepRow}>
            <Text style={styles.stepCheck}>✅</Text>
            <Text style={styles.stepText}>{text}</Text>
        </View>
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
