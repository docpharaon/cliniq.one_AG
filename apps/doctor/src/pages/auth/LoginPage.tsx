import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { haptic } from '../../hooks/useHaptics';
import { colors, typography, spacing, SocialLoginButton } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { handleGoogleSignIn } from '../../services/googleAuth';
import { handleAppleSignIn } from '../../services/appleAuth';
import logoImg from '../../assets/logo.png';
import type { CSSProperties } from 'react';

export function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) { setError('Please enter email and password'); return; }
        if (!navigator.onLine) { setError('No internet connection. Please check your network and try again.'); return; }
        setLoading(true);
        setError('');

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
            if (authError) throw authError;

            await useAuthStore.getState().initialize();
            const store = useAuthStore.getState();

            if (store.isNewRegistration) { navigate('/auth/pending-approval', { replace: true }); return; }
            if (!store.doctor) { setError('No doctor profile found for this account.'); await supabase.auth.signOut(); useAuthStore.getState().clear(); setLoading(false); return; }
            if (store.doctor.must_change_password) { navigate('/auth/change-password', { replace: true }); }
            else { navigate('/tabs', { replace: true }); }
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials' ? 'Invalid email or password' : err.message || 'Login failed.');
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
                setError('No internet connection. Please check your network and try again.');
                setLoaderFn(false);
                return;
            }
            const handler = provider === 'google' ? handleGoogleSignIn : handleAppleSignIn;
            const success = await handler();
            if (success) handleOAuthSuccess();
        } catch (err: any) { setError(err?.message || 'OAuth sign-in failed'); }
        finally { setLoaderFn(false); }
    };

    const isDisabled = loading || googleLoading || appleLoading;

    return (
        <div style={s.container}>
            <div style={s.content}>
                {/* Header */}
                <div style={s.header}>
                    <img src={logoImg} alt="cliniq.one" style={s.logo} />
                    <span style={s.title}>cliniq.one</span>
                    <span style={s.subtitle}>Doctor Panel</span>
                </div>

                {/* Form */}
                <div style={s.form}>
                    {error && (
                        <div style={s.errorBox}>
                            <span style={s.errorText}>⚠️ {error}</span>
                        </div>
                    )}

                    <label style={s.label}>Email</label>
                    <input
                        style={s.input}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="doctor@cliniq.one"
                        type="email"
                        autoComplete="email"
                        disabled={isDisabled}
                    />

                    <label style={s.label}>Password</label>
                    <input
                        style={s.input}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        type="password"
                        autoComplete="current-password"
                        disabled={isDisabled}
                    />

                    <button
                        style={{ ...s.button, opacity: isDisabled ? 0.6 : 1 }}
                        className="pressable"
                        onClick={() => { haptic.medium(); handleLogin(); }}
                        disabled={isDisabled}
                    >
                        {loading
                            ? <div className="spinner" style={{ color: colors.bgPrimary }} />
                            : <span style={s.buttonText}>Sign In</span>
                        }
                    </button>

                    <button style={s.forgotLink} onClick={() => { haptic.light(); navigate('/auth/forgot-password'); }} disabled={isDisabled}>
                        <span style={{ fontSize: 11, color: colors.accentTeal }}>Forgot password?</span>
                    </button>

                    {/* Divider */}
                    <div style={s.divider}>
                        <div style={s.dividerLine} />
                        <span style={{ fontSize: 11, color: colors.textTertiary, marginInline: spacing.md }}>or</span>
                        <div style={s.dividerLine} />
                    </div>

                    {/* Social OAuth */}
                    <SocialLoginButton provider="google" label="Continue with Google" loading={googleLoading} disabled={appleLoading || loading} onPress={() => { haptic.medium(); handleOAuth('google'); }} />
                    <SocialLoginButton provider="apple" label="Continue with Apple" loading={appleLoading} disabled={googleLoading || loading} onPress={() => { haptic.medium(); handleOAuth('apple'); }} />
                </div>

                <p style={s.footer}>
                    New doctor? Sign in with Google or Apple to register.<br />
                    Admin approval required.
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
