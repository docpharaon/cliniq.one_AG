import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { signUp, safeFetch } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { SECURITY, COUNTRIES } from '@cliniqone/config';
import { handleGoogleSignIn } from '../../services/googleAuth';
import { useToast } from '../../components/ToastProvider';

export default function SignupScreen() {
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+966');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const toast = useToast((s) => s.show);

    // Password strength
    const checks = {
        length: password.length >= SECURITY.PASSWORD_MIN_LENGTH,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"|,.<>?]/.test(password),
    };
    const strengthScore = Object.values(checks).filter(Boolean).length;
    const strengthLabel = strengthScore <= 1 ? 'Weak' : strengthScore <= 2 ? 'Fair' : strengthScore <= 3 ? 'Good' : 'Strong';
    const strengthColor = strengthScore <= 1 ? colors.error : strengthScore <= 2 ? colors.warning : strengthScore <= 3 ? colors.accentBlue : colors.success;

    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
    const isValid = nickname.length >= 2 && email.includes('@') && password.length >= 8 && passwordsMatch && termsAccepted && checks.uppercase && checks.lowercase && checks.number;

    async function handleSignup() {
        if (!isValid) return;
        setLoading(true);
        setErrors({});

        try {
            await safeFetch(
                () => signUp({
                    email,
                    password,
                    nickname,
                    phone: phone ? `${countryCode}${phone}` : undefined,
                }),
                { timeout: 8000, retries: 1, label: 'signUp' },
            );
            toast('Account created! Check your email.', 'success');
            router.push('/(auth)/verify-email');
        } catch (err: any) {
            console.error('Signup error:', err);
            const message = err?.message || '';
            if (message.includes('already registered')) {
                setErrors({ email: t('errors.emailExists') });
            } else if (message.includes('timed out')) {
                toast('Connection is slow. Please try again.', 'error');
            } else {
                const errorMsg = message || t('errors.serverError');
                setErrors({ general: errorMsg });
                toast(errorMsg, 'error');
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
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('auth.createAccount')}</Text>
                    <Text style={styles.subtitle}>{t('registration.stepOf', { current: '1', total: '3' })}: {t('registration.step1Title')}</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '33%' }]} />
                    </View>
                </View>

                <Text style={styles.sectionLabel}>👋 {t('registration.letsGetStarted')}</Text>

                {/* Google Sign-In */}
                <TouchableOpacity
                    style={[styles.googleButton, googleLoading && { opacity: 0.5 }]}
                    disabled={googleLoading}
                    onPress={async () => {
                        setGoogleLoading(true);
                        setErrors({});
                        try {
                            const success = await handleGoogleSignIn();
                            if (success) {
                                router.replace('/');
                            }
                        } catch (err: any) {
                            setErrors({ general: err?.message || 'Google sign-in failed' });
                        } finally {
                            setGoogleLoading(false);
                        }
                    }}
                >
                    {googleLoading ? (
                        <ActivityIndicator size="small" color={colors.textPrimary} />
                    ) : (
                        <Text style={styles.googleIcon}>G</Text>
                    )}
                    <Text style={styles.googleLabel}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or sign up with email</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Nickname */}
                <Input
                    label={t('auth.nickname')}
                    placeholder="Sarah"
                    value={nickname}
                    onChangeText={(text) => setNickname(text.replace(/[^a-zA-Z\s]/g, ''))}
                    hint={t('auth.nicknameHint')}
                    error={errors.nickname}
                    required
                    autoCapitalize="words"
                />

                {/* Email */}
                <Input
                    label={t('auth.email')}
                    placeholder="sarah@email.com"
                    value={email}
                    onChangeText={setEmail}
                    error={errors.email}
                    required
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                />

                {/* Phone */}
                <View style={styles.phoneRow}>
                    <TouchableOpacity style={styles.countryPicker}>
                        <Text style={styles.countryCode}>{countryCode} ▼</Text>
                    </TouchableOpacity>
                    <View style={styles.phoneInput}>
                        <Input
                            label={t('auth.phone')}
                            placeholder="50 123 4567"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            required
                        />
                    </View>
                </View>

                {/* Password */}
                <Input
                    label={t('auth.password')}
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    required
                    autoComplete="new-password"
                    rightIcon={
                        <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                    }
                    onRightIconPress={() => setShowPassword(!showPassword)}
                />

                {/* Strength meter */}
                {password.length > 0 && (
                    <View style={styles.strengthSection}>
                        <View style={styles.strengthBar}>
                            <View style={[styles.strengthFill, { width: `${(strengthScore / 5) * 100}%`, backgroundColor: strengthColor }]} />
                        </View>
                        <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                            {t('auth.passwordStrength')} {strengthLabel}
                        </Text>

                        <View style={styles.checks}>
                            <CheckItem passed={checks.length} label={t('auth.minChars')} />
                            <CheckItem passed={checks.uppercase} label={t('auth.uppercase')} />
                            <CheckItem passed={checks.lowercase} label={t('auth.lowercase')} />
                            <CheckItem passed={checks.number} label={t('auth.hasNumber')} />
                            <CheckItem passed={checks.special} label={t('auth.specialChar')} />
                        </View>
                    </View>
                )}

                {/* Confirm Password */}
                <Input
                    label={t('auth.confirmPassword')}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    required
                    hint={passwordsMatch ? `✅ ${t('auth.passwordsMatch')}` : undefined}
                    error={confirmPassword.length > 0 && !passwordsMatch ? t('errors.passwordsMismatch') : undefined}
                />

                {/* Terms */}
                <TouchableOpacity
                    style={styles.termsRow}
                    onPress={() => setTermsAccepted(!termsAccepted)}
                >
                    <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                        {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.termsText}>
                        {t('auth.termsAgree')}{' '}
                        <Text style={styles.termsLink}>{t('auth.termsOfService')}</Text>
                        {' '}{t('auth.and')}{' '}
                        <Text style={styles.termsLink}>{t('auth.privacyPolicy')}</Text>
                    </Text>
                </TouchableOpacity>

                {/* Submit */}
                <Button
                    title={t('common.continue')}
                    onPress={handleSignup}
                    size="lg"
                    loading={loading}
                    disabled={!isValid}
                />

                {/* Login link */}
                <View style={styles.loginRow}>
                    <Text style={styles.loginText}>{t('landing.alreadyHaveAccount')} </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                        <Text style={styles.loginLink}>{t('landing.login')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function CheckItem({ passed, label }: { passed: boolean; label: string }) {
    return (
        <View style={styles.checkItem}>
            <Text style={[styles.checkIcon, { color: passed ? colors.success : colors.textTertiary }]}>
                {passed ? '✅' : '⬜'}
            </Text>
            <Text style={[styles.checkLabel, { color: passed ? colors.textSecondary : colors.textTertiary }]}>
                {label}
            </Text>
        </View>
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
    sectionLabel: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xl },
    phoneRow: { flexDirection: 'row', gap: spacing.md },
    countryPicker: { justifyContent: 'center', backgroundColor: colors.bgTertiary, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, marginBottom: spacing.lg, marginTop: spacing.xl },
    countryCode: { ...typography.body, color: colors.textPrimary },
    phoneInput: { flex: 1 },
    eyeIcon: { fontSize: 18 },
    strengthSection: { marginTop: -spacing.sm, marginBottom: spacing.lg },
    strengthBar: { height: 4, backgroundColor: colors.bgTertiary, borderRadius: 2 },
    strengthFill: { height: 4, borderRadius: 2 },
    strengthLabel: { ...typography.caption, marginTop: spacing.xs },
    checks: { marginTop: spacing.sm },
    checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxs },
    checkIcon: { fontSize: 12 },
    checkLabel: { ...typography.bodySm },
    termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.xl, marginTop: spacing.sm },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.textTertiary, justifyContent: 'center', alignItems: 'center' },
    checkboxChecked: { backgroundColor: colors.accentTeal, borderColor: colors.accentTeal },
    checkmark: { color: colors.textInverse, fontSize: 14, fontWeight: '700' },
    termsText: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
    termsLink: { color: colors.accentTeal, fontWeight: '600' },
    loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
    loginText: { ...typography.body, color: colors.textSecondary },
    loginLink: { ...typography.body, color: colors.accentTeal, fontWeight: '600' },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderRadius: radius.lg,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.lg,
    },
    googleIcon: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    googleLabel: { ...typography.buttonSm, color: colors.textPrimary },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
        gap: spacing.md,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { ...typography.caption, color: colors.textTertiary },
});
