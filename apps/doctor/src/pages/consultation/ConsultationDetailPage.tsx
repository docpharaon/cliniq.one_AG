import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { colors, typography, AlertTriangle, User, MessageSquare, Bot, Ban, FileText, Gem, Siren, Edit, CheckCircle, XCircle, Paperclip } from '@cliniqone/ui';
import { useConsultationDetail, useConsultationReports, type ConsultationReport } from '../../hooks/useDoctorData';
import { RefundRequestModal } from '../../components/RefundRequestModal';
import { BackButton } from '../../components/BackButton';
import { BrandSpinner } from '../../components/BrandSpinner';
import { haptic } from '../../hooks/useHaptics';
import type { CSSProperties } from 'react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={s.section}>
            <span style={s.sectionTitle}>{title}</span>
            <div style={s.sectionBody}>{children}</div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={s.infoRow}>
            <span style={{ fontSize: 11, color: colors.textTertiary, flex: 1 }}>{label}</span>
            <span style={{ fontSize: 14, color: colors.textPrimary, flex: 2, textAlign: 'right' }}>{value}</span>
        </div>
    );
}

function Tag({ label, color }: { label: string; color: string }) {
    return (
        <span style={{ backgroundColor: `${color}22`, color, paddingInline: 10, paddingBlock: 4, borderRadius: 8, fontSize: 11, fontWeight: 600 }}>{label}</span>
    );
}

export function ConsultationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: consultation, isLoading, error } = useConsultationDetail(id || '');
    const [showRefund, setShowRefund] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const canRefund = consultation && ['assigned', 'in_progress', 'report_ready'].includes(consultation.status);
    const { data: reports } = useConsultationReports(id || '');
    const [selectedReport, setSelectedReport] = useState<ConsultationReport | null>(null);

    if (isLoading) {
        return <BrandSpinner message="Loading patient file..." />;
    }

    if (error || !consultation) {
        return (
            <div style={s.container}>
                <div style={s.header}>
                    <BackButton />
                    <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary }}>Patient File</span>
                    <div style={{ width: 50 }} />
                </div>
                <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 24 }}>
                    <AlertTriangle size={48} color={colors.warning} />
                    <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary, marginBottom: 4 }}>Failed to load</span>
                    <span style={{ fontSize: 14, color: colors.textTertiary, textAlign: 'center', marginBottom: 20 }}>{(error as any)?.message || 'Consultation not found.'}</span>
                    <button style={s.retryBtn} className="pressable" onClick={() => { haptic.medium(); navigate(-1); }}><span style={{ fontSize: 14, fontWeight: 600, color: colors.bgPrimary }}>Go Back</span></button>
                </div>
            </div>
        );
    }

    const patient = consultation.patient as any;
    const aiSummary = consultation.ai_summary as Record<string, any> | null;
    const patientAge = patient?.year_of_birth ? new Date().getFullYear() - patient.year_of_birth : null;

    return (
        <div style={s.container}>
            {/* Header */}
            <div style={s.header}>
                <BackButton />
                <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary }}>Patient File</span>
                <span style={{ fontSize: 11, color: colors.gold, backgroundColor: colors.goldFaded, paddingInline: 10, paddingBlock: 4, borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Gem size={11} color={colors.gold} /> {consultation.token_cost || 3}</span>
            </div>

            <div style={s.scroll} className="scrollable">
                <div style={s.scrollInner}>
                    {/* Patient Info */}
                    <Section title="Patient Information">
                        <InfoRow label="Nickname" value={patient?.nickname || 'Patient'} />
                        {patientAge && <InfoRow label="Age / Gender" value={`${patientAge} / ${patient?.gender || '—'}`} />}
                        {!patientAge && patient?.gender && <InfoRow label="Gender" value={patient.gender} />}
                        {patient?.city && <InfoRow label="Location" value={`${patient.city}${patient?.country ? `, ${patient.country}` : ''}`} />}
                        {patient?.language && <InfoRow label="Language" value={patient.language === 'ar' ? 'Arabic' : 'English'} />}
                        {patient?.insurance_provider && <InfoRow label="Insurance" value={`${patient.insurance_provider}${patient.insurance_policy_number ? ` – ${patient.insurance_policy_number}` : ''}`} />}
                    </Section>

                    {/* Chief Complaint */}
                    <Section title="Chief Complaint">
                        <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: '22px' }}>{consultation.chief_complaint || 'No complaint provided'}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                            <Tag label={consultation.specialty} color={colors.accentTeal} />
                            <Tag label={consultation.priority} color={consultation.priority === 'urgent' ? colors.error : colors.warning} />
                        </div>
                    </Section>

                    {/* AI Assessment */}
                    {aiSummary && (
                        <Section title="AI Preliminary Assessment">
                            {aiSummary.summary && <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: '22px' }}>{aiSummary.summary}</p>}
                            {aiSummary.keyFindings?.length > 0 && (
                                <>
                                    <span style={s.subTitle}>Key Findings</span>
                                    {aiSummary.keyFindings.map((f: string, i: number) => <p key={i} style={s.listItem}>✓ {f}</p>)}
                                </>
                            )}
                            {aiSummary.differentialDx?.length > 0 && (
                                <>
                                    <span style={s.subTitle}>Differential Diagnosis</span>
                                    {aiSummary.differentialDx.map((dx: any, i: number) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBlock: 6 }}>
                                            <span style={{ fontSize: 11, color: colors.textPrimary, width: 120 }}>{dx.diagnosis}</span>
                                            <div style={{ flex: 1, height: 8, backgroundColor: colors.bgTertiary, borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${dx.likelihood}%`, backgroundColor: colors.accentTeal, borderRadius: 4 }} />
                                            </div>
                                            <span style={{ fontSize: 11, color: colors.textSecondary, width: 36, textAlign: 'right' }}>{dx.likelihood}%</span>
                                        </div>
                                    ))}
                                </>
                            )}
                            {aiSummary.entities?.medications?.length > 0 && (
                                <>
                                    <span style={s.subTitle}>Current Medications</span>
                                    {aiSummary.entities.medications.map((med: string, i: number) => <p key={i} style={s.listItem}>• {med}</p>)}
                                </>
                            )}
                            {aiSummary.entities?.allergies?.length > 0 && (
                                <>
                                    <span style={s.subTitle}>Allergies</span>
                                    {aiSummary.entities.allergies.map((a: string, i: number) => <p key={i} style={s.listItem}>• {a}</p>)}
                                </>
                            )}
                        </Section>
                    )}

                    {/* Protocol Flags */}
                    {consultation.protocol_flags && consultation.protocol_flags.length > 0 && (
                        <Section title="⚠ Protocol Flags">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {consultation.protocol_flags.map((flag: string, i: number) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, backgroundColor: colors.warningFaded, borderRadius: 10, border: `1px solid ${colors.warning}40` }}>
                                        <Siren size={14} color={colors.warning} />
                                        <span style={{ fontSize: 13, color: colors.warning, fontWeight: 600, flex: 1 }}>{flag}</span>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Patient Photos */}
                    {(consultation as any).photos && (consultation as any).photos.length > 0 && (
                        <Section title="Patient Photos">
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {(consultation as any).photos.map((photo: any, i: number) => (
                                    <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: `1px solid ${colors.border}`, width: 'calc(50% - 5px)' }}>
                                        <img
                                            src={photo.url || photo}
                                            alt={`Patient photo ${i + 1}`}
                                            style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block', backgroundColor: colors.bgTertiary }}
                                            onClick={() => { setSelectedPhoto(typeof photo === 'string' ? photo : photo.url); }}
                                        />
                                        {photo.label && (
                                            <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, textAlign: 'center' }}>{photo.label}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Medical Reports (AI-Verified) */}
                    {reports && reports.length > 0 && (
                        <Section title="📎 Medical Reports">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {reports.map((report) => {
                                    const isVerified = report.is_verified;
                                    const isOutdated = report.date_relevance === 'outdated';
                                    const isRejected = !isVerified && report.rejection_reason;
                                    const analysis = report.ai_analysis as Record<string, any> | null;
                                    const docType = (report.document_type || 'general').replace(/_/g, ' ');

                                    const badgeColor = isRejected ? '#dc2626' : isOutdated ? colors.warning : colors.success;
                                    const badgeLabel = isRejected ? 'Rejected' : isOutdated ? 'Outdated' : 'Verified';
                                    const BadgeIcon = isRejected ? XCircle : isOutdated ? AlertTriangle : CheckCircle;

                                    return (
                                        <div key={report.id} style={{
                                            backgroundColor: colors.bgTertiary,
                                            borderRadius: 12,
                                            padding: 14,
                                            border: `1px solid ${isRejected ? '#dc262630' : isOutdated ? `${colors.warning}30` : `${colors.success}30`}`,
                                        }}>
                                            {/* Header row */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                <FileText size={16} color={colors.accentTeal} />
                                                <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                    {docType}
                                                </span>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, color: badgeColor,
                                                    backgroundColor: `${badgeColor}15`, padding: '2px 8px',
                                                    borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 3,
                                                }}>
                                                    <BadgeIcon size={10} color={badgeColor} /> {badgeLabel}
                                                </span>
                                            </div>

                                            {/* AI Summary */}
                                            {report.report_summary && (
                                                <p style={{ fontSize: 13, color: colors.textSecondary, lineHeight: '20px', marginBottom: 8 }}>
                                                    {report.report_summary}
                                                </p>
                                            )}

                                            {/* Key findings */}
                                            {analysis && analysis.extractedData?.keyFindings?.length > 0 && (
                                                <div style={{ marginBottom: 8 }}>
                                                    {analysis.extractedData.keyFindings.slice(0, 3).map((f: string, i: number) => (
                                                        <p key={i} style={{ fontSize: 12, color: colors.textSecondary, paddingBlock: 2, margin: 0 }}>
                                                            ✓ {f}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Lab values (flagged) */}
                                            {analysis && analysis.extractedData?.values?.filter((v: any) => v.flag === 'high' || v.flag === 'low' || v.flag === 'critical').length > 0 && (
                                                <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {analysis.extractedData.values
                                                        .filter((v: any) => v.flag === 'high' || v.flag === 'low' || v.flag === 'critical')
                                                        .slice(0, 5)
                                                        .map((v: any, i: number) => (
                                                            <span key={i} style={{
                                                                fontSize: 10, fontWeight: 600,
                                                                color: v.flag === 'critical' ? '#dc2626' : colors.warning,
                                                                backgroundColor: v.flag === 'critical' ? '#dc262615' : colors.warningFaded,
                                                                padding: '3px 8px', borderRadius: 6,
                                                            }}>
                                                                {v.flag === 'high' ? '↑' : v.flag === 'low' ? '↓' : '⚠'} {v.name}: {v.value} {v.unit}
                                                            </span>
                                                        ))}
                                                </div>
                                            )}

                                            {/* Date + Institution */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 11, color: colors.textTertiary }}>
                                                    {report.document_date ? `📅 ${report.document_date}` : ''}
                                                    {analysis?.extractedData?.institution ? ` • ${analysis.extractedData.institution}` : ''}
                                                </span>
                                                {report.ai_confidence !== null && (
                                                    <span style={{ fontSize: 10, color: colors.textTertiary }}>
                                                        AI: {report.ai_confidence}%
                                                    </span>
                                                )}
                                            </div>

                                            {/* Rejection reason */}
                                            {report.rejection_reason && (
                                                <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6, marginBottom: 0 }}>
                                                    Reason: {report.rejection_reason}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Summary row */}
                            {(() => {
                                const verified = reports.filter(r => r.is_verified).length;
                                const outdated = reports.filter(r => r.date_relevance === 'outdated').length;
                                const rejected = reports.filter(r => !r.is_verified && r.rejection_reason).length;
                                return (
                                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {verified > 0 && <Tag label={`${verified} verified`} color={colors.success} />}
                                        {outdated > 0 && <Tag label={`${outdated} outdated`} color={colors.warning} />}
                                        {rejected > 0 && <Tag label={`${rejected} rejected`} color="#dc2626" />}
                                    </div>
                                );
                            })()}
                        </Section>
                    )}

                    {/* Consultation Metadata */}
                    <Section title="Consultation Metadata">
                        <InfoRow label="ID" value={consultation.id.slice(0, 8)} />
                        <InfoRow label="Status" value={consultation.status} />
                        <InfoRow label="Priority" value={consultation.priority} />
                        <InfoRow label="Specialty" value={consultation.specialty} />
                        <InfoRow label="Submitted" value={new Date(consultation.created_at).toLocaleString()} />
                        {consultation.assigned_at && <InfoRow label="Assigned" value={new Date(consultation.assigned_at).toLocaleString()} />}
                        <InfoRow label="Token Cost" value={`${consultation.token_cost || 3} tokens`} />
                    </Section>

                    {/* Refund Button */}
                    {canRefund && (
                        <button style={s.refundBtn} className="pressable" onClick={() => { haptic.warning(); setShowRefund(true); }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: colors.warning, display: 'inline-flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={16} color={colors.warning} /> Request Refund</span>
                        </button>
                    )}

                    {/* Compose CTA */}
                    <button style={s.composeBtn} className="pressable" onClick={() => { haptic.medium(); navigate(`/consultation/${consultation.id}/respond`); }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: colors.bgPrimary, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Edit size={18} color={colors.bgPrimary} /> Compose Medical Response</span>
                    </button>
                </div>
            </div>

            {canRefund && (
                <RefundRequestModal
                    visible={showRefund}
                    onClose={() => setShowRefund(false)}
                    consultationId={consultation.id}
                    doctorUserId={consultation.doctor_id || ''}
                    tokenCost={consultation.token_cost || 3}
                    onSuccess={() => navigate(-1)}
                />
            )}

            {/* Photo Lightbox */}
            {selectedPhoto && (
                <div style={s.photoOverlay} onClick={() => setSelectedPhoto(null)}>
                    <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 102 }}>
                        <button onClick={() => setSelectedPhoto(null)} style={{ fontSize: 28, color: '#fff', fontWeight: 700 }}>✕</button>
                    </div>
                    <img src={selectedPhoto} alt="Patient photo" style={{ maxWidth: '90%', maxHeight: '85%', borderRadius: 12, objectFit: 'contain' }} onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 20, paddingBlock: 12, borderBottom: `1px solid ${colors.border}` },
    scroll: { flex: 1 },
    scrollInner: { padding: 20, paddingBottom: 40 },
    section: { marginBottom: 20 },
    sectionTitle: { display: 'block', fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary, marginBottom: 10 },
    sectionBody: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, border: `1px solid ${colors.border}` },
    infoRow: { display: 'flex', justifyContent: 'space-between', paddingBlock: 8, borderBottom: `1px solid ${colors.border}` },
    subTitle: { display: 'block', fontSize: 11, color: colors.accentTeal, fontWeight: 700, marginTop: 14, marginBottom: 6, textTransform: 'uppercase' as any, letterSpacing: 1 },
    listItem: { fontSize: 14, color: colors.textSecondary, paddingBlock: 4 },
    retryBtn: { backgroundColor: colors.accentTeal, borderRadius: 12, paddingInline: 24, paddingBlock: 12 },
    composeBtn: { width: '100%', backgroundColor: colors.accentTeal, borderRadius: 16, paddingBlock: 18, marginTop: 8 },
    refundBtn: { width: '100%', backgroundColor: colors.warningFaded, border: `1px solid ${colors.warning}`, borderRadius: 16, paddingBlock: 16, marginTop: 12 },
    photoOverlay: { position: 'fixed' as any, inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 101 },
};
