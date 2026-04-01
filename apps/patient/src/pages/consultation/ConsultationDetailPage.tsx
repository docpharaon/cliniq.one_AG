import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, safeFetch } from '@cliniqone/api';
import { t, localDate, toLocalNum, getLocale } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { BackButton } from '../../components/BackButton';
import { PatientRefundModal } from '../../components/PatientRefundModal';
import { FadeIn } from '../../components/FadeIn';
import type { Consultation } from '@cliniqone/types';
import { BrandSpinner } from '../../components/BrandSpinner';

export default function ConsultationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [consultation, setConsultation] = useState<Consultation | null>(null);
    const [loading, setLoading] = useState(true);
    const [showRefund, setShowRefund] = useState(false);

    useEffect(() => {
        if (!id) return;
        (async () => {
            const { data } = await safeFetch(
                () => supabase.from('consultations').select('*, prescription:prescriptions(*)').eq('id', id).single(),
                { timeout: 5000, retries: 1, label: 'fetchConsultation' },
            );
            setConsultation(data);
            setLoading(false);
        })();
    }, [id]);

    if (loading) return <BrandSpinner />;
    if (!consultation) return <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#DC2626' }}>{t('consultDetail.notFound')}</p></div>;

    const report = consultation.report as Record<string, any> | null;
    const lang = getLocale();
    const meds = consultation.prescription?.medications ?? [];

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 500, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />

                <FadeIn>
                    <div style={{ marginTop: 16, marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{consultation.chief_complaint}</h1>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '6px 0 0' }}>
                            🩺 {(consultation.specialty || 'General').replace(/_/g, ' ')} • {localDate(consultation.created_at)}
                        </p>
                    </div>
                </FadeIn>

                {/* Status */}
                <FadeIn delay={100}>
                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 16, marginBottom: 12, border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{t('consultations.filterAll') === 'All' ? 'Status' : 'الحالة'}</p>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#1A8A9E', margin: 0 }}>{consultation.status.replace(/_/g, ' ').toUpperCase()}</p>
                    </div>
                </FadeIn>

                {/* Report */}
                {report && (
                    <FadeIn delay={200}>
                        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 16, marginBottom: 12, border: '1px solid #059669' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#059669', margin: '0 0 12px' }}>{t('consultDetail.medicalReport')}</h3>
                            {report.diagnosis && <InfoRow label={t('consultDetail.diagnosis')} value={report.diagnosis} />}
                            {report.icd10 && <InfoRow label={t('consultDetail.icd10')} value={report.icd10} />}
                            {report.treatment_plan && <InfoRow label={t('consultDetail.treatmentPlan')} value={report.treatment_plan} />}
                            {report.patient_education && <InfoRow label="Patient Education" value={report.patient_education} />}
                            {report.follow_up && <InfoRow label={t('consultDetail.followUp')} value={report.follow_up} />}
                            {report.warning_signs && <InfoRow label="Warning Signs" value={Array.isArray(report.warning_signs) ? report.warning_signs.join(', ') : report.warning_signs} />}
                        </div>
                    </FadeIn>
                )}

                {/* Prescription */}
                {meds.length > 0 && (
                    <FadeIn delay={300}>
                        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 16, marginBottom: 12, border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>{t('consultDetail.ePrescription')}</h3>
                            {meds.map((med: any, i: number) => (
                                <div key={i} style={{ padding: '10px 0', borderBottom: i < meds.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{med.name || med.medication}</p>
                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{med.dose || med.dosage} • {med.frequency} • {med.duration}</p>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                )}

                {/* Actions */}
                <FadeIn delay={400}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                        {consultation.status === 'inquiry_sent' && (
                            <button onClick={() => navigate(`/intake/inquiry-chat?consultationId=${id}`)} style={btnPrimary}>
                                🔍 {t('inquiry.respond')}
                            </button>
                        )}
                        {consultation.status === 'completed' && report && (
                            <>
                                <button onClick={() => navigate(`/intake/report-chat?consultationId=${id}`)} style={btnPrimary}>
                                    💬 {t('consultDetail.conversation')}
                                </button>
                                <button onClick={() => navigate(`/consultation/${id}/feedback`)} style={btnSecondary}>
                                    ⭐ {t('feedback.title')}
                                </button>
                            </>
                        )}
                        <button onClick={() => setShowRefund(true)} style={{ ...btnSecondary, color: '#DC2626', borderColor: '#DC2626' }}>
                            {t('consultDetail.startFollowUp') === '🔁 Start Follow-up Consultation' ? 'Request Refund' : 'طلب استرداد'}
                        </button>
                    </div>
                </FadeIn>
            </div>

            <PatientRefundModal visible={showRefund} onClose={() => setShowRefund(false)} consultationId={id || ''} consultationFee={consultation.token_cost} />
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', margin: '0 0 2px' }}>{label}</p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: '20px' }}>{value}</p>
        </div>
    );
}

const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '14px', borderRadius: 14, border: 'none',
    backgroundColor: '#1A8A9E', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
    width: '100%', padding: '14px', borderRadius: 14, border: '1px solid var(--border)',
    backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
