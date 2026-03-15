import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { signIn, supabase } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { SECURITY } from '@cliniqone/config';
import { handleGoogleSignIn } from '../../services/googleAuth';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');

    const isValid = email.length > 0 && password.length >= SECURITY.PASSWORD_MIN_LENGTH;

    async function handleLogin() {
        if (!isValid) return;
        setError('');
        setLoading(true);

        try {
            const { session } = await signIn({ email, password });

            // Check user role — only patients can use this app
            if (session) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (userData && userData.role !== 'patient') {
                    // Sign out the non-patient user
                    await supabase.auth.signOut();
                    const appName = userData.role === 'doctor' ? 'Doctor' : 'Admin';
                    setError(`This app is for patients only. Please use the ${appName} app to log in.`);
                    setLoading(false);
                    return;
                }
            }

            router.replace('/');
        } catch (err: any) {
            const message = err?.message || '';

            if (message.includes('Invalid login')) {
                setError(t('errors.invalidCredentials'));
            } else if (message.includes('Email not confirmed')) {
                setError(t('errors.emailNotVerified'));
            } else {
                setError(t('errors.invalidCredentials'));
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>cliniq.one</Text>
                    <Text style={styles.welcome}>{t('auth.welcomeBack')}</Text>
                </View>

                {/* Error Banner */}
                {error ? (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* Form */}
                <View style={styles.form}>
                    <Input
                        label={t('auth.emailOrPhone')}
                        placeholder="sarah@email.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        returnKeyType="next"
                    />

                    <Input
                        label={t('auth.password')}
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoComplete="current-password"
                        returnKeyType="done"
                        onSubmitEditing={handleLogin}
                        rightIcon={
                            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                        }
                        onRightIconPress={() => setShowPassword(!showPassword)}
                    />

                    {/* Remember me / Forgot */}
                    <View style={styles.optionsRow}>
                        <TouchableOpacity style={styles.rememberRow}>
                            <View style={styles.checkbox} />
                            <Text style={styles.rememberText}>{t('auth.rememberMe')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                            <Text style={styles.forgotLink}>{t('auth.forgotPassword')}</Text>
                        </TouchableOpacity>
                    </View>

                    <Button
                        title={t('auth.signIn')}
                        onPress={handleLogin}
                        size="lg"
                        loading={loading}
                        disabled={!isValid}
                    />
                </View>

                {/* Social Login */}
                <View style={styles.socialSection}>
                    <Text style={styles.orText}>{t('auth.continueWith')}</Text>
                    <View style={styles.socialRow}>
                        <TouchableOpacity
                            style={[styles.socialButton, googleLoading && styles.socialButtonDisabled]}
                            disabled={googleLoading}
                            onPress={async () => {
                                setGoogleLoading(true);
                                setError('');
                                try {
                                    const success = await handleGoogleSignIn();
                                    if (success) {
                                        router.replace('/');
                                    }
                                } catch (err: any) {
                                    setError(err?.message || 'Google sign-in failed');
                                } finally {
                                    setGoogleLoading(false);
                                }
                            }}
                        >
                            {googleLoading ? (
                                <ActivityIndicator size="small" color={colors.textPrimary} />
                            ) : (
                                <Text style={styles.socialIcon}>G</Text>
                            )}
                            <Text style={styles.socialLabel}>{t('auth.google')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.socialButton, styles.socialButtonDisabled]} disabled>
                            <Text style={styles.socialIcon}>🍎</Text>
                            <Text style={styles.socialLabel}>{t('auth.apple')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Sign Up */}
                <View style={styles.signupRow}>
                    <Text style={styles.signupText}>{t('auth.noAccount')} </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                        <Text style={styles.signupLink}>{t('auth.signUp')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    scroll: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['4xl'],
    },
    header: {
        alignItems: 'center',
        paddingTop: spacing['4xl'],
        paddingBottom: spacing['3xl'],
    },
    logo: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.accentTeal,
        letterSpacing: -1,
    },
    welcome: {
        ...typography.h3,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    errorBanner: {
        backgroundColor: colors.errorFaded,
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.lg,
        borderLeftWidth: 3,
        borderLeftColor: colors.error,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
    },
    form: {
        marginBottom: spacing['2xl'],
    },
    eyeIcon: {
        fontSize: 18,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    rememberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: colors.textTertiary,
    },
    rememberText: {
        ...typography.bodySm,
        color: colors.textSecondary,
    },
    forgotLink: {
        ...typography.bodySm,
        color: colors.accentTeal,
        fontWeight: '600',
    },
    socialSection: {
        marginBottom: spacing['2xl'],
    },
    orText: {
        ...typography.body,
        color: colors.textTertiary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    socialRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderRadius: radius.lg,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    socialIcon: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    socialLabel: {
        ...typography.buttonSm,
        color: colors.textPrimary,
    },
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    signupText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    signupLink: {
        ...typography.body,
        color: colors.accentTeal,
        fontWeight: '600',
    },
    socialButtonDisabled: {
        opacity: 0.5,
    },
});
