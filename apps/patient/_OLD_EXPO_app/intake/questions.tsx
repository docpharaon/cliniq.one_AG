import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { AI } from '@cliniqone/config';

// Simulated AI-generated questions (in production, these come from Supabase Edge Functions)
const SIMULATED_QUESTIONS: Record<number, string[]> = {
    1: [
        'When did you first notice this skin concern?',
        'Where on your body is it located?',
        'Has it changed in size, color, or shape?',
    ],
    2: [
        'Is there any itching, pain, or burning sensation?',
        'Have you tried any treatments so far?',
        'Does it get worse with sun exposure?',
    ],
    3: [
        'Do you have a family history of skin conditions?',
        'Are you currently taking any medications?',
        'Have you had any recent changes to skincare products?',
    ],
};

export default function QuestionsScreen() {
    const params = useLocalSearchParams<{ complaint: string; round: string }>();
    const round = parseInt(params.round || '1', 10);
    const questions = SIMULATED_QUESTIONS[round] || SIMULATED_QUESTIONS[1];

    const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
    const [expandedIdx, setExpandedIdx] = useState(0);

    const progress = Math.min(25 + (round / AI.MAX_INTAKE_ROUNDS) * 50, 75);
    const allAnswered = answers.every((a) => a.trim().length > 0);

    function handleAnswer(index: number, text: string) {
        const newAnswers = [...answers];
        newAnswers[index] = text;
        setAnswers(newAnswers);

        // Auto-advance to next question
        if (text.trim().length > 0 && index < questions.length - 1) {
            setTimeout(() => setExpandedIdx(index + 1), 300);
        }
    }

    function handleContinue() {
        if (!allAnswered) return;

        if (round < 3) {
            // More rounds (simulated — in prod, AI decides if more questions needed)
            router.push({
                pathname: '/intake/questions',
                params: { complaint: params.complaint, round: String(round + 1) },
            });
        } else {
            // Done with questions, move to medications
            router.push('/intake/medications');
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.roundLabel}>
                        {t('intake.round')} {round}/{AI.MAX_INTAKE_ROUNDS}
                    </Text>
                </View>

                <Text style={styles.title}>🤖 {t('intake.questionsTitle')}</Text>
                <Text style={styles.subtitle}>{t('intake.questionsDesc')}</Text>

                {/* Questions */}
                {questions.map((question, idx) => (
                    <View key={idx} style={styles.questionCard}>
                        <TouchableOpacity onPress={() => setExpandedIdx(idx)} style={styles.questionHeader}>
                            <View style={[styles.qBadge, answers[idx].trim() ? styles.qBadgeDone : null]}>
                                <Text style={styles.qBadgeText}>{answers[idx].trim() ? '✓' : idx + 1}</Text>
                            </View>
                            <Text style={styles.questionText}>{question}</Text>
                        </TouchableOpacity>
                        {expandedIdx === idx && (
                            <View style={styles.answerContainer}>
                                <TouchableOpacity
                                    style={styles.textArea}
                                    activeOpacity={1}
                                >
                                    <Text style={styles.textAreaPlaceholder}>
                                        {answers[idx] || t('intake.answerPlaceholder')}
                                    </Text>
                                </TouchableOpacity>
                                {/* Quick answer chips */}
                                <View style={styles.chips}>
                                    {['Yes', 'No', 'Not sure', 'Recently'].map((chip) => (
                                        <TouchableOpacity
                                            key={chip}
                                            style={[styles.chip, answers[idx] === chip && styles.chipActive]}
                                            onPress={() => handleAnswer(idx, chip)}
                                        >
                                            <Text style={[styles.chipText, answers[idx] === chip && styles.chipTextActive]}>{chip}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                ))}

                {/* Continue */}
                <Button
                    title={round < 3 ? t('common.next') : t('intake.continueToMeds')}
                    onPress={handleContinue}
                    size="lg"
                    disabled={!allAnswered}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing.xl },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    progressBar: { height: 4, backgroundColor: colors.bgTertiary, borderRadius: 2, marginBottom: spacing.sm },
    progressFill: { height: 4, backgroundColor: colors.accentTeal, borderRadius: 2 },
    roundLabel: { ...typography.caption, color: colors.textTertiary, textAlign: 'right' },

    title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing['2xl'] },

    questionCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        marginBottom: spacing.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    questionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
    },
    qBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.accentTealFaded,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qBadgeDone: { backgroundColor: colors.successFaded },
    qBadgeText: { ...typography.label, color: colors.accentTeal },
    questionText: { ...typography.body, color: colors.textPrimary, flex: 1 },

    answerContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    textArea: {
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
        minHeight: 60,
    },
    textAreaPlaceholder: { ...typography.bodySm, color: colors.textTertiary },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    chip: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.accentTealFaded, borderColor: colors.accentTeal },
    chipText: { ...typography.bodySm, color: colors.textSecondary },
    chipTextActive: { color: colors.accentTeal, fontWeight: '600' },
});
