import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, safeFetch } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useIntakeStore } from '../../stores/intakeStore';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';
import { BrandSpinner } from '../../components/BrandSpinner';

export default function DoctorSelectPage() {
    const navigate = useNavigate();
    const toast = useToast(s => s.show);
    const { user } = useAuthStore();
    const { specialty, setRequestedDoctor, requestedDoctorId } = useIntakeStore();
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoctor, setSelectedDoctor] = useState<string | null>(requestedDoctorId);

    useEffect(() => {
        (async () => {
            const { data } = await safeFetch(
                () => supabase.from('users').select('id, nickname, avatar_url, specialty, consultation_fee, rating, total_consultations')
                    .eq('role', 'doctor').eq('is_active', true).eq('is_available', true)
                    .order('rating', { ascending: false }).limit(20),
                { timeout: 5000, retries: 1, label: 'fetchDoctors' },
            );
            setDoctors(data || []);
            setLoading(false);
        })();
    }, [specialty]);

    function handleContinue() {
        const doc = doctors.find(d => d.id === selectedDoctor);
        setRequestedDoctor(selectedDoctor, selectedDoctor ? 'search' : 'auto', doc?.consultation_fee || null, doc?.specialty || null);
        navigate('/intake/submit');
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <div style={{ height: 4, backgroundColor: 'var(--bg-card)', borderRadius: 2, margin: '0 0 24px' }}>
                    <div style={{ height: 4, width: '92%', backgroundColor: '#1A8A9E', borderRadius: 2 }} />
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{t('intake.selectDoctor')}</h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' }}>{t('intake.selectDoctorHint')}</p>

                {/* Auto-assign option */}
                <button onClick={() => { setSelectedDoctor(null); handleContinue(); }} style={{
                    width: '100%', padding: '16px', borderRadius: 14, backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)', cursor: 'pointer', marginBottom: 16, textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 14,
                }}>
                    <span style={{ fontSize: 24 }}>🎯</span>
                    <div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t('intake.autoAssign')}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{t('intake.autoAssignHint')}</p>
                    </div>
                </button>

                {/* Doctor List */}
                {loading ? (
                    <BrandSpinner fullScreen={false} />
                ) : doctors.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>No doctors available right now</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {doctors.map(doc => (
                            <button key={doc.id} onClick={() => setSelectedDoctor(doc.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                                    padding: '14px 16px', borderRadius: 14, backgroundColor: 'var(--bg-card)',
                                    border: `2px solid ${selectedDoctor === doc.id ? '#1A8A9E' : '#334155'}`,
                                    cursor: 'pointer', textAlign: 'left',
                                }}>
                                <div style={{ width: 44, height: 44, borderRadius: 22, background: 'linear-gradient(135deg, #1A8A9E, #0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 700 }}>
                                    {(doc.nickname || 'D').charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Dr. {doc.nickname}</p>
                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                        {(doc.specialty || 'General').replace(/_/g, ' ')} • ★ {doc.rating || 'N/A'}
                                    </p>
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#1A8A9E' }}>{doc.consultation_fee || 3} 🪙</span>
                            </button>
                        ))}
                    </div>
                )}

                {selectedDoctor && (
                    <button onClick={handleContinue} style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                        backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700,
                        cursor: 'pointer', marginTop: 20,
                    }}>{t('common.continue')}</button>
                )}
            </div>
        </div>
    );
}
