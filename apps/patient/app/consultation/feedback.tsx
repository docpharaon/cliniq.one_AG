import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { supabase } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';

const STARS = [1, 2, 3, 4, 5];

export default function FeedbackScreen() {
    const { id: consultationId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (rating === 0) {
            Alert.alert(t('feedback.ratingRequired'));
            return;
        }

        setSubmitting(true);
        try {
            await supabase.from('feedback').insert([{
                consultation_id: consultationId,
                patient_id: user?.id,
                rating,
                comment: comment.trim() || null,
            }]);
            Alert.alert(
                t('feedback.thankYou'),
                t('feedback.submitted'),
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err) {
            Alert.alert(t('common.error'), t('errors.serverError'));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.content}>
                {/* Header */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>← {t('common.back')}</Text>
                </TouchableOpacity>

                <Text style={styles.title}>⭐ {t('feedback.title')}</Text>
                <Text style={styles.subtitle}>{t('feedback.subtitle')}</Text>

                {/* Star Rating */}
                <View style={styles.starsRow}>
                    {STARS.map((star) => (
                        <TouchableOpacity
                            key={star}
                            onPress={() => setRating(star)}
                            activeOpacity={0.7}
                            style={styles.starButton}
                        >
                            <Text style={[styles.star, star <= rating && styles.starActive]}>
                                {star <= rating ? '★' : '☆'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.ratingLabel}>
                    {rating === 0 ? t('feedback.tapToRate') :
                        rating <= 2 ? t('feedback.poor') :
                            rating === 3 ? t('feedback.okay') :
                                rating === 4 ? t('feedback.good') :
                                    t('feedback.excellent')}
                </Text>

                {/* Comment */}
                <Text style={styles.commentLabel}>{t('feedback.commentLabel')}</Text>
                <TextInput
                    style={styles.commentInput}
                    placeholder={t('feedback.commentPlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={4}
                    value={comment}
                    onChangeText={setComment}
                    textAlignVertical="top"
                />

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitButton, rating === 0 && styles.submitDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting || rating === 0}
                    activeOpacity={0.8}
                >
                    <Text style={styles.submitText}>
                        {submitting ? t('common.loading') : t('feedback.submit')}
                    </Text>
                </TouchableOpacity>

                {/* Skip */}
                <TouchableOpacity onPress={() => router.back()} style={styles.skipButton}>
                    <Text style={styles.skipText}>{t('feedback.skipFeedback')}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    content: { flex: 1, paddingHorizontal: spacing.xl },

    backButton: { paddingTop: spacing.lg, marginBottom: spacing.lg },
    backText: { ...typography.body, color: colors.accentTeal },

    title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing['3xl'], lineHeight: 22 },

    // Stars
    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    starButton: { padding: spacing.xs },
    star: { fontSize: 44, color: colors.textTertiary },
    starActive: { color: '#F5A623' },
    ratingLabel: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing['2xl'],
        fontWeight: '600',
    },

    // Comment
    commentLabel: { ...typography.label, color: colors.textPrimary, marginBottom: spacing.sm },
    commentInput: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...typography.body,
        color: colors.textPrimary,
        minHeight: 100,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing['2xl'],
    },

    // Actions
    submitButton: {
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.lg,
        borderRadius: radius.full,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    submitDisabled: { opacity: 0.4 },
    submitText: { ...typography.button, color: '#fff' },

    skipButton: { alignItems: 'center', paddingVertical: spacing.sm },
    skipText: { ...typography.bodySm, color: colors.textTertiary },
});
