import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, supabase, safeFetch, ensureUserProfile } from '@cliniqone/api';
import { t, isRTL } from '@cliniqone/i18n';
import { SECURITY } from '@cliniqone/config';
import { handleGoogleSignIn } from '../../services/googleAuth';
import { handleAppleSignIn } from '../../services/appleAuth';
import { useToast } from '../../components/ToastProvider';
import { SocialLoginButton } from '../../components/SocialLoginButton';
import { NoInternetOverlay } from '../../components/NoInternetOverlay';
import { haptic } from '../../hooks/useHaptics';
import { Eye, EyeOff } from '@cliniqone/ui';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);
    const [error, setError] = useState('');
    const toast = useToast((s) => s.show);

    const isValid = email.length > 0 && password.length >= SECURITY.PASSWORD_MIN_LENGTH;

    async function handleLogin() {
        if (!isValid) return;
        if (!navigator.onLine) {
            toast(t('common.offlineAction'), 'error');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const { session } = await safeFetch(
                () => signIn({ email, password }),
                { timeout: 8000, retries: 1, label: 'signIn' },
            );

            if (session) {
                const { data: userData } = await safeFetch(
                    () => supabase.from('users').select('role').eq('id', session.user.id).single(),
                    { timeout: 5000, retries: 0, label: 'checkRole' },
                );

                if (userData && userData.role !== 'patient') {
                    await supabase.auth.signOut();
                    const appName = userData.role === 'doctor' ? 'Doctor' : 'Admin';
                    setError(`This app is for patients only. Please use the ${appName} app to log in.`);
                    setLoading(false);
                    return;
                }
            }

            toast(t('auth.welcomeBack'), 'success');
            haptic.success();
            navigate('/', { replace: true });
        } catch (err: any) {
            const message = err?.message || '';
            if (message.includes('timed out')) {
                setError('Connection is slow. Please check your internet and try again.');
            } else if (message.includes('Invalid login')) {
                setError(t('errors.invalidCredentials'));
            } else if (message.includes('Email not confirmed')) {
                setError(t('errors.emailNotVerified'));
            } else {
                setError(t('errors.invalidCredentials'));
            }
            haptic.error();
        } finally {
            setLoading(false);
        }
    }

    async function handleSocialLogin(provider: 'google' | 'apple') {
        const setProviderLoading = provider === 'google' ? setGoogleLoading : setAppleLoading;
        setProviderLoading(true);
        setError('');

        try {
            if (!navigator.onLine) {
                toast(t('common.offlineAction'), 'error');
                setProviderLoading(false);
                return;
            }
            const handler = provider === 'google' ? handleGoogleSignIn : handleAppleSignIn;
            const success = await handler();
            if (success) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    // Ensure profile exists (first-time OAuth) and check role
                    const userData = await ensureUserProfile(
                        session.user.id,
                        session.user.email,
                        session.user.user_metadata?.full_name || session.user.user_metadata?.name,
                        'patient',
                    );
                    if (userData && userData.role !== 'patient') {
                        await supabase.auth.signOut();
                        const appName = userData.role === 'doctor' ? 'Doctor' : 'Admin';
                        setError(`This app is for patients only. Please use the ${appName} app.`);
                        setProviderLoading(false);
                        return;
                    }
                }
                navigate('/', { replace: true });
            }
        } catch (err: any) {
            setError(err?.message || `${provider} sign-in failed`);
        } finally {
            setProviderLoading(false);
        }
    }

    const rtl = isRTL();

    return (
        <div style={{ ...styles.container, direction: rtl ? 'rtl' : 'ltr' }}>
            <NoInternetOverlay />
            <div className="page-enter" style={styles.scroll}>
                {/* Header */}
                <div style={styles.header}>
                    <h1 style={styles.logo}>cliniq.one</h1>
                    <p style={styles.welcome}>{t('auth.welcomeBack')}</p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div style={styles.errorBanner}>
                        <p style={styles.errorText}>{error}</p>
                    </div>
                )}

                {/* Form */}
                <div style={styles.form}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={styles.label}>{t('auth.emailOrPhone')}</label>
                        <input
                            type="email"
                            placeholder="sarah@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            style={styles.input}
                        />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={styles.label}>{t('auth.password')}</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                style={styles.input}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={styles.eyeButton}
                            >
                                {showPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                            </button>
                        </div>
                    </div>

                    {/* Options Row */}
                    <div style={styles.optionsRow}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('auth.rememberMe')}</span>
                        <Link to="/auth/forgot-password" style={styles.forgotLink}>{t('auth.forgotPassword')}</Link>
                    </div>

                    {/* Login Button */}
                    <button
                        onClick={handleLogin}
                        disabled={!isValid || loading}
                        style={{
                            ...styles.primaryButton,
                            opacity: !isValid || loading ? 0.5 : 1,
                            cursor: !isValid || loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? t('auth.signingIn') : t('auth.signIn')}
                    </button>
                </div>

                {/* Social Login */}
                <div style={styles.socialSection}>
                    <p style={styles.orText}>{t('auth.continueWith')}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <SocialLoginButton
                            provider="google"
                            label={`${t('auth.continueWith').replace(':', '')} ${t('auth.google')}`}
                            loading={googleLoading}
                            disabled={appleLoading}
                            onPress={() => handleSocialLogin('google')}
                        />
                        <SocialLoginButton
                            provider="apple"
                            label={`${t('auth.continueWith').replace(':', '')} ${t('auth.apple')}`}
                            loading={appleLoading}
                            disabled={googleLoading}
                            onPress={() => handleSocialLogin('apple')}
                        />
                    </div>
                </div>

                {/* Sign Up */}
                <div style={styles.signupRow}>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('auth.noAccount')} </span>
                    <Link to="/auth/signup" style={{ fontSize: 14, color: '#1A8A9E', fontWeight: 600, textDecoration: 'none' }}>
                        {t('auth.signUp')}
                    </Link>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: { minHeight: '100vh', backgroundColor: 'var(--bg-primary)' },
    scroll: { maxWidth: 420, margin: '0 auto', padding: '0 24px 48px' },
    header: { textAlign: 'center', paddingTop: 56, paddingBottom: 32 },
    logo: { fontSize: 32, fontWeight: 800, color: '#1A8A9E', letterSpacing: -1, margin: 0 },
    welcome: { fontSize: 18, color: 'var(--text-secondary)', marginTop: 12 },
    errorBanner: {
        backgroundColor: 'rgba(220,38,38,0.1)', padding: '12px 14px',
        borderRadius: 10, marginBottom: 16, borderLeft: '3px solid #DC2626',
    },
    errorText: { fontSize: 14, color: '#DC2626', margin: 0 },
    form: { marginBottom: 28 },
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 },
    input: {
        width: '100%', padding: '14px 16px', borderRadius: 12,
        border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)', fontSize: 15, boxSizing: 'border-box',
        outline: 'none',
    },
    eyeButton: {
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
    },
    optionsRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
    },
    forgotLink: { fontSize: 13, color: '#1A8A9E', fontWeight: 600, textDecoration: 'none' },
    primaryButton: {
        width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
        backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700,
    },
    socialSection: { marginBottom: 28 },
    orText: { fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 16 },
    signupRow: { display: 'flex', justifyContent: 'center' },
};
