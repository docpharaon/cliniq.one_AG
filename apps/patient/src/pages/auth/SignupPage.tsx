import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp, safeFetch } from '@cliniqone/api';
import { t, isRTL } from '@cliniqone/i18n';
import { SECURITY } from '@cliniqone/config';
import { handleGoogleSignIn } from '../../services/googleAuth';
import { handleAppleSignIn } from '../../services/appleAuth';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';
import { SocialLoginButton } from '../../components/SocialLoginButton';
import { Eye, EyeOff, CheckCircle } from '@cliniqone/ui';

export default function SignupPage() {
    const navigate = useNavigate();
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
    const [appleLoading, setAppleLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const toast = useToast((s) => s.show);

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
    const isValid = nickname.length >= 2 && email.includes('@') && password.length >= 8 && passwordsMatch && termsAccepted && checks.uppercase && checks.lowercase && checks.number;

    async function handleSignup() {
        if (!isValid) return;
        if (!navigator.onLine) {
            toast(t('common.offlineAction'), 'error');
            return;
        }
        setLoading(true);
        setErrors({});

        try {
            await safeFetch(
                () => signUp({ email, password, nickname, phone: phone ? `${countryCode}${phone}` : undefined }),
                { timeout: 8000, retries: 1, label: 'signUp' },
            );
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

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', direction: isRTL() ? 'rtl' : 'ltr' }}>
            <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 24px 48px' }}>
                <div style={{ paddingTop: 16, marginBottom: 24 }}>
                    <BackButton />
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '12px 0 4px' }}>{t('auth.createAccount')}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t('registration.stepOf', { current: '1', total: '3' })}: {t('registration.step1Title')}</p>
                    <div style={{ height: 4, backgroundColor: 'var(--bg-card)', borderRadius: 2, marginTop: 12 }}>
                        <div style={{ height: 4, width: '33%', backgroundColor: '#1A8A9E', borderRadius: 2 }} />
                    </div>
                </div>

                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>{t('registration.letsGetStarted')}</p>

                {/* Social */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    <SocialLoginButton provider="google" label={`${t('auth.continueWith').replace(':', '')} ${t('auth.google')}`} loading={googleLoading} disabled={appleLoading}
                        onPress={async () => { if (!navigator.onLine) { toast(t('common.offlineAction'), 'error'); return; } setGoogleLoading(true); try { const s = await handleGoogleSignIn(); if (s) navigate('/', { replace: true }); } finally { setGoogleLoading(false); } }} />
                    <SocialLoginButton provider="apple" label={`${t('auth.continueWith').replace(':', '')} ${t('auth.apple')}`} loading={appleLoading} disabled={googleLoading}
                        onPress={async () => { if (!navigator.onLine) { toast(t('common.offlineAction'), 'error'); return; } setAppleLoading(true); try { const s = await handleAppleSignIn(); if (s) navigate('/', { replace: true }); } finally { setAppleLoading(false); } }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{t('auth.orSignUpWithEmail')}</span>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
                </div>

                {/* Nickname */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{t('auth.nickname')}</label>
                    <input style={inputStyle} placeholder="Sarah" value={nickname}
                        onChange={(e) => setNickname(e.target.value.replace(/[^\p{L}\s]/gu, ''))} />
                    <small style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('auth.nicknameHint')}</small>
                </div>

                {/* Email */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{t('auth.email')}</label>
                    <input style={inputStyle} type="email" placeholder="sarah@email.com" value={email}
                        onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                    {errors.email && <small style={{ fontSize: 12, color: '#DC2626' }}>{errors.email}</small>}
                </div>

                {/* Phone */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <div style={{ ...inputStyle, width: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        {countryCode} ▼
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>{t('auth.phone')}</label>
                        <input style={inputStyle} type="tel" placeholder="50 123 4567" value={phone}
                            onChange={(e) => setPhone(e.target.value)} />
                    </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: 4 }}>
                    <label style={labelStyle}>{t('auth.password')}</label>
                    <div style={{ position: 'relative' }}>
                        <input style={inputStyle} type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                            value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
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
                    <label style={labelStyle}>{t('auth.confirmPassword')}</label>
                    <input style={inputStyle} type={showPassword ? 'text' : 'password'} placeholder="••••••••"
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
                        {termsAccepted && '✓'}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {t('auth.termsAgree')} <Link to="/auth/legal" style={{ color: '#1A8A9E', fontWeight: 600 }}>{t('auth.termsOfService')}</Link> {t('auth.and')} <Link to="/auth/legal" style={{ color: '#1A8A9E', fontWeight: 600 }}>{t('auth.privacyPolicy')}</Link>
                    </span>
                </div>

                {/* Submit */}
                <button onClick={handleSignup} disabled={!isValid || loading}
                    style={{ width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none', backgroundColor: isValid ? '#1A8A9E' : '#334155',
                        color: '#fff', fontSize: 16, fontWeight: 700, cursor: isValid ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1 }}>
                    {loading ? t('auth.signingUp') : t('common.continue')}
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('landing.alreadyHaveAccount')} </span>
                    <Link to="/auth/login" style={{ fontSize: 14, color: '#1A8A9E', fontWeight: 600, textDecoration: 'none' }}>{t('landing.login')}</Link>
                </div>
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 };
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 15, boxSizing: 'border-box', outline: 'none',
};
