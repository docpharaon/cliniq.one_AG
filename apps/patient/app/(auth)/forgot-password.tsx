import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { resetPassword } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';

export default function ForgotPasswordScreen() {
    const params = useLocalSearchParams<{ email?: string }>();
    const [email, setEmail] = useState(params.email || '');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const isValidEmail = email.includes('@') && email.includes('.');

    async function handleSendReset() {
        if (!isValidEmail) return;
        setLoading(true);

        try {
            await resetPassword(email.trim().toLowerCase());
            setSent(true);
        } catch (err: any) {
            Alert.alert(t('common.error'), err?.message || t('errors.serverError'));
        } finally {
            setLoading(false);
        }
    }

    if (sent) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.sentContainer}>
                    <Text style={styles.sentIcon}>📬</Text>
                    <Text style={styles.sentTitle}>{t('forgotPassword.sent')}</Text>
                    <Text style={styles.sentDesc}>{t('forgotPassword.sentDesc')}</Text>
                    <Text style={styles.sentEmail}>{email}</Text>

                    <View style={styles.sentActions}>
                        <Button
                            title={t('forgotPassword.backToLogin')}
                            onPress={() => router.replace('/(auth)/login')}
                            size="lg"
                        />
                        <TouchableOpacity
                            style={styles.tryAgainRow}
                            onPress={() => setSent(false)}
                        >
                            <Text style={styles.tryAgainText}>{t('forgotPassword.tryAgain')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('forgotPassword.title')}</Text>
                    <Text style={styles.subtitle}>{t('forgotPassword.subtitle')}</Text>
                </View>

                {/* Lock Icon */}
                <View style={styles.iconContainer}>
                    <Text style={styles.lockIcon}>🔒</Text>
                </View>

                {/* Email Input */}
                <Input
                    label={t('auth.email')}
                    placeholder="sarah@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    required
                />

                {/* Send Button */}
                <Button
                    title={loading ? t('forgotPassword.sending') : t('forgotPassword.sendLink')}
                    onPress={handleSendReset}
                    size="lg"
                    loading={loading}
                    disabled={!isValidEmail}
                />

                {/* Back to Login */}
                <TouchableOpacity
                    style={styles.loginRow}
                    onPress={() => router.replace('/(auth)/login')}
                >
                    <Text style={styles.loginText}>{t('forgotPassword.backToLogin')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing['2xl'] },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    title: { ...typography.h2, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },

    iconContainer: { alignItems: 'center', marginBottom: spacing['3xl'] },
    lockIcon: { fontSize: 56 },

    loginRow: { alignItems: 'center', marginTop: spacing['2xl'] },
    loginText: { ...typography.body, color: colors.accentTeal, fontWeight: '600' },

    // Sent state
    sentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
    sentIcon: { fontSize: 64, marginBottom: spacing.xl },
    sentTitle: { ...typography.h2, color: colors.success, marginBottom: spacing.md, textAlign: 'center' },
    sentDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 22 },
    sentEmail: { ...typography.h4, color: colors.accentTeal, marginBottom: spacing['3xl'] },
    sentActions: { width: '100%' },
    tryAgainRow: { alignItems: 'center', marginTop: spacing.xl },
    tryAgainText: { ...typography.bodySm, color: colors.textTertiary, textDecorationLine: 'underline' },
});
