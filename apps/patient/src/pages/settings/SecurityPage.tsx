import { useState } from 'react';
import { supabase } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';
import { Lock } from '@cliniqone/ui';

export default function SecurityPage() {
    const toast = useToast(s => s.show);
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [saving, setSaving] = useState(false);

    async function handleChangePassword() {
        if (newPw !== confirmPw) { toast('Passwords don\'t match', 'warning'); return; }
        if (newPw.length < 8) { toast('Password must be at least 8 characters', 'warning'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPw });
            if (error) throw error;
            toast('Password updated!', 'success');
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
        } catch (err: any) {
            toast(err?.message || 'Failed to update', 'error');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={22} color="#2DD4BF" /> {t('settings.security')}</h1>
                {['Current Password', 'New Password', 'Confirm New Password'].map((label, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>
                        <input type="password" value={[currentPw, newPw, confirmPw][i]}
                            onChange={e => [setCurrentPw, setNewPw, setConfirmPw][i](e.target.value)}
                            style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                ))}
                <button onClick={handleChangePassword} disabled={saving || !newPw}
                    style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Updating…' : 'Change Password'}
                </button>
            </div>
        </div>
    );
}
