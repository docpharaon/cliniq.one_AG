import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const toast = useToast((s) => s.show);

    async function handleReset() {
        if (!email.includes('@')) return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/login`,
            });
            if (error) throw error;
            setSent(true);
            toast(t('forgotPassword.sent'), 'success');
        } catch (err: any) {
            toast(err?.message || 'Failed to send reset email', 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 24px 48px' }}>
                <div style={{ paddingTop: 16, marginBottom: 32 }}><BackButton /></div>

                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>🔐</span>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{t('auth.forgotPassword')}</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '20px' }}>
                        {sent ? 'We sent a password reset link to your email. Check your inbox.' : t('auth.forgotPasswordDescription')}
                    </p>
                </div>

                {!sent ? (
                    <>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                {t('auth.email')}
                            </label>
                            <input
                                type="email" placeholder="sarah@email.com" value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                                style={{
                                    width: '100%', padding: '14px 16px', borderRadius: 12,
                                    border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-primary)', fontSize: 15, boxSizing: 'border-box', outline: 'none',
                                }}
                            />
                        </div>
                        <button onClick={handleReset} disabled={!email.includes('@') || loading}
                            style={{
                                width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                                backgroundColor: email.includes('@') ? '#1A8A9E' : '#334155',
                                color: '#fff', fontSize: 16, fontWeight: 700,
                                cursor: email.includes('@') ? 'pointer' : 'not-allowed',
                                opacity: loading ? 0.7 : 1,
                            }}>
                            {loading ? 'Sending…' : t('auth.sendResetLink')}
                        </button>
                    </>
                ) : (
                    <button onClick={() => setSent(false)}
                        style={{
                            width: '100%', padding: '14px', borderRadius: 14, border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                        }}>
                        Send again
                    </button>
                )}

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <Link to="/auth/login" style={{ fontSize: 14, color: '#1A8A9E', fontWeight: 600, textDecoration: 'none' }}>
                        ← Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}
