import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, safeFetch } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';
import { BrandSpinner } from '../../components/BrandSpinner';

export default function InterventionBookingPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const toast = useToast(s => s.show);
    const [interventions, setInterventions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);

    useEffect(() => {
        (async () => {
            const { data } = await safeFetch(
                () => supabase.from('interventions').select('*').eq('consultation_id', id).order('priority', { ascending: true }),
                { timeout: 5000, retries: 1, label: 'fetchInterventions' },
            );
            setInterventions(data || []);
            setLoading(false);
        })();
    }, [id]);

    async function handleBook(interventionId: string) {
        setBooking(true);
        try {
            await supabase.from('interventions').update({ status: 'patient_accepted' }).eq('id', interventionId);
            toast('Intervention accepted! We\'ll contact you with booking details.', 'success');
            setInterventions(prev => prev.map(i => i.id === interventionId ? { ...i, status: 'patient_accepted' } : i));
        } catch (err: any) {
            toast(err?.message || 'Failed to accept', 'error');
        } finally {
            setBooking(false);
        }
    }

    if (loading) return <BrandSpinner />;

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 8px' }}>🧪 Recommended Tests</h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' }}>The doctor has recommended the following tests or procedures</p>

                {interventions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', backgroundColor: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🧪</span>
                        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>No interventions recommended</p>
                    </div>
                ) : interventions.map(iv => (
                    <div key={iv.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 16, marginBottom: 10, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{iv.name}</p>
                                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>{iv.type} • Priority: {iv.priority}</p>
                            </div>
                            {iv.status === 'patient_accepted' ? (
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', padding: '4px 10px', borderRadius: 8, backgroundColor: '#05966920' }}>Accepted ✓</span>
                            ) : (
                                <button onClick={() => handleBook(iv.id)} disabled={booking}
                                    style={{ padding: '6px 14px', borderRadius: 8, border: 'none', backgroundColor: '#1A8A9E', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                    Accept
                                </button>
                            )}
                        </div>
                        {iv.instructions && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 0', lineHeight: '18px' }}>{iv.instructions}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
