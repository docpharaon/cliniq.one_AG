import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, safeFetch } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useIntakeStore, buildSnapshot } from '../../stores/intakeStore';
import { useAuthStore } from '../../stores/authStore';
import { analyzeQA } from '../../services/aiService';
import { useToast } from '../../components/ToastProvider';
import { Target, AlertTriangle } from '@cliniqone/ui';

export default function SubmitPage() {
    const navigate = useNavigate();
    const toast = useToast(s => s.show);
    const { user, refreshUser } = useAuthStore();
    const store = useIntakeStore();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const tokenCost = store.requestedDoctorFee || 3;
    const hasEnough = (user?.tokens_balance ?? 0) >= tokenCost;

    async function handleSubmit() {
        if (!hasEnough) { toast(t('intake.insufficientTokensDesc'), 'warning'); return; }
        setSubmitting(true);
        setError('');

        try {
            // 1. Generate AI summary
            let aiSummary = null;
            try {
                aiSummary = await analyzeQA(
                    store.qaHistory,
                    { nickname: user?.nickname || '', yearOfBirth: user?.year_of_birth || null, gender: user?.gender || null, country: user?.country || null },
                );
                store.setAiSummary(aiSummary as any);
            } catch (err) { console.warn('AI summary failed (non-blocking):', err); }

            // 2. Create consultation record
            const { data: consultation, error: consultErr } = await safeFetch(
                () => supabase.from('consultations').insert({
                    patient_id: user?.id,
                    chief_complaint: store.chiefComplaint,
                    specialty: store.specialty,
                    status: 'submitted',
                    token_cost: tokenCost,
                    ai_summary: aiSummary,
                    qa_history: store.qaHistory,
                    photos: store.photos,
                    medications: store.medications,
                    allergies: store.allergies,
                    patient_addendum: store.patientAddendum,
                    requested_doctor_id: store.requestedDoctorId,
                    doctor_selection_method: store.doctorSelectionMethod,
                }).select('id').single(),
                { timeout: 10000, retries: 1, label: 'createConsultation' },
            );

            if (consultErr) throw consultErr;

            // 3. Deduct tokens
            const { error: tokenErr } = await supabase.rpc('add_user_tokens', {
                p_user_id: user?.id,
                p_amount: -tokenCost,
                p_description: `Consultation: ${store.chiefComplaint.slice(0, 50)}`,
                p_type: 'spend',
            });
            if (tokenErr) console.warn('Token deduction warning:', tokenErr);

            // 4. Update session status
            if (store.sessionId) {
                await supabase.from('intake_sessions').update({ status: 'completed', consultation_id: consultation?.id }).eq('id', store.sessionId);
            }

            await refreshUser();
            store.reset();
            toast(t('intake.submitted'), 'success');
            navigate(`/consultation/${consultation?.id}/waiting-room`, { replace: true });
        } catch (err: any) {
            setError(err?.message || t('common.error'));
            toast(err?.message || t('common.error'), 'error');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 48px' }}>
                <div style={{ height: 4, backgroundColor: 'var(--bg-card)', borderRadius: 2, marginBottom: 24 }}>
                    <div style={{ height: 4, width: '100%', backgroundColor: '#1A8A9E', borderRadius: 2 }} />
                </div>

                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <Target size={48} color="#1A8A9E" style={{ display: 'block', marginBottom: 12 }} />
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{t('intake.readyToSubmit')}</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('intake.submitDescription')}</p>
                </div>

                {/* Cost Summary */}
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 18, marginBottom: 20, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('intake.consultationCost')}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1A8A9E' }}>{tokenCost} {t('tokens.tokensLabel')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('intake.yourBalance')}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: hasEnough ? '#059669' : '#DC2626' }}>{user?.tokens_balance ?? 0} {t('tokens.tokensLabel')}</span>
                    </div>
                    <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('intake.remaining')}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{(user?.tokens_balance ?? 0) - tokenCost} {t('tokens.tokensLabel')}</span>
                    </div>
                </div>

                {!hasEnough && (
                    <div style={{ backgroundColor: '#DC262620', borderRadius: 10, padding: '12px 14px', marginBottom: 16, borderLeft: '3px solid #DC2626' }}>
                        <p style={{ fontSize: 13, color: '#DC2626', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={14} color="#DC2626" /> {t('intake.insufficientTokensDesc')}</p>
                    </div>
                )}

                {error && (
                    <div style={{ backgroundColor: '#DC262620', borderRadius: 10, padding: '12px 14px', marginBottom: 16, borderLeft: '3px solid #DC2626' }}>
                        <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
                    </div>
                )}

                <button onClick={handleSubmit} disabled={!hasEnough || submitting}
                    style={{
                        width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                        backgroundColor: hasEnough ? '#1A8A9E' : '#334155',
                        color: '#fff', fontSize: 17, fontWeight: 700,
                        cursor: hasEnough ? 'pointer' : 'not-allowed',
                        opacity: submitting ? 0.7 : 1,
                    }}>
                    {submitting ? t('intake.submitting') : t('intake.submitConsultation')}
                </button>
            </div>
        </div>
    );
}
