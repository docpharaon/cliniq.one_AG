import { useI18n } from '@cliniqone/i18n';
import type { CSSProperties } from 'react';

export function ChangePasswordPage() {
    const { session, doctor } = useAuthStore();
    if (!session || !doctor) return <Navigate to="/auth/login" replace />;
    if (!doctor.must_change_password) return <Navigate to="/tabs" replace />;
    return <ChangePasswordForm />;
}

function ChangePasswordForm() {
    const navigate = useNavigate();
    const { t, isRTL } = useI18n();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) { setError(t('doctor.auth.change.lenError')); return; }
        if (newPassword !== confirmPassword) { setError(t('doctor.auth.change.matchError')); return; }

        setLoading(true);
        setError('');

        try {
            const doctor = useAuthStore.getState().doctor;
            if (doctor) {
                const { error: updateError } = await supabase.from('doctors').update({ must_change_password: false }).eq('id', doctor.id);
                if (updateError) throw updateError;
            }

            const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
            if (authError) throw authError;

            const session = useAuthStore.getState().session;
            if (session) {
                const updatedDoctor = await getDoctorProfile(session.user.id);
                useAuthStore.getState().setDoctor(updatedDoctor);
            }

            navigate('/tabs', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Failed to change password.');
        } finally { setLoading(false); }
    };

    return (
        <div style={{ ...s.container, textAlign: isRTL ? 'right' : 'left' }}>
            <div style={s.content}>
                <div style={s.header}>
                    <Lock size={48} color={colors.accentTeal} style={{ marginBottom: 12 }} />
                    <span style={s.title}>{t('doctor.auth.change.title')}</span>
                    <p style={s.subtitle}>{t('doctor.auth.change.instr')}</p>
                </div>

                <div style={s.form}>
                    {error && <div style={{ ...s.errorBox, flexDirection: isRTL ? 'row-reverse' : 'row' }}><span style={{ ...s.errorText, display: 'flex', alignItems: 'center', gap: 4, flexDirection: isRTL ? 'row-reverse' : 'row' }}><AlertTriangle size={13} color={colors.error} /> {error}</span></div>}

                    <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.auth.change.newPassword')}</label>
                    <input style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('doctor.auth.change.placeholderNew')} type="password" />

                    <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.auth.change.confirmPassword')}</label>
                    <input style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('doctor.auth.change.placeholderConfirm')} type="password" />

                    <button style={{ ...s.button, opacity: loading ? 0.6 : 1 }} onClick={handleChangePassword} disabled={loading}>
                        {loading ? <div className="spinner" style={{ color: colors.bgPrimary }} /> : <span style={s.buttonText}>{t('doctor.auth.change.savePassword')}</span>}
                    </button>
                </div>

                <p style={s.footer}>{t('doctor.auth.change.footer')}</p>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    content: { display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', paddingInline: 24 },
    header: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 },
    title: { fontSize: typography.h1.fontSize, fontWeight: 700, color: colors.accentTeal },
    subtitle: { fontSize: typography.body.fontSize, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingInline: 20 },
    form: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 24, border: `1px solid ${colors.border}` },
    label: { display: 'block', fontSize: typography.caption.fontSize, color: colors.textSecondary, marginBottom: 6, marginTop: 16, textTransform: 'uppercase' as any, letterSpacing: 1 },
    input: { display: 'block', width: '100%', backgroundColor: colors.bgTertiary, borderRadius: 12, paddingInline: 16, paddingBlock: 14, color: colors.textPrimary, fontSize: typography.body.fontSize, border: `1px solid ${colors.border}` },
    button: { width: '100%', backgroundColor: colors.accentTeal, borderRadius: 12, paddingBlock: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
    buttonText: { fontSize: typography.button.fontSize, fontWeight: 700, color: colors.bgPrimary },
    errorBox: { backgroundColor: colors.errorFaded, borderRadius: 12, padding: 12 },
    errorText: { fontSize: typography.caption.fontSize, color: colors.error },
    footer: { fontSize: typography.caption.fontSize, color: colors.textTertiary, textAlign: 'center', marginTop: 24 },
};
