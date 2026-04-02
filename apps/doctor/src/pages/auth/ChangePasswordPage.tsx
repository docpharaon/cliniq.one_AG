import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase, getDoctorProfile } from '@cliniqone/api';
import { colors, typography, Lock, AlertTriangle } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import type { CSSProperties } from 'react';

export function ChangePasswordPage() {
    const { session, doctor } = useAuthStore();
    if (!session || !doctor) return <Navigate to="/auth/login" replace />;
    if (!doctor.must_change_password) return <Navigate to="/tabs" replace />;
    return <ChangePasswordForm />;
}

function ChangePasswordForm() {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

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
        <div style={s.container}>
            <div style={s.content}>
                <div style={s.header}>
                    <Lock size={48} color={colors.accentTeal} style={{ marginBottom: 12 }} />
                    <span style={s.title}>Change Password</span>
                    <p style={s.subtitle}>Your temporary password must be changed before you can continue.</p>
                </div>

                <div style={s.form}>
                    {error && <div style={s.errorBox}><span style={s.errorText}><AlertTriangle size={13} color={colors.error} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {error}</span></div>}

                    <label style={s.label}>New Password</label>
                    <input style={s.input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password (min 6 characters)" type="password" />

                    <label style={s.label}>Confirm Password</label>
                    <input style={s.input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" type="password" />

                    <button style={{ ...s.button, opacity: loading ? 0.6 : 1 }} onClick={handleChangePassword} disabled={loading}>
                        {loading ? <div className="spinner" style={{ color: colors.bgPrimary }} /> : <span style={s.buttonText}>Set New Password</span>}
                    </button>
                </div>

                <p style={s.footer}>This is a one-time requirement set by your administrator.</p>
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
