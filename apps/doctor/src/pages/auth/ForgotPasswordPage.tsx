import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { haptic } from '../../hooks/useHaptics';
import { colors, typography, Mail, Key } from '@cliniqone/ui';
import type { CSSProperties } from 'react';

export function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleReset = async () => {
        if (!email) return;
        setLoading(true);
        try { await supabase.auth.resetPasswordForEmail(email.trim()); } catch {}
        setSent(true);
        setLoading(false);
    };

    if (sent) {
        return (
            <div style={s.container}>
                <div style={s.content}>
                    <Mail size={48} color={colors.accentTeal} style={{ marginBottom: 16 }} />
                    <span style={s.title}>Check your email</span>
                    <p style={s.message}>If an account exists with {email}, you'll receive a password reset link.</p>
                    <button style={s.button} className="pressable" onClick={() => { haptic.light(); navigate(-1); }}>
                        <span style={s.buttonText}>Back to Login</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={s.container}>
            <div style={s.content}>
                <Key size={48} color={colors.accentTeal} style={{ marginBottom: 16 }} />
                <span style={s.title}>Reset Password</span>
                <p style={s.message}>Enter your email to receive a reset link.</p>

                <input
                    style={s.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@cliniq.one"
                    type="email"
                />

                <button style={{ ...s.button, opacity: loading ? 0.6 : 1 }} className="pressable" onClick={() => { haptic.medium(); handleReset(); }} disabled={loading}>
                    {loading ? <div className="spinner" style={{ color: colors.bgPrimary }} /> : <span style={s.buttonText}>Send Reset Link</span>}
                </button>

                <button style={s.backLink} onClick={() => { haptic.light(); navigate(-1); }}>
                    <span style={{ fontSize: 11, color: colors.accentTeal }}>← Back to Login</span>
                </button>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flex: 1, height: '100%', backgroundColor: colors.bgPrimary, justifyContent: 'center' },
    content: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingInline: 24 },
    emoji: { fontSize: 48, marginBottom: 16 },
    title: { fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary, marginBottom: 8 },
    message: { fontSize: typography.body.fontSize, color: colors.textTertiary, textAlign: 'center', marginBottom: 24 },
    input: { width: '100%', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingInline: 16, paddingBlock: 14, color: colors.textPrimary, fontSize: typography.body.fontSize, border: `1px solid ${colors.border}`, marginBottom: 16 },
    button: { width: '100%', backgroundColor: colors.accentTeal, borderRadius: 12, paddingBlock: 16, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    buttonText: { fontSize: typography.button.fontSize, fontWeight: 700, color: colors.bgPrimary },
    backLink: { marginTop: 16 },
};
