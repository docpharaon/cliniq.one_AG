import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';

export default function WelcomeScreen() {
    const user = useAuthStore((state) => state.user);
    const nickname = user?.nickname || 'there';

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Celebration */}
                <View style={styles.celebrationSection}>
                    <Text style={styles.confetti}>🎉</Text>
                    <Text style={styles.title}>{t('welcome.title')}</Text>
                    <Text style={styles.subtitle}>{t('welcome.accountCreated')}</Text>
                </View>

                {/* Personal Greeting */}
                <View style={styles.greetingCard}>
                    <Text style={styles.greetingText}>
                        {t('welcome.greeting', { name: nickname })}
                    </Text>
                </View>

                {/* Token Bonus */}
                <View style={styles.bonusCard}>
                    <View style={styles.bonusHeader}>
                        <Text style={styles.bonusIcon}>🎁</Text>
                        <Text style={styles.bonusTitle}>{t('welcome.welcomeBonus')}</Text>
                    </View>
                    <Text style={styles.bonusDesc}>{t('welcome.freeConsults')}</Text>
                    <View style={styles.tokenBadge}>
                        <Text style={styles.tokenAmount}>+100</Text>
                        <Text style={styles.tokenLabel}>Tokens</Text>
                    </View>
                </View>

                {/* What's Next */}
                <Text style={styles.whatsNextTitle}>{t('welcome.whatsNext')}</Text>
                <View style={styles.stepsList}>
                    <StepItem number="1" emoji="🤖" title="Answer AI questions" time="~10 min" />
                    <StepItem number="2" emoji="👨‍⚕️" title="Doctor reviews & responds" time="2-4 hours" />
                    <StepItem number="3" emoji="📋" title="Get treatment plan & e-prescription" time="" />
                </View>

                {/* CTAs */}
                <View style={styles.ctaSection}>
                    <Button
                        title={`📱 ${t('welcome.takeTour')}`}
                        onPress={() => {
                            // Tour not implemented yet — go to dashboard
                            router.replace('/(tabs)');
                        }}
                        variant="outline"
                        size="lg"
                    />
                    <View style={{ height: spacing.md }} />
                    <Button
                        title={t('welcome.skipToDashboard')}
                        onPress={() => router.replace('/(tabs)')}
                        size="lg"
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function StepItem({ number, emoji, title, time }: { number: string; emoji: string; title: string; time: string }) {
    return (
        <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{number}</Text>
            </View>
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{emoji} {title}</Text>
                {time ? <Text style={styles.stepTime}>{time}</Text> : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['6xl'] },

    // Celebration
    celebrationSection: { alignItems: 'center', paddingTop: spacing['4xl'], marginBottom: spacing['2xl'] },
    confetti: { fontSize: 64, marginBottom: spacing.lg },
    title: { ...typography.h1, color: colors.textPrimary, textAlign: 'center' },
    subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },

    // Greeting
    greetingCard: {
        backgroundColor: colors.accentTealFaded,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing['2xl'],
        borderWidth: 1,
        borderColor: colors.accentTeal,
    },
    greetingText: { ...typography.bodyLg, color: colors.accentTealLight, textAlign: 'center', lineHeight: 24 },

    // Bonus Card
    bonusCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing['3xl'],
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    bonusHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    bonusIcon: { fontSize: 24 },
    bonusTitle: { ...typography.h3, color: colors.textPrimary },
    bonusDesc: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
    tokenBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing.xs,
        backgroundColor: colors.successFaded,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
    },
    tokenAmount: { ...typography.h2, color: colors.success },
    tokenLabel: { ...typography.body, color: colors.success },

    // What's Next
    whatsNextTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.lg },
    stepsList: { gap: spacing.lg, marginBottom: spacing['3xl'] },
    stepItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.accentTealFaded,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: { ...typography.h4, color: colors.accentTeal },
    stepContent: { flex: 1 },
    stepTitle: { ...typography.body, color: colors.textPrimary },
    stepTime: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },

    // CTAs
    ctaSection: { marginTop: spacing.lg },
});
