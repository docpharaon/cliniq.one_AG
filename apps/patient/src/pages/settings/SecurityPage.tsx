import { useState } from 'react';
import { supabase } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';
import { Lock, Eye, EyeOff } from '@cliniqone/ui';
import { haptic } from '../../hooks/useHaptics';

export default function SecurityPage() {
    const toast = useToast(s => s.show);
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    async function handleChangePassword() {
        if (newPw !== confirmPw) { toast(t('settings.passwordsDontMatch'), 'warning'); return; }
        if (newPw.length < 8) { toast(t('settings.passwordMinLength'), 'warning'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPw });
            if (error) throw error;
            haptic.success();
            toast(t('settings.passwordChanged'), 'success');
            setNewPw(''); setConfirmPw('');
        } catch (err: any) {
            toast(err?.message || t('settings.passwordChangeFailed'), 'error');
        } finally {
            setSaving(false);
        }
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '14px 16px', borderRadius: 12,
        border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)', fontSize: 15, boxSizing: 'border-box', outline: 'none',
    };

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Lock size={22} color="#2DD4BF" /> {t('settings.security')}
                </h1>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        {t('settings.newPassword')}
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input type={showPassword ? 'text' : 'password'} value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            placeholder={t('settings.minCharsPlaceholder', { count: '8' })}
                            style={inputStyle} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                        }}>
                            {showPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        {t('settings.confirmNewPassword')}
                    </label>
                    <input type={showPassword ? 'text' : 'password'} value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        placeholder={t('settings.reenterPassword')}
                        style={inputStyle} />
                    {confirmPw.length > 0 && newPw !== confirmPw && (
                        <small style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'block' }}>
                            {t('settings.passwordsDontMatch')}
                        </small>
                    )}
                    {confirmPw.length > 0 && newPw === confirmPw && (
                        <small style={{ fontSize: 12, color: '#059669', marginTop: 4, display: 'block' }}>
                            ✓ {t('auth.passwordsMatch')}
                        </small>
                    )}
                </div>

                <button onClick={handleChangePassword} disabled={saving || !newPw} className="pressable"
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                        backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700,
                        cursor: 'pointer', opacity: saving ? 0.7 : 1,
                    }}>
                    {saving ? t('settings.changingPassword') : t('settings.changePassword')}
                </button>
            </div>
        </div>
    );
}
