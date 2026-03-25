import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { acceptLegalTerms, safeFetch } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useToast } from '../../components/ToastProvider';

export default function LegalScreen() {
    const [tosAccepted, setTosAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [aiAccepted, setAiAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useToast((s) => s.show);

    const allAccepted = tosAccepted && privacyAccepted && aiAccepted;

    async function handleAccept() {
        if (!allAccepted) return;
        setLoading(true);
        try {
            await safeFetch(
                () => acceptLegalTerms(),
                { timeout: 8000, retries: 1, label: 'acceptLegal' },
            );
            router.replace('/(tabs)');
        } catch (err: any) {
            console.error('Legal acceptance error:', err);
            toast(err?.message || 'Failed to save. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>{t('legal.title')}</Text>
                <Text style={styles.subtitle}>
                    Please review and accept the following to continue.
                </Text>

                {/* Terms of Service */}
                <TouchableOpacity
                    style={[styles.card, tosAccepted && styles.cardAccepted]}
                    onPress={() => setTosAccepted(!tosAccepted)}
                    activeOpacity={0.8}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.checkbox, tosAccepted && styles.checkboxChecked]}>
                            {tosAccepted && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.cardTitle}>📜 {t('legal.tosTitle')}</Text>
                    </View>
                    <Text style={styles.cardBody}>
                        By using cliniq.one, you agree to our terms governing virtual consultations,
                        token purchases, data handling, and platform usage.
                    </Text>
                </TouchableOpacity>

                {/* Privacy Policy */}
                <TouchableOpacity
                    style={[styles.card, privacyAccepted && styles.cardAccepted]}
                    onPress={() => setPrivacyAccepted(!privacyAccepted)}
                    activeOpacity={0.8}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
                            {privacyAccepted && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.cardTitle}>🔒 {t('legal.privacyTitle')}</Text>
                    </View>
                    <Text style={styles.cardBody}>
                        We collect minimal personal data. Medical files are not stored long-term.
                        Your data is encrypted and compliant with KSA PDPL, UAE DIFC DPL, and GDPR.
                    </Text>
                </TouchableOpacity>

                {/* AI Disclosure */}
                <TouchableOpacity
                    style={[styles.card, aiAccepted && styles.cardAccepted]}
                    onPress={() => setAiAccepted(!aiAccepted)}
                    activeOpacity={0.8}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.checkbox, aiAccepted && styles.checkboxChecked]}>
                            {aiAccepted && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.cardTitle}>🤖 {t('legal.aiDisclosureTitle')}</Text>
                    </View>
                    <Text style={styles.cardBody}>{t('legal.aiDisclosureText')}</Text>
                </TouchableOpacity>

                <Button
                    title={t('legal.acceptAll')}
                    onPress={handleAccept}
                    size="lg"
                    loading={loading}
                    disabled={!allAccepted}
                />

                {!allAccepted && (
                    <Text style={styles.hint}>{t('legal.mustAccept')}</Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing['3xl'], paddingBottom: spacing['4xl'] },
    title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing['2xl'] },
    card: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    cardAccepted: { borderColor: colors.accentTeal, backgroundColor: colors.accentTealFaded },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    cardTitle: { ...typography.h4, color: colors.textPrimary },
    cardBody: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 20 },
    checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.textTertiary, justifyContent: 'center', alignItems: 'center' },
    checkboxChecked: { backgroundColor: colors.accentTeal, borderColor: colors.accentTeal },
    checkmark: { color: colors.textInverse, fontSize: 14, fontWeight: '800' },
    hint: { ...typography.bodySm, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.md },
});
