import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { useIntakeStore } from '../../stores/intakeStore';
import { BackButton } from '../../components/BackButton';
import { PhotoUpload } from '../../components/PhotoUpload';

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

export default function ComplaintScreen() {
    const { chiefComplaint, setChiefComplaint, photos, addPhoto, removePhoto } = useIntakeStore();

    const isValid = chiefComplaint.trim().length >= MIN_LENGTH;

    function handleContinue() {
        if (!isValid) return;
        router.push('/intake/ai-chat');
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <BackButton />
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '15%' }]} />
                    </View>
                </View>

                {/* Icon + Title */}
                <Text style={styles.icon}>💬</Text>
                <Text style={styles.title}>{t('intake.chiefComplaintTitle')}</Text>
                <Text style={styles.subtitle}>{t('intake.chiefComplaintDesc')}</Text>

                {/* Text Area */}
                <View style={styles.textAreaContainer}>
                    <TextInput
                        style={styles.textArea}
                        multiline
                        numberOfLines={6}
                        value={chiefComplaint}
                        onChangeText={setChiefComplaint}
                        placeholder={t('intake.complaintPlaceholder')}
                        placeholderTextColor={colors.textTertiary}
                        textAlignVertical="top"
                        maxLength={MAX_LENGTH}
                    />
                    <Text style={[styles.charCount, chiefComplaint.length >= MAX_LENGTH && styles.charCountLimit]}>
                        {chiefComplaint.length}/{MAX_LENGTH}
                    </Text>
                </View>

                {/* Photo Upload */}
                <PhotoUpload
                    photos={photos}
                    onAdd={addPhoto}
                    onRemove={removePhoto}
                    maxPhotos={5}
                />

                {/* Tips */}
                <View style={styles.tips}>
                    <Text style={styles.tipsTitle}>💡 {t('intake.tipsTitle')}</Text>
                    <Text style={styles.tip}>• {t('intake.tip1')}</Text>
                    <Text style={styles.tip}>• {t('intake.tip2')}</Text>
                    <Text style={styles.tip}>• {t('intake.tip3')}</Text>
                </View>

                {/* Continue */}
                <Button
                    title={t('common.continue')}
                    onPress={handleContinue}
                    size="lg"
                    disabled={!isValid}
                />
                {chiefComplaint.length > 0 && !isValid && (
                    <Text style={styles.hint}>
                        {t('intake.minChars', { count: String(MIN_LENGTH) })}
                    </Text>
                )}
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing['2xl'] },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    progressBar: { height: 4, backgroundColor: colors.bgTertiary, borderRadius: 2 },
    progressFill: { height: 4, backgroundColor: colors.accentTeal, borderRadius: 2 },

    icon: { fontSize: 48, textAlign: 'center', marginBottom: spacing.lg },
    title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
    subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing['2xl'] },

    textAreaContainer: { marginBottom: spacing.xl },
    textArea: {
        backgroundColor: colors.bgTertiary,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...typography.body,
        color: colors.textPrimary,
        minHeight: 160,
    },
    charCount: { ...typography.caption, color: colors.textTertiary, textAlign: 'right', marginTop: spacing.xs },
    charCountLimit: { color: colors.error },

    tips: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing['2xl'],
    },
    tipsTitle: { ...typography.label, color: colors.textPrimary, marginBottom: spacing.sm },
    tip: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.xs, lineHeight: 18 },

    hint: { ...typography.bodySm, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.md },
});
