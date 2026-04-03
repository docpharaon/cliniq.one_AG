import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { BackButton } from '../../components/BackButton';
import { BrandSpinner } from '../../components/BrandSpinner';
import { CheckCircle, Clock } from '@cliniqone/ui';

export default function WaitingRoomPage() {
    const { id: consultationId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState('submitted');
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 800);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!consultationId) return;
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

    const steps = [
        { Icon: CheckCircle, color: '#059669', text: t('waitingRoom.stepSubmitted'), done: true },
        { Icon: status === 'submitted' ? Clock : CheckCircle, color: status === 'submitted' ? 'var(--text-tertiary)' : '#059669', text: t('waitingRoom.stepFinding'), done: status !== 'submitted' },
        { Icon: Clock, color: 'var(--text-tertiary)', text: t('waitingRoom.stepReviewing'), done: false },
        { Icon: Clock, color: 'var(--text-tertiary)', text: t('waitingRoom.stepPreparing'), done: false },
    ];

    return (
        <div className="slide-in-page" style={{
            minHeight: '100vh', backgroundColor: 'var(--bg-primary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px',
        }}>
            <div style={{ textAlign: 'center', maxWidth: 380 }} className="fade-in">
                <div style={{ marginBottom: 24 }}>
                    <BrandSpinner />
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    {t('waitingRoom.title')}{dots}
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px', marginBottom: 28 }}>
                    {t('waitingRoom.description')}
                </p>

                <div style={{
                    backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 18,
                    border: '1px solid var(--border)', textAlign: 'left', marginBottom: 24,
                }}>
                    {steps.map((step, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                            borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
                            opacity: step.done ? 1 : 0.45,
                            transition: 'opacity 0.3s',
                        }}>
                            <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}><step.Icon size={18} color={step.color} /></div>
                            <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: step.done ? 600 : 400 }}>
                                {step.text}
                            </span>
                        </div>
                    ))}
                </div>

                <button onClick={() => navigate('/', { replace: true })} className="pressable" style={{
                    padding: '12px 28px', borderRadius: 12, border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 14,
                    cursor: 'pointer', fontWeight: 500,
                }}>{t('waitingRoom.returnHome')}</button>
            </div>
        </div>
    );
}
