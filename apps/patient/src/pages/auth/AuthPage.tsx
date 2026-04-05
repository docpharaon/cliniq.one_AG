import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, signUp, supabase, safeFetch, ensureUserProfile } from '@cliniqone/api';
import { t, isRTL } from '@cliniqone/i18n';
import { SECURITY } from '@cliniqone/config';
import { handleGoogleSignIn } from '../../services/googleAuth';
import { handleAppleSignIn } from '../../services/appleAuth';
import { useToast } from '../../components/ToastProvider';
import { SocialLoginButton } from '../../components/SocialLoginButton';
import { NoInternetOverlay } from '../../components/NoInternetOverlay';
import { haptic } from '../../hooks/useHaptics';
import { Eye, EyeOff, CheckCircle, ChevronDown, ChevronRight } from '@cliniqone/ui';
import titleLogo from '../../../assets/title-logo.png';
import type { CSSProperties } from 'react';

const HAS_ACCOUNT_KEY = 'cliniq_has_account';

/** Set after first successful auth to remember returning users */
export function markHasAccount() {
    try { localStorage.setItem(HAS_ACCOUNT_KEY, '1'); } catch {}
}

function isReturningUser(): boolean {
    try { return localStorage.getItem(HAS_ACCOUNT_KEY) === '1'; } catch { return false; }
}

export default function AuthPage() {
    const navigate = useNavigate();
    const toast = useToast((s) => s.show);
    const rtl = isRTL();

    // Auto-detect mode
    const [mode, setMode] = useState<'signin' | 'signup'>(isReturningUser() ? 'signin' : 'signup');
    const [emailExpanded, setEmailExpanded] = useState(false);

    // Shared state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);
    const [error, setError] = useState('');

    // Signup-only state
    const [nickname, setNickname] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+966');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Password strength (signup)
    const checks = {
        length: password.length >= SECURITY.PASSWORD_MIN_LENGTH,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password),
    };
    const strengthScore = Object.values(checks).filter(Boolean).length;
    const strengthLabel = strengthScore <= 1 ? 'Weak' : strengthScore <= 2 ? 'Fair' : strengthScore <= 3 ? 'Good' : 'Strong';
    const strengthColor = strengthScore <= 1 ? '#DC2626' : strengthScore <= 2 ? '#D97706' : strengthScore <= 3 ? '#3B82F6' : '#059669';
    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

    const isSigninValid = email.length > 0 && password.length >= SECURITY.PASSWORD_MIN_LENGTH;
    const isSignupValid = nickname.length >= 2 && email.includes('@') && password.length >= 8 && passwordsMatch && termsAccepted && checks.uppercase && checks.lowercase && checks.number;

    // Reset form when switching modes
    useEffect(() => {
        setError('');
        setErrors({});
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
    }, [mode]);

    // ── Sign In ────────────────────────────────────────────────
    async function handleLogin() {
        if (!isSigninValid) return;
        if (!navigator.onLine) { toast(t('common.offlineAction'), 'error'); return; }
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
            markHasAccount();
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

    // ── Sign Up ────────────────────────────────────────────────
    async function handleSignup() {
        if (!isSignupValid) return;
        if (!navigator.onLine) { toast(t('common.offlineAction'), 'error'); return; }
        setLoading(true);
        setErrors({});
        try {
            await safeFetch(
                () => signUp({ email, password, nickname, phone: phone ? `${countryCode}${phone}` : undefined }),
                { timeout: 8000, retries: 1, label: 'signUp' },
            );
            markHasAccount();
            toast(t('welcome.accountCreated'), 'success');
            navigate('/auth/verify-email');
        } catch (err: any) {
            const message = err?.message || '';
            if (message.includes('already registered')) {
                setErrors({ email: t('errors.emailExists') });
            } else if (message.includes('timed out')) {
                toast(t('settings.connectionSlow'), 'error');
            } else {
                setErrors({ general: message || t('errors.serverError') });
                toast(message || t('errors.serverError'), 'error');
            }
        } finally {
            setLoading(false);
        }
    }

    // ── Social Login (works for both modes) ────────────────────
    async function handleSocialLogin(provider: 'google' | 'apple') {
        const setProviderLoading = provider === 'google' ? setGoogleLoading : setAppleLoading;
        setProviderLoading(true);
        setError('');
        try {
            if (!navigator.onLine) { toast(t('common.offlineAction'), 'error'); setProviderLoading(false); return; }
            const handler = provider === 'google' ? handleGoogleSignIn : handleAppleSignIn;
            const success = await handler();
            if (success) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
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
                markHasAccount();
                navigate('/', { replace: true });
            }
        } catch (err: any) {
            setError(err?.message || `${provider} sign-in failed`);
        } finally {
            setProviderLoading(false);
        }
    }

    const isSignin = mode === 'signin';
    const anyLoading = loading || googleLoading || appleLoading;

    return (
        <div style={{ ...s.container, direction: rtl ? 'rtl' : 'ltr' }}>
            <NoInternetOverlay />

            <div className="page-enter" style={s.scroll}>
                {/* Back arrow */}
                <div style={s.backRow}>
                    <button
                        style={s.backButton}
                        onClick={() => navigate('/auth/landing')}
                        aria-label="Back"
                    >
                        <span style={{ fontSize: 18, transform: rtl ? 'scaleX(-1)' : undefined, display: 'inline-block' }}>←</span>
                    </button>
                </div>

                {/* Header — Logo + greeting */}
                <div style={s.header}>
                    <img src={titleLogo} alt="cliniq.one" style={s.headerLogo} />
                    <h1 style={s.title}>
                        {isSignin ? t('auth.welcomeBack') : t('auth.getStartedTitle')}
                    </h1>
                    <p style={s.subtitle}>
                        {isSignin ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
                    </p>
                </div>

                {/* Error Banner */}
                {(error || errors.general) && (
                    <div style={s.errorBanner}>
                        <p style={s.errorText}>{error || errors.general}</p>
                    </div>
                )}

                {/* ─── Social Buttons (always visible, primary) ─────── */}
                <div style={s.socialSection}>
                    <SocialLoginButton
                        provider="google"
                        label={`${t('auth.continueWith').replace(':', '')} ${t('auth.google')}`}
                        loading={googleLoading}
                        disabled={appleLoading || loading}
                        onPress={() => handleSocialLogin('google')}
                    />
                    <SocialLoginButton
                        provider="apple"
                        label={`${t('auth.continueWith').replace(':', '')} ${t('auth.apple')}`}
                        loading={appleLoading}
                        disabled={googleLoading || loading}
                        onPress={() => handleSocialLogin('apple')}
                    />
                </div>

                {/* ─── Collapsible Email Section ──────────────────── */}
                <div style={s.emailAccordion}>
                    <button
                        id="email-toggle"
                        style={s.emailToggle}
                        onClick={() => setEmailExpanded(!emailExpanded)}
                        disabled={anyLoading}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={s.emailIcon}>✉</span>
                            <span style={s.emailToggleText}>
                                {isSignin ? t('auth.signInWithEmail') : t('auth.orSignUpWithEmail')}
                            </span>
                        </div>
                        <ChevronDown
                            size={16}
                            color="var(--text-tertiary)"
                            style={{
                                transition: 'transform 0.3s ease',
                                transform: emailExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                        />
                    </button>

                    {/* Animated expand/collapse */}
                    <div
                        style={{
                            maxHeight: emailExpanded ? 800 : 0,
                            overflow: 'hidden',
                            transition: 'max-height 0.4s ease, opacity 0.3s ease',
                            opacity: emailExpanded ? 1 : 0,
                        }}
                    >
                        <div style={{ padding: '16px 0 0' }}>
                            {/* ── SIGN-IN FORM ─────────────────── */}
                            {isSignin ? (
                                <>
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={s.label}>{t('auth.emailOrPhone')}</label>
                                        <input
                                            type="email"
                                            placeholder="sarah@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            autoComplete="email"
                                            style={s.input}
                                        />
                                    </div>
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={s.label}>{t('auth.password')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                autoComplete="current-password"
                                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                                style={s.input}
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.eyeButton}>
                                                {showPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={s.optionsRow}>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('auth.rememberMe')}</span>
                                        <Link to="/auth/forgot-password" style={s.forgotLink}>{t('auth.forgotPassword')}</Link>
                                    </div>
                                    <button
                                        onClick={handleLogin}
                                        disabled={!isSigninValid || loading}
                                        style={{
                                            ...s.primaryButton,
                                            opacity: !isSigninValid || loading ? 0.5 : 1,
                                            cursor: !isSigninValid || loading ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {loading ? t('auth.signingIn') : t('auth.signIn')}
                                    </button>
                                </>
                            ) : (
                                /* ── SIGN-UP FORM ─────────────────── */
                                <>
                                    {/* Nickname */}
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={s.label}>{t('auth.nickname')}</label>
                                        <input style={s.input} placeholder="Sarah" value={nickname}
                                            onChange={(e) => setNickname(e.target.value.replace(/[^\p{L}\s]/gu, ''))} />
                                        <small style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('auth.nicknameHint')}</small>
                                    </div>

                                    {/* Email */}
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={s.label}>{t('auth.email')}</label>
                                        <input style={s.input} type="email" placeholder="sarah@email.com" value={email}
                                            onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                                        {errors.email && <small style={{ fontSize: 12, color: '#DC2626' }}>{errors.email}</small>}
                                    </div>

                                    {/* Phone */}
                                    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                                        <div style={{ ...s.input, width: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '14px 8px' }}>
                                            {countryCode} <ChevronRight size={12} color="var(--text-secondary)" style={{ transform: 'rotate(90deg)' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={s.label}>{t('auth.phone')}</label>
                                            <input style={s.input} type="tel" placeholder="50 123 4567" value={phone}
                                                onChange={(e) => setPhone(e.target.value)} />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div style={{ marginBottom: 4 }}>
                                        <label style={s.label}>{t('auth.password')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input style={s.input} type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                                                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.eyeButton}>
                                                {showPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Strength */}
                                    {password.length > 0 && (
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ height: 4, backgroundColor: 'var(--bg-card)', borderRadius: 2 }}>
                                                <div style={{ height: 4, width: `${(strengthScore / 5) * 100}%`, backgroundColor: strengthColor, borderRadius: 2, transition: 'width 0.3s' }} />
                                            </div>
                                            <span style={{ fontSize: 11, color: strengthColor, marginTop: 2, display: 'block' }}>{t('auth.passwordStrength')} {strengthLabel}</span>
                                            <div style={{ marginTop: 6 }}>
                                                {Object.entries(checks).map(([key, passed]) => (
                                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                        <span style={{ fontSize: 12, display: 'flex', alignItems: 'center' }}>{passed ? <CheckCircle size={12} color="#2DD4BF" /> : <span style={{ width: 12, height: 12, display: 'inline-block', border: '1px solid #475569', borderRadius: 3 }} />}</span>
                                                        <span style={{ fontSize: 12, color: passed ? 'var(--text-secondary)' : '#475569' }}>{t(`auth.${key === 'length' ? 'minChars' : key}`)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Confirm Password */}
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={s.label}>{t('auth.confirmPassword')}</label>
                                        <input style={s.input} type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                                            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                        {passwordsMatch && <small style={{ fontSize: 12, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} color="#059669" /> {t('auth.passwordsMatch')}</small>}
                                        {confirmPassword.length > 0 && !passwordsMatch && <small style={{ fontSize: 12, color: '#DC2626' }}>{t('errors.passwordsMismatch')}</small>}
                                    </div>

                                    {/* Terms */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, cursor: 'pointer' }}
                                        onClick={() => setTermsAccepted(!termsAccepted)}>
                                        <div style={{
                                            width: 24, height: 24, borderRadius: 6, border: '1.5px solid',
                                            borderColor: termsAccepted ? '#1A8A9E' : '#475569',
                                            backgroundColor: termsAccepted ? '#1A8A9E' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, color: '#fff', fontSize: 14, fontWeight: 700,
                                        }}>
                                            {termsAccepted && <CheckCircle size={16} color="#fff" />}
                                        </div>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {t('auth.termsAgree')} <Link to="/auth/legal" style={{ color: '#1A8A9E', fontWeight: 600 }}>{t('auth.termsOfService')}</Link> {t('auth.and')} <Link to="/auth/legal" style={{ color: '#1A8A9E', fontWeight: 600 }}>{t('auth.privacyPolicy')}</Link>
                                        </span>
                                    </div>

                                    {/* Submit */}
                                    <button onClick={handleSignup} disabled={!isSignupValid || loading}
                                        style={{
                                            ...s.primaryButton,
                                            backgroundColor: isSignupValid ? '#1A8A9E' : '#334155',
                                            opacity: loading ? 0.7 : 1,
                                            cursor: isSignupValid ? 'pointer' : 'not-allowed',
                                        }}>
                                        {loading ? t('auth.signingUp') : t('common.continue')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── Mode Toggle Footer ────────────────────────── */}
                <div style={s.toggleRow}>
                    {isSignin ? (
                        <>
                            <span style={s.toggleText}>{t('auth.noAccount')} </span>
                            <button
                                style={s.toggleLink}
                                onClick={() => { setMode('signup'); setEmailExpanded(false); }}
                            >
                                {t('auth.createAccount')}
                            </button>
                        </>
                    ) : (
                        <>
                            <span style={s.toggleText}>{t('landing.alreadyHaveAccount')} </span>
                            <button
                                style={s.toggleLink}
                                onClick={() => { setMode('signin'); setEmailExpanded(false); }}
                            >
                                {t('landing.login')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────
const s: Record<string, CSSProperties> = {
    container: { minHeight: '100vh', backgroundColor: 'var(--bg-primary)' },
    scroll: { maxWidth: 420, margin: '0 auto', padding: '0 24px 48px' },

    backRow: { paddingTop: 16, marginBottom: 8 },
    backButton: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--text-primary)', fontSize: 16,
    },

    header: { textAlign: 'center', paddingTop: 8, paddingBottom: 28 },
    headerLogo: { width: 160, height: 44, objectFit: 'contain' as const, marginBottom: 16 },
    title: { fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: 'var(--text-secondary)', margin: 0, lineHeight: '22px' },

    errorBanner: {
        backgroundColor: 'rgba(220,38,38,0.1)', padding: '12px 14px',
        borderRadius: 10, marginBottom: 16, borderLeft: '3px solid #DC2626',
    },
    errorText: { fontSize: 14, color: '#DC2626', margin: 0 },

    socialSection: { display: 'flex', flexDirection: 'column' as const, gap: 12, marginBottom: 20 },

    emailAccordion: {
        backgroundColor: 'var(--bg-card)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        padding: '0 16px',
        marginBottom: 24,
    },
    emailToggle: {
        width: '100%', padding: '16px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-primary)', fontSize: 14,
    },
    emailToggleText: { fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' },
    emailIcon: { fontSize: 16 },

    label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 },
    input: {
        width: '100%', padding: '14px 16px', borderRadius: 12,
        border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)', fontSize: 15, boxSizing: 'border-box' as const,
        outline: 'none',
    },
    eyeButton: {
        position: 'absolute' as const, right: 12, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
    },
    optionsRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
    },
    forgotLink: { fontSize: 13, color: '#1A8A9E', fontWeight: 600, textDecoration: 'none' },
    primaryButton: {
        width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
        backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700,
        marginBottom: 16,
    },

    toggleRow: { display: 'flex', justifyContent: 'center', paddingTop: 4 },
    toggleText: { fontSize: 14, color: 'var(--text-secondary)' },
    toggleLink: {
        fontSize: 14, color: '#1A8A9E', fontWeight: 600,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        textDecoration: 'none',
    },
};
