import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, safeFetch } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';
import { User, Camera, Shield } from '@cliniqone/ui';

export default function EditProfilePage() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuthStore();
    const toast = useToast(s => s.show);
    const [nickname, setNickname] = useState(user?.nickname || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [saving, setSaving] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast(t('editProfile.photoTooLarge'), 'error');
            return;
        }
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onload = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
    }

    async function uploadAvatar(): Promise<string | null> {
        if (!avatarFile || !user?.id) return null;
        const ext = avatarFile.name.split('.').pop() || 'jpg';
        const path = `avatars/${user.id}/avatar.${ext}`;
        const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        if (error) throw new Error('Photo upload failed');
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        return data?.publicUrl || null;
    }

    async function handleSave() {
        setSaving(true);
        try {
            let avatarUrl = user?.avatar_url || null;
            if (avatarFile) {
                avatarUrl = await uploadAvatar();
            }
            await safeFetch(
                () => supabase.from('users').update({
                    nickname,
                    phone,
                    ...(avatarUrl !== user?.avatar_url ? { avatar_url: avatarUrl } : {}),
                }).eq('id', user?.id),
                { timeout: 5000, retries: 1, label: 'updateProfile' },
            );
            await refreshUser();
            toast(t('settings.profileUpdated'), 'success');
            navigate(-1);
        } catch (err: any) {
            toast(err?.message || 'Failed to update', 'error');
        } finally {
            setSaving(false);
        }
    }

    const initials = (nickname || 'U').charAt(0).toUpperCase();

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={22} color="#1A8A9E" />
                    {t('settings.editProfile')}
                </h1>

                {/* Profile Photo Section */}
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    marginBottom: 28, paddingBottom: 20,
                    borderBottom: '1px solid var(--border)',
                }}>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            width: 88, height: 88, borderRadius: '50%',
                            background: avatarPreview
                                ? `url(${avatarPreview}) center/cover no-repeat`
                                : 'linear-gradient(135deg, #1A8A9E 0%, #2DD4BF 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', position: 'relative',
                            border: '3px solid rgba(26,138,158,0.2)',
                            transition: 'transform 0.2s',
                        }}
                        className="pressable"
                    >
                        {!avatarPreview && (
                            <span style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>{initials}</span>
                        )}
                        <div style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 30, height: 30, borderRadius: '50%',
                            backgroundColor: '#1A8A9E', border: '2px solid var(--bg-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Camera size={14} color="#fff" />
                        </div>
                    </div>
                    <p style={{ fontSize: 13, color: '#1A8A9E', fontWeight: 600, margin: '10px 0 2px', cursor: 'pointer' }}
                       onClick={() => fileInputRef.current?.click()}
                    >
                        {t('editProfile.changePhoto')}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                        {t('editProfile.photoHint')}
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handlePhotoSelect}
                    />
                </div>

                {/* Nickname Field + Why Nickname */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{t('auth.nickname')}</label>
                    <input value={nickname} onChange={e => setNickname(e.target.value)} style={inputStyle} placeholder={t('settings.nicknamePlaceholder')} />

                    {/* Why we use nicknames - reassuring card */}
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        marginTop: 10, padding: '10px 12px',
                        background: 'linear-gradient(135deg, rgba(26,138,158,0.06) 0%, rgba(45,212,191,0.04) 100%)',
                        borderRadius: 10,
                        border: '1px solid rgba(26,138,158,0.12)',
                    }}>
                        <div style={{
                            width: 26, height: 26, borderRadius: 8,
                            background: 'rgba(26,138,158,0.10)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, marginTop: 1,
                        }}>
                            <Shield size={14} color="#1A8A9E" />
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#1A8A9E', margin: '0 0 2px' }}>
                                {t('editProfile.whyNicknameTitle')}
                            </p>
                            <p style={{ fontSize: 11, lineHeight: '16px', color: 'var(--text-secondary)', margin: 0 }}>
                                {t('editProfile.whyNicknameDesc')}
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{t('settings.emailLabel')}</label>
                    <input value={user?.email || ''} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
                    <small style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('settings.emailCannotChange')}</small>
                </div>
                <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>{t('auth.phone')}</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" style={inputStyle} placeholder={t('settings.phonePlaceholder')} />
                </div>

                <button onClick={handleSave} disabled={saving} style={{
                    ...btnPrimary,
                    opacity: saving ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                    {saving ? t('settings.saving') : t('settings.saveChanges')}
                </button>
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 15, boxSizing: 'border-box', outline: 'none' };
const btnPrimary: React.CSSProperties = { width: '100%', padding: '14px', borderRadius: 14, border: 'none', backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' };
