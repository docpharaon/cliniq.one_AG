import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@cliniqone/i18n';
import { supabase } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import { handleGoogleSignIn } from '../../services/googleAuth';
import { handleAppleSignIn } from '../../services/appleAuth';
import { NoInternetOverlay } from '../../components/NoInternetOverlay';
import logoImg from '../../assets/logo.png';
import { SocialLoginButton } from '../../components/SocialLoginButton';
import { colors, typography, spacing, radius, AlertTriangle, EyeOff, Eye } from '@cliniqone/ui';
import { haptic } from '../../hooks/useHaptics';

export function LoginPage() {
    const navigate = useNavigate();
    const { t, isRTL } = useI18n();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) { setError(t('common.required')); return; }
        if (!navigator.onLine) { setError(t('doctor.auth.noInternet')); return; }
        setLoading(true);
        setError('');

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
            if (authError) throw authError;

            await useAuthStore.getState().initialize();
            const store = useAuthStore.getState();

            if (store.isNewRegistration) { navigate('/auth/pending-approval', { replace: true }); return; }
            if (!store.doctor) { setError(t('doctor.auth.noProfile')); await supabase.auth.signOut(); useAuthStore.getState().clear(); setLoading(false); return; }
            if (store.doctor.must_change_password) { navigate('/auth/change-password', { replace: true }); }
            else { navigate('/tabs', { replace: true }); }
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials' ? t('doctor.auth.invalidCredentials') : err.message || t('doctor.auth.loginFailed'));
        } finally { setLoading(false); }
    };

    const handleOAuthSuccess = () => {
        const store = useAuthStore.getState();
        if (store.isNewRegistration || !store.doctor) { navigate('/auth/pending-approval', { replace: true }); }
        else if (store.doctor.status === 'pending') { navigate('/auth/pending-approval', { replace: true }); }
        else if (store.doctor.must_change_password) { navigate('/auth/change-password', { replace: true }); }
        else { navigate('/tabs', { replace: true }); }
    };

    const handleOAuth = async (provider: 'google' | 'apple') => {
        const setLoaderFn = provider === 'google' ? setGoogleLoading : setAppleLoading;
        setLoaderFn(true);
        setError('');
        try {
            if (!navigator.onLine) {
                setError(t('doctor.auth.noInternet'));
                setLoaderFn(false);
                return;
            }
            const handler = provider === 'google' ? handleGoogleSignIn : handleAppleSignIn;
            const success = await handler();
            if (success) handleOAuthSuccess();
        } catch (err: any) { setError(err?.message || t('doctor.auth.loginFailed')); }
        finally { setLoaderFn(false); }
    };

    const isDisabled = loading || googleLoading || appleLoading;

    return (
        <div style={s.container}>
            <NoInternetOverlay />
            <div className="page-enter" style={s.content}>
                {/* Header */}
                <div style={s.header}>
                    <img src={logoImg} alt="cliniq.one" style={s.logo} />
                    <span style={s.title}>cliniq.one</span>
                    <span style={s.subtitle}>{t('doctor.auth.loginTitle')}</span>
                </div>

                {/* Form */}
                <div style={s.form}>
                    {error && (
                        <div style={{ ...s.errorBox, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <span style={{ ...s.errorText, textAlign: isRTL ? 'right' : 'left' as any }}><AlertTriangle size={13} color={colors.error} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 4 }} /> {error}</span>
                        </div>
                    )}

                    <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.auth.email')}</label>
                    <input
                        style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('doctor.auth.emailPlaceholder')}
                        type="email"
                        autoComplete="email"
                        disabled={isDisabled}
                    />

                    <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.auth.password')}</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('doctor.auth.passwordPlaceholder')}
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            disabled={isDisabled}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', [isRTL ? 'left' : 'right']: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            {showPassword ? <EyeOff size={16} color={colors.textTertiary} /> : <Eye size={16} color={colors.textTertiary} />}
                        </button>
                    </div>

                    <button
                        style={{ ...s.button, opacity: isDisabled ? 0.6 : 1 }}
                        className="pressable"
                        onClick={() => { haptic.medium(); handleLogin(); }}
                        disabled={isDisabled}
                    >
                        {loading
                            ? <div className="spinner" style={{ color: colors.bgPrimary }} />
                            : <span style={s.buttonText}>{t('doctor.auth.signIn')}</span>
                        }
                    </button>

                    <button style={s.forgotLink} onClick={() => { haptic.light(); navigate('/auth/forgot-password'); }} disabled={isDisabled}>
                        <span style={{ fontSize: 11, color: colors.accentTeal }}>{t('doctor.auth.forgotPassword')}</span>
                    </button>

                    {/* Divider */}
                    <div style={s.divider}>
                        <div style={s.dividerLine} />
                        <span style={{ fontSize: 11, color: colors.textTertiary, marginInline: spacing.md }}>{t('doctor.auth.or')}</span>
                        <div style={s.dividerLine} />
                    </div>

                    {/* Social OAuth */}
                    <SocialLoginButton provider="google" label={t('doctor.auth.continueGoogle')} loading={googleLoading} disabled={appleLoading || loading} onPress={() => { haptic.medium(); handleOAuth('google'); }} />
                    <SocialLoginButton provider="apple" label={t('doctor.auth.continueApple')} loading={appleLoading} disabled={googleLoading || loading} onPress={() => { haptic.medium(); handleOAuth('apple'); }} />
                </div>

                <p style={{ ...s.footer, whiteSpace: 'pre-line' }}>
                    {t('doctor.auth.footerRegister')}
                </p>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    content: { display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', paddingInline: 24 },
    header: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 },
    logo: { width: 80, height: 80, marginBottom: 12 },
    title: { fontSize: typography.h1.fontSize, fontWeight: 700, color: colors.accentTeal },
    subtitle: { fontSize: typography.body.fontSize, color: colors.textSecondary, marginTop: 4 },
    form: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 24, border: `1px solid ${colors.border}` },
    label: { display: 'block', fontSize: typography.caption.fontSize, color: colors.textSecondary, marginBottom: 6, marginTop: 16, textTransform: 'uppercase' as any, letterSpacing: 1 },
    input: { display: 'block', width: '100%', backgroundColor: colors.bgTertiary, borderRadius: 12, paddingInline: 16, paddingBlock: 14, color: colors.textPrimary, fontSize: typography.body.fontSize, border: `1px solid ${colors.border}` },
    button: { width: '100%', backgroundColor: colors.accentTeal, borderRadius: 12, paddingBlock: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
    buttonText: { fontSize: typography.button.fontSize, fontWeight: 700, color: colors.bgPrimary },
    forgotLink: { display: 'flex', justifyContent: 'center', marginTop: 16, width: '100%' },
    divider: { display: 'flex', alignItems: 'center', marginBlock: spacing.xl },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    errorBox: { backgroundColor: colors.errorFaded, borderRadius: 12, padding: 12 },
    errorText: { fontSize: typography.caption.fontSize, color: colors.error },
    footer: { fontSize: typography.caption.fontSize, color: colors.textTertiary, textAlign: 'center', marginTop: 24, lineHeight: '18px' },
};
