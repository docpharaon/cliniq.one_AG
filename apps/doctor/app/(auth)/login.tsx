import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@cliniqone/api';
import { colors, typography, spacing, radius } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { handleGoogleSignIn } from '../../services/googleAuth';
import { handleAppleSignIn } from '../../services/appleAuth';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter email and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (authError) throw authError;

            // Re-initialize to fetch doctor profile
            await useAuthStore.getState().initialize();
            const store = useAuthStore.getState();

            if (store.isNewRegistration) {
                router.replace('/(auth)/pending-approval' as any);
                return;
            }

            if (!store.doctor) {
                setError('No doctor profile found for this account.');
                await supabase.auth.signOut();
                useAuthStore.getState().clear();
                setLoading(false);
                return;
            }

            // Force password change if flagged
            if (store.doctor.must_change_password) {
                router.replace('/(auth)/change-password' as any);
            } else {
                router.replace('/(tabs)');
            }
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials'
                ? 'Invalid email or password'
                : err.message || 'Login failed. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: 'google' | 'apple') => {
        setOauthLoading(provider);
        setError('');

        try {
            const handler = provider === 'google' ? handleGoogleSignIn : handleAppleSignIn;
            const success = await handler();

            if (success) {
                const store = useAuthStore.getState();

                if (store.isNewRegistration || !store.doctor) {
                    router.replace('/(auth)/pending-approval' as any);
                } else if (store.doctor.status === 'pending') {
                    router.replace('/(auth)/pending-approval' as any);
                } else if (store.doctor.must_change_password) {
                    router.replace('/(auth)/change-password' as any);
                } else {
                    router.replace('/(tabs)');
                }
            }
        } catch (err: any) {
            setError(err?.message || 'OAuth sign-in failed');
        } finally {
            setOauthLoading(null);
        }
    };

    const isDisabled = loading || !!oauthLoading;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>🩺</Text>
                    <Text style={styles.title}>cliniq.one</Text>
                    <Text style={styles.subtitle}>Doctor Panel</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>⚠️ {error}</Text>
                        </View>
                    ) : null}

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="doctor@cliniq.one"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isDisabled}
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter your password"
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry
                        editable={!isDisabled}
                    />

                    <TouchableOpacity
                        style={[styles.button, isDisabled && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isDisabled}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.bgPrimary} />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.forgotLink}
                        onPress={() => router.push('/(auth)/forgot-password')}
                        disabled={isDisabled}
                    >
                        <Text style={styles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Google OAuth */}
                    <TouchableOpacity
                        style={[styles.oauthButton, isDisabled && styles.buttonDisabled]}
                        onPress={() => handleOAuth('google')}
                        disabled={isDisabled}
                    >
                        {oauthLoading === 'google' ? (
                            <ActivityIndicator color={colors.textPrimary} />
                        ) : (
                            <>
                                <Text style={styles.oauthIcon}>G</Text>
                                <Text style={styles.oauthText}>Continue with Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Apple OAuth */}
                    <TouchableOpacity
                        style={[styles.oauthButton, styles.appleButton, isDisabled && styles.buttonDisabled]}
                        onPress={() => handleOAuth('apple')}
                        disabled={isDisabled}
                    >
                        {oauthLoading === 'apple' ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.appleIcon}></Text>
                                <Text style={styles.appleText}>Continue with Apple</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>
                    New doctor? Sign in with Google or Apple to register.{'\n'}
                    Admin approval required.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        fontSize: 56,
        marginBottom: 12,
    },
    title: {
        ...typography.h1,
        color: colors.accentTeal,
        fontWeight: '700',
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: 4,
    },
    form: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    label: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 6,
        marginTop: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: colors.bgTertiary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: colors.textPrimary,
        ...typography.body,
        borderWidth: 1,
        borderColor: colors.border,
    },
    button: {
        backgroundColor: colors.accentTeal,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        ...typography.button,
        color: colors.bgPrimary,
        fontWeight: '700',
    },
    forgotLink: {
        alignItems: 'center',
        marginTop: 16,
    },
    forgotText: {
        ...typography.caption,
        color: colors.accentTeal,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        ...typography.caption,
        color: colors.textTertiary,
        marginHorizontal: spacing.md,
    },
    oauthButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        backgroundColor: colors.bgTertiary,
        borderRadius: 12,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.sm,
    },
    oauthIcon: {
        fontSize: 18,
        fontWeight: '700',
        color: '#4285F4',
    },
    oauthText: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    appleButton: {
        backgroundColor: '#000',
        borderColor: '#333',
    },
    appleIcon: {
        fontSize: 20,
        color: '#fff',
    },
    appleText: {
        ...typography.body,
        color: '#fff',
        fontWeight: '600',
    },
    errorBox: {
        backgroundColor: colors.errorFaded,
        borderRadius: 12,
        padding: 12,
    },
    errorText: {
        ...typography.caption,
        color: colors.error,
    },
    footer: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: 24,
        lineHeight: 18,
    },
});
