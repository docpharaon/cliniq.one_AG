import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { Mail } from '@cliniqone/ui';
import { useToast } from '../../components/ToastProvider';

export default function VerifyEmailPage() {
    const navigate = useNavigate();
    const [resending, setResending] = useState(false);
    const toast = useToast((s) => s.show);

    async function handleResend() {
        setResending(true);
        try {
            // Get the email from storage/URL or ask user
            const email = localStorage.getItem('signup_email') || '';
            if (!email) {
                toast('Please go back and try signing up again.', 'warning');
                return;
            }
            const { error } = await supabase.auth.resend({ type: 'signup', email });
            if (error) throw error;
            toast('Verification email resent!', 'success');
        } catch (err: any) {
            toast(err?.message || 'Failed to resend', 'error');
        } finally {
            setResending(false);
        }
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: 420, padding: '0 24px', textAlign: 'center' }}>
                <div style={{ marginBottom: 20 }}><Mail size={56} color="#2DD4BF" /></div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>{t('auth.checkYourEmail')}</h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px', marginBottom: 32 }}>
                    {t('auth.verifyEmailDescription')}
                </p>

                <button onClick={handleResend} disabled={resending}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 15, fontWeight: 600,
                        cursor: 'pointer', marginBottom: 12, opacity: resending ? 0.7 : 1,
                    }}>
                    {resending ? 'Sending…' : t('auth.resendEmail')}
                </button>

                <button onClick={() => navigate('/auth/login')}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                        backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                    }}>
                    {t('auth.backToLogin')}
                </button>

                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 20, lineHeight: '18px' }}>
                    Didn't receive the email? Check your spam folder or try resending.
                </p>
            </div>
        </div>
    );
}
