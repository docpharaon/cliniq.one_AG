import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, safeFetch } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { COUNTRIES } from '@cliniqone/config';
import { GenderMale, GenderFemale, GenderDiverse, Lock } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';

export default function PersonalDetailsPage() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuthStore();
    const toast = useToast((s) => s.show);

    const [yearOfBirth, setYearOfBirth] = useState('');
    const [gender, setGender] = useState('');
    const [country, setCountry] = useState('SA');
    const [loading, setLoading] = useState(false);

    const currentYear = new Date().getFullYear();
    const isValid = yearOfBirth.length === 4 && Number(yearOfBirth) >= 1920 && Number(yearOfBirth) <= currentYear && gender;

    async function handleSave() {
        if (!isValid || !user?.id) return;
        setLoading(true);

        try {
            const { error } = await safeFetch(
                () => supabase.from('users').update({
                    year_of_birth: Number(yearOfBirth),
                    gender,
                    country,
                    onboarding_completed: true,
                }).eq('id', user.id),
                { timeout: 5000, retries: 1, label: 'updateProfile' },
            );

            if (error) throw error;
            await refreshUser();
            toast(t('settings.profileUpdated'), 'success');
            navigate('/', { replace: true });
        } catch (err: any) {
            toast(err?.message || 'Failed to save', 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 24px 48px' }}>
                <div style={{ paddingTop: 16, marginBottom: 24 }}><BackButton /></div>

                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{t('registration.personalDetails')}</h1>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>{t('registration.stepOf', { current: '2', total: '3' })}: {t('registration.step2PersonalDetails')}</p>
                <div style={{ height: 4, backgroundColor: 'var(--bg-card)', borderRadius: 2, marginBottom: 24 }}>
                    <div style={{ height: 4, width: '66%', backgroundColor: '#1A8A9E', borderRadius: 2 }} />
                </div>

                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: '12px 14px', marginBottom: 24, borderLeft: '3px solid #1A8A9E', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Lock size={16} color="#1A8A9E" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: '18px' }}>
                        {t('registration.privacyNote')}
                    </p>
                </div>

                {/* Year of Birth */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{t('registration.yearOfBirth')}</label>
                    <input type="number" placeholder="1990" value={yearOfBirth}
                        onChange={(e) => setYearOfBirth(e.target.value)} min={1920} max={currentYear}
                        style={inputStyle} />
                </div>

                {/* Gender */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{t('registration.gender')}</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {[
                            { value: 'male', labelKey: 'registration.male', Icon: GenderMale, iconColor: '#34D399' },
                            { value: 'female', labelKey: 'registration.female', Icon: GenderFemale, iconColor: '#F472B6' },
                            { value: 'other', labelKey: 'registration.other', Icon: GenderDiverse, iconColor: '#A78BFA' },
                        ].map((g) => (
                            <button key={g.value} onClick={() => setGender(g.value)}
                                style={{
                                    flex: 1, padding: '14px 8px', borderRadius: 12,
                                    border: `2px solid ${gender === g.value ? '#1A8A9E' : '#334155'}`,
                                    backgroundColor: gender === g.value ? '#1A8A9E15' : 'var(--bg-card)',
                                    color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}>
                                <g.Icon size={18} color={g.iconColor} />
                                {t(g.labelKey)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Country */}
                <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>{t('registration.country')}</label>
                    <select value={country} onChange={(e) => setCountry(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}>
                        {COUNTRIES.map((c: any) => (
                            <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                        ))}
                    </select>
                </div>

                <button onClick={handleSave} disabled={!isValid || loading}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                        backgroundColor: isValid ? '#1A8A9E' : '#334155',
                        color: '#fff', fontSize: 16, fontWeight: 700,
                        cursor: isValid ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1,
                    }}>
                    {loading ? 'Saving…' : t('common.continue')}
                </button>
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 };
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 15, boxSizing: 'border-box', outline: 'none',
};
