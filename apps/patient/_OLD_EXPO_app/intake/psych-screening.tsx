import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { PHQ9_INSTRUMENT, GAD7_INSTRUMENT, scorePHQ9, scoreGAD7 } from '@cliniqone/types';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '@cliniqone/api';

// ── Likert answer options ─────────────────────────
const LIKERT_OPTIONS = [
    { value: 0, label: 'Not at all', labelAr: 'أبداً' },
    { value: 1, label: 'Several days', labelAr: 'عدة أيام' },
    { value: 2, label: 'More than half', labelAr: 'أكثر من نصف الأيام' },
    { value: 3, label: 'Nearly every day', labelAr: 'تقريباً كل يوم' },
];

type ScreeningInstrument = 'PHQ-9' | 'GAD-7';

export default function PsychScreeningScreen() {
    const { user } = useAuthStore();
    const params = useLocalSearchParams<{ consultation_id?: string; instrument?: string }>();
    const consultationId = params.consultation_id;

    const [currentInstrument, setCurrentInstrument] = useState<ScreeningInstrument>(
        (params.instrument as ScreeningInstrument) || 'PHQ-9'
    );
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [totalScore, setTotalScore] = useState(0);
    const [severity, setSeverity] = useState('');

    const instrument = currentInstrument === 'PHQ-9' ? PHQ9_INSTRUMENT : GAD7_INSTRUMENT;
    const questions = instrument.questions;
    const currentQuestion = questions[currentQuestionIndex];
    const progress = answers.length / questions.length;

    const handleAnswer = useCallback((value: number) => {
        const newAnswers = [...answers, value];
        setAnswers(newAnswers);

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // All questions answered — score and save
            const sum = newAnswers.reduce((a, b) => a + b, 0);
            const scorer = currentInstrument === 'PHQ-9' ? scorePHQ9 : scoreGAD7;
            const result = scorer(sum);
            setTotalScore(sum);
            setSeverity(result.severity);
            saveScore(newAnswers, sum, result.severity);
        }
    }, [answers, currentQuestionIndex, questions.length, currentInstrument]);

    async function saveScore(responses: number[], score: number, sev: string) {
        setSaving(true);
        try {
            await supabase.from('screening_scores').insert({
                consultation_id: consultationId || null,
                patient_id: user?.id,
                instrument: currentInstrument,
                responses: responses.map((v, i) => ({ question_index: i, answer_value: v })),
                total_score: score,
                severity: sev,
                administered_by: 'patient',
            });
            setCompleted(true);
        } catch (err) {
            console.error('Save screening score error:', err);
        }
        setSaving(false);
    }

    function handleNextInstrument() {
        if (currentInstrument === 'PHQ-9') {
            // Move to GAD-7
            setCurrentInstrument('GAD-7');
            setCurrentQuestionIndex(0);
            setAnswers([]);
            setCompleted(false);
        } else {
            // Both done — proceed to submit
            router.push('/intake/submit' as never);
        }
    }

    // ── Completed state ──
    if (completed) {
        const maxScore = currentInstrument === 'PHQ-9' ? 27 : 21;
        const pct = Math.round((totalScore / maxScore) * 100);

        return (
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    <View style={styles.resultCard}>
                        <Text style={styles.resultIcon}>
                            {severity === 'severe' ? '🔴' : severity === 'moderately_severe' ? '🟠' : severity === 'moderate' ? '🟡' : severity === 'mild' ? '🟢' : '✅'}
                        </Text>
                        <Text style={styles.resultTitle}>{currentInstrument} {t('psychiatry.screening')}</Text>
                        <Text style={styles.resultSubtitle}>{t('psychiatry.totalScore')}</Text>

                        {/* Score display */}
                        <View style={styles.scoreCircle}>
                            <Text style={styles.scoreText}>{totalScore}</Text>
                            <Text style={styles.scoreMax}>/ {maxScore}</Text>
                        </View>

                        {/* Progress bar */}
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, {
                                width: `${pct}%`,
                                backgroundColor: pct < 20 ? '#22c55e' : pct < 40 ? '#84cc16' : pct < 60 ? '#eab308' : pct < 80 ? '#f97316' : '#ef4444',
                            }]} />
                        </View>

                        {/* Severity badge */}
                        <View style={[styles.severityBadge, {
                            backgroundColor: severity === 'severe' ? '#7f1d1d' : severity === 'moderately_severe' ? '#78350f' : severity === 'moderate' ? '#713f12' : severity === 'mild' ? '#14532d' : '#1e293b',
                        }]}>
                            <Text style={[styles.severityText, {
                                color: severity === 'severe' ? '#fca5a5' : severity === 'moderately_severe' ? '#fbbf24' : severity === 'moderate' ? '#fde047' : severity === 'mild' ? '#86efac' : '#94a3b8',
                            }]}>
                                {t(`psychiatry.${severity === 'moderately_severe' ? 'moderatelySevere' : severity}`)}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.nextButton} onPress={handleNextInstrument}>
                            <Text style={styles.nextButtonText}>
                                {currentInstrument === 'PHQ-9'
                                    ? `${t('common.next')}: ${t('psychiatry.gad7')}`
                                    : t('common.done')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── Saving state ──
    if (saving) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.accentTeal} />
                    <Text style={styles.savingText}>{t('common.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── Question state ──
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>
                        {currentInstrument === 'PHQ-9' ? t('psychiatry.phq9') : t('psychiatry.gad7')}
                    </Text>
                    <Text style={styles.subtitle}>{t('psychiatry.overPast2Weeks')}</Text>
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                        {currentQuestionIndex + 1} / {questions.length}
                    </Text>
                </View>

                {/* Question */}
                <View style={styles.questionCard}>
                    <Text style={styles.questionNumber}>Q{currentQuestionIndex + 1}</Text>
                    <Text style={styles.questionText}>{currentQuestion.text}</Text>
                    {currentQuestion.text_ar && (
                        <Text style={styles.questionTextAr}>{currentQuestion.text_ar}</Text>
                    )}
                </View>

                {/* Answer options */}
                <View style={styles.optionsContainer}>
                    {LIKERT_OPTIONS.map(option => (
                        <TouchableOpacity
                            key={option.value}
                            style={styles.optionButton}
                            onPress={() => handleAnswer(option.value)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionValue}>
                                <Text style={styles.optionValueText}>{option.value}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionLabel}>{option.label}</Text>
                                <Text style={styles.optionLabelAr}>{option.labelAr}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    savingText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.lg },

    header: { paddingTop: spacing.lg, marginBottom: spacing['2xl'] },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    title: { ...typography.h2, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },

    progressContainer: { marginBottom: spacing.xl },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.bgCard,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
        backgroundColor: colors.accentTeal,
    },
    progressText: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'right',
        marginTop: spacing.xs,
    },

    questionCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    questionNumber: {
        ...typography.caption,
        color: colors.accentTeal,
        fontWeight: '700',
        fontSize: 12,
        marginBottom: spacing.sm,
    },
    questionText: {
        ...typography.h4,
        color: colors.textPrimary,
        lineHeight: 24,
    },
    questionTextAr: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        textAlign: 'right',
        lineHeight: 22,
    },

    optionsContainer: { gap: spacing.sm },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    optionValue: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.accentTealFaded,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionValueText: { ...typography.h4, color: colors.accentTeal },
    optionLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    optionLabelAr: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },

    // Results
    resultCard: {
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing['2xl'],
        marginTop: spacing['4xl'],
        borderWidth: 1,
        borderColor: colors.border,
    },
    resultIcon: { fontSize: 48, marginBottom: spacing.md },
    resultTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
    resultSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
    scoreCircle: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    scoreText: { fontSize: 48, fontWeight: '800', color: colors.textPrimary },
    scoreMax: { ...typography.body, color: colors.textTertiary },
    severityBadge: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        marginTop: spacing.lg,
    },
    severityText: {
        ...typography.body,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    nextButton: {
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing['2xl'],
        borderRadius: radius.md,
        marginTop: spacing['2xl'],
    },
    nextButtonText: { ...typography.body, color: '#fff', fontWeight: '700' },
});
