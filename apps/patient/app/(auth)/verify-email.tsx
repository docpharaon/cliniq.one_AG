import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { supabase } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { SECURITY } from '@cliniqone/config';

export default function VerifyEmailScreen() {
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendCount, setResendCount] = useState(0);
    const [confirmed, setConfirmed] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Poll for email confirmation every 3 seconds
    useEffect(() => {
        pollRef.current = setInterval(async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.email_confirmed_at) {
                    setConfirmed(true);
                    if (pollRef.current) clearInterval(pollRef.current);
                    router.replace('/(auth)/personal-details');
                }
            } catch (err) {
                // Silently retry
            }
        }, 3000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    // Resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    async function handleResend() {
        if (resendCooldown > 0 || resendCount >= SECURITY.OTP_MAX_RESENDS) return;
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const email = session?.user?.email;
            if (!email) {
                const msg = 'No email found. Please go back and sign up again.';
                if (Platform.OS === 'web') {
                    (globalThis as any).alert(msg);
                } else {
                    Alert.alert(t('common.error'), msg);
                }
                return;
            }

            const { error } = await supabase.auth.resend({ type: 'signup', email });
            if (error) throw error;

            setResendCount((c) => c + 1);
            setResendCooldown(60);
        } catch (err: any) {
            const msg = err?.message || t('errors.serverError');
            if (Platform.OS === 'web') {
                (globalThis as any).alert(msg);
            } else {
                Alert.alert(t('common.error'), msg);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleSkip() {
        // Allow skipping for development — navigate to personal details
        router.replace('/(auth)/personal-details');
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('auth.verifyEmail')}</Text>
                    <Text style={styles.subtitle}>
                        {t('registration.stepOf', { current: '2', total: '3' })}: {t('registration.step2Title')}
                    </Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '66%' }]} />
                    </View>
                </View>

                {/* Email Icon */}
                <View style={styles.iconContainer}>
                    <Text style={styles.emailIcon}>📧</Text>
                </View>

                {/* Description */}
                <Text style={styles.description}>
                    {t('auth.verifyEmailDesc')}
                </Text>

                <Text style={styles.instructions}>
                    We sent a confirmation link to your email. Please check your inbox and click the link to verify your account.
                </Text>

                {/* Status indicator */}
                <View style={styles.statusRow}>
                    {confirmed ? (
                        <>
                            <Text style={styles.statusIcon}>✅</Text>
                            <Text style={styles.statusText}>Email confirmed! Redirecting...</Text>
                        </>
                    ) : (
                        <>
                            <ActivityIndicator size="small" color={colors.accentTeal} />
                            <Text style={styles.statusText}>Waiting for confirmation...</Text>
                        </>
                    )}
                </View>

                {/* Resend */}
                <View style={styles.resendRow}>
                    {resendCount >= SECURITY.OTP_MAX_RESENDS ? (
                        <Text style={styles.resendDisabled}>
                            Too many attempts. {t('common.contactSupport')}.
                        </Text>
                    ) : (
                        <TouchableOpacity
                            onPress={handleResend}
                            disabled={resendCooldown > 0 || loading}
                        >
                            <Text style={[styles.resendText, resendCooldown > 0 && styles.resendCooldown]}>
                                {t('auth.resendCode')}
                                {resendCooldown > 0 && ` (${t('auth.resendIn')} ${resendCooldown}s)`}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Skip for dev */}
                <View style={styles.skipContainer}>
                    <TouchableOpacity onPress={handleSkip}>
                        <Text style={styles.skipText}>Skip for now →</Text>
                    </TouchableOpacity>
                </View>

                {/* Change email */}
                <TouchableOpacity onPress={() => router.back()} style={styles.changeEmail}>
                    <Text style={styles.changeEmailText}>{t('auth.changeEmail')}</Text>
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
    subtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.xs },
    progressBar: { height: 4, backgroundColor: colors.bgTertiary, borderRadius: 2, marginTop: spacing.md },
    progressFill: { height: 4, backgroundColor: colors.accentTeal, borderRadius: 2 },
    iconContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    emailIcon: {
        fontSize: 64,
    },
    description: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    instructions: {
        ...typography.body,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing['3xl'],
        lineHeight: 24,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing['3xl'],
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.lg,
    },
    statusIcon: {
        fontSize: 20,
    },
    statusText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    resendRow: { alignItems: 'center', marginTop: spacing.lg },
    resendText: { ...typography.body, color: colors.accentTeal, fontWeight: '600' },
    resendCooldown: { color: colors.textTertiary, fontWeight: '400' },
    resendDisabled: { ...typography.bodySm, color: colors.textTertiary },
    skipContainer: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    skipText: {
        ...typography.body,
        color: colors.warning,
        fontWeight: '600',
    },
    changeEmail: { alignItems: 'center', marginTop: spacing.xl },
    changeEmailText: { ...typography.bodySm, color: colors.textTertiary, textDecorationLine: 'underline' },
});
