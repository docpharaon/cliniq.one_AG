import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, safeFetch } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';
import { User } from '@cliniqone/ui';

export default function EditProfilePage() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuthStore();
    const toast = useToast(s => s.show);
    const [nickname, setNickname] = useState(user?.nickname || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        setSaving(true);
        try {
            await safeFetch(
                () => supabase.from('users').update({ nickname, phone }).eq('id', user?.id),
                { timeout: 5000, retries: 1, label: 'updateProfile' },
            );
            await refreshUser();
            toast('Profile updated!', 'success');
            navigate(-1);
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
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={22} color="#1A8A9E" />
                    {t('settings.editProfile')}
                </h1>

                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{t('auth.nickname')}</label>
                    <input value={nickname} onChange={e => setNickname(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{t('settings.emailLabel')}</label>
                    <input value={user?.email || ''} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
                    <small style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('settings.emailCannotChange')}</small>
                </div>
                <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>{t('auth.phone')}</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" style={inputStyle} />
                </div>

                <button onClick={handleSave} disabled={saving} style={btnPrimary}>{saving ? t('settings.saving') : t('settings.saveChanges')}</button>
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 15, boxSizing: 'border-box', outline: 'none' };
const btnPrimary: React.CSSProperties = { width: '100%', padding: '14px', borderRadius: 14, border: 'none', backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' };
