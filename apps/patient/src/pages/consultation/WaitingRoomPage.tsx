import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { BackButton } from '../../components/BackButton';

export default function WaitingRoomPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const consultationId = searchParams.get('id') || '';
    const [status, setStatus] = useState('submitted');
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 800);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!consultationId) return;
        // Subscribe to changes
        const channel = supabase.channel(`waiting_${consultationId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultations', filter: `id=eq.${consultationId}` },
                (payload) => {
                    const newStatus = payload.new.status;
                    setStatus(newStatus);
                    if (['assigned', 'in_progress', 'report_ready', 'completed'].includes(newStatus)) {
                        navigate(`/consultation/${consultationId}`, { replace: true });
                    }
                })
            .subscribe();
        return () => { channel.unsubscribe(); };
    }, [consultationId]);

    return (
        <div style={{
            minHeight: '100vh', backgroundColor: 'var(--bg-primary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px',
        }}>
            <div style={{ textAlign: 'center', maxWidth: 380 }}>
                <div className="spinner" style={{ width: 56, height: 56, margin: '0 auto 20px' }} />
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    {t('waitingRoom.title')}{dots}
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px', marginBottom: 28 }}>
                    {t('waitingRoom.description')}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                    {[
                        { icon: '✅', text: 'Consultation submitted', done: true },
                        { icon: status === 'submitted' ? '⏳' : '✅', text: 'Finding your doctor', done: status !== 'submitted' },
                        { icon: '⏳', text: 'Doctor reviewing your case', done: false },
                        { icon: '⏳', text: 'Report being prepared', done: false },
                    ].map((step, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: step.done ? 1 : 0.5 }}>
                            <span style={{ fontSize: 16 }}>{step.icon}</span>
                            <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{step.text}</span>
                        </div>
                    ))}
                </div>

                <button onClick={() => navigate('/', { replace: true })} style={{
                    padding: '12px 28px', borderRadius: 12, border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', marginTop: 32,
                }}>← Return to Home</button>
            </div>
        </div>
    );
}
