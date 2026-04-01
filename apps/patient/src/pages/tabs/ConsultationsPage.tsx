import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { t, toLocalNum, localDate } from '@cliniqone/i18n';
import type { Consultation, ConsultationStatus } from '@cliniqone/types';
import { useAuthStore } from '../../stores/authStore';
import { useConsultations } from '../../hooks/useConsultations';
import { FadeIn } from '../../components/FadeIn';
import { ConsultationListSkeleton } from '../../components/Skeleton';
import { PullToRefresh } from '../../components/PullToRefresh';
import { haptic } from '../../hooks/useHaptics';
import { Search, Stethoscope, ClipboardList, Refresh, Download, Share } from '@cliniqone/ui';

const STATUS_FILTERS = [
    { key: 'all', labelKey: 'consultations.filterAll' },
    { key: 'active', labelKey: 'consultations.filterActive' },
    { key: 'completed', labelKey: 'consultations.filterCompleted' },
];

const STATUS_CONFIG: Record<string, { labelKey: string; color: string }> = {
    draft: { labelKey: 'consultations.statusDraft', color: 'var(--text-tertiary)' },
    intake_in_progress: { labelKey: 'consultations.statusIntake', color: '#3B82F6' },
    pending_payment: { labelKey: 'consultations.statusPending', color: '#D97706' },
    submitted: { labelKey: 'consultations.statusSubmitted', color: '#1A8A9E' },
    assigned: { labelKey: 'consultations.statusAssigned', color: '#3B82F6' },
    in_progress: { labelKey: 'consultations.statusInProgress', color: '#3B82F6' },
    inquiry_sent: { labelKey: 'consultations.statusInquirySent', color: '#D97706' },
    report_ready: { labelKey: 'consultations.statusReportReady', color: '#059669' },
    completed: { labelKey: 'consultations.statusCompleted', color: '#059669' },
    cancelled: { labelKey: 'consultations.statusCancelled', color: '#DC2626' },
};

function filterConsultations(consultations: Consultation[], filter: string): Consultation[] {
    if (filter === 'all') return consultations;
    if (filter === 'active') return consultations.filter(c =>
        ['submitted', 'assigned', 'in_progress', 'report_ready', 'inquiry_sent', 'pending_payment', 'intake_in_progress'].includes(c.status),
    );
    if (filter === 'completed') return consultations.filter(c => c.status === 'completed');
    return consultations;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return t('consultations.justNow');
    if (hours < 24) return t('consultations.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('consultations.daysAgo', { count: days });
}

function generateReportText(consultation: Consultation, lang?: string): string {
    const report = consultation.report as Record<string, any> | null;
    if (!report) return '';
    const isAr = lang === 'ar' || lang === 'Arabic';
    const pick = (enKey: string, arKey: string) => (isAr && report[arKey]) ? report[arKey] : (report[enKey] || '');
    const lines = [
        `MEDICAL CONSULTATION REPORT — cliniq.one`,
        `Date: ${new Date(consultation.created_at).toLocaleDateString()}`,
        `Case ID: ${consultation.id.slice(0, 8).toUpperCase()}`,
        '', `CHIEF COMPLAINT:`, consultation.chief_complaint || 'N/A', '',
    ];
    if (report.diagnosis) lines.push(`DIAGNOSIS: ${report.diagnosis}`);
    const tp = pick('treatment_plan', 'treatment_plan_ar'); if (tp) lines.push('', 'TREATMENT PLAN:', tp);
    const pe = pick('patient_education', 'patient_education_ar'); if (pe) lines.push('', 'PATIENT EDUCATION:', pe);
    const fu = pick('follow_up', 'follow_up_ar'); if (fu) lines.push('', 'FOLLOW-UP:', fu);
    const meds = consultation.prescription?.medications || report.prescriptions;
    if (meds?.length) { lines.push('', 'PRESCRIPTION:'); for (const rx of meds) lines.push(`  - ${rx.name || rx.medication} — ${rx.dose || ''} (${rx.duration || ''})`); }
    lines.push('', '--- cliniq.one ---', '', 'DISCLAIMER: This is a telemedicine report.');
    return lines.join('\n');
}

async function handleDownloadReport(consultation: Consultation, lang?: string) {
    if (!consultation.report) { alert('Report data is not available.'); return; }
    try {
        const { downloadPatientPdf } = await import('../../lib/generatePatientPdf');
        await downloadPatientPdf(consultation, lang);
    } catch {
        const text = generateReportText(consultation, lang);
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `report-${consultation.id.slice(0, 8)}.txt`; a.click();
        URL.revokeObjectURL(url);
    }
}

async function handleShareReport(consultation: Consultation, lang?: string) {
    if (!consultation.report) { alert('Report data is not available.'); return; }
    const text = generateReportText(consultation, lang);
    if (navigator.share) { try { await navigator.share({ title: 'Medical Report', text }); } catch {} }
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text); alert('Report copied to clipboard.'); }
}

export default function ConsultationsPage() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [sortNewest, setSortNewest] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuthStore();
    const { data: liveData, isLoading, refetch } = useConsultations(user?.id || '');
    const consultations = liveData || [];

    let results = filterConsultations(consultations, filter);
    if (search.trim()) {
        const q = search.trim().toLowerCase();
        results = results.filter(c => (c.chief_complaint || '').toLowerCase().includes(q) || (c.specialty || '').toLowerCase().includes(q));
    }
    results = [...results].sort((a, b) => sortNewest ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const handleRefresh = useCallback(async () => {
        haptic.medium();
        await refetch();
        haptic.success();
    }, [refetch]);

    if (isLoading) return <ConsultationListSkeleton />;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <PullToRefresh onRefresh={handleRefresh}>
            <div className="page-fade" style={{ maxWidth: 500, margin: '0 auto', padding: '24px 20px 48px' }}>
                <FadeIn><h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>{t('tabs.consultations')}</h1></FadeIn>

                {/* Search */}
                <FadeIn delay={100}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, border: '1px solid var(--border)' }}>
                        <Search size={16} color="#2DD4BF" />
                        <input placeholder={t('consultations.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)}
                            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14 }} />
                        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14 }}>✕</button>}
                    </div>
                </FadeIn>

                {/* Filters + Sort */}
                <FadeIn delay={200}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {STATUS_FILTERS.map(f => (
                                <button key={f.key} onClick={() => { haptic.select(); setFilter(f.key); }} className="pressable" style={{
                                    padding: '6px 16px', borderRadius: 20,
                                    backgroundColor: filter === f.key ? '#1A8A9E20' : 'var(--bg-card)',
                                    border: `1px solid ${filter === f.key ? '#1A8A9E' : '#334155'}`,
                                    color: filter === f.key ? '#1A8A9E' : 'var(--text-secondary)',
                                    fontSize: 13, fontWeight: filter === f.key ? 600 : 400,
                                }}>{t(f.labelKey)}</button>
                            ))}
                        </div>
                        <button onClick={() => { haptic.select(); setSortNewest(!sortNewest); }} className="pressable" style={{
                            padding: '6px 12px', borderRadius: 20, backgroundColor: 'var(--bg-card)',
                            border: 'none', color: 'var(--text-secondary)', fontSize: 12,
                        }}>{sortNewest ? '↓ ' + t('consultations.sortNewest') : '↑ ' + t('consultations.sortOldest')}</button>
                    </div>
                </FadeIn>

                {/* List */}
                {results.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', backgroundColor: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
                        <div style={{ marginBottom: 12 }}><ClipboardList size={48} color="#2DD4BF" /></div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{t('dashboard.noConsults')}</p>
                        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>{t('dashboard.startFirst')}</p>
                    </div>
                ) : results.map(c => {
                    const sc = STATUS_CONFIG[c.status] || { labelKey: c.status, color: 'var(--text-tertiary)' };
                    return (
                        <div key={c.id} onClick={() => { haptic.light(); navigate(`/consultation/${c.id}`); }} className="pressable" style={{
                            backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: 16, marginBottom: 10,
                            border: '1px solid var(--border)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Stethoscope size={16} color="#2DD4BF" />
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{(c.specialty || 'General').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</span>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, backgroundColor: sc.color + '20', color: sc.color }}>
                                    {t(sc.labelKey)}
                                </span>
                            </div>
                            <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.chief_complaint}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{timeAgo(c.created_at)}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{toLocalNum(c.token_cost)} {t('tokens.tokensLabel')}</span>
                            </div>
                            {c.status === 'completed' && c.report && (
                                <div style={{ backgroundColor: '#05966920', marginTop: 10, padding: 8, borderRadius: 8, textAlign: 'center' }}>
                                    <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>{t('consultations.reportAvailable')}</span>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                                        <button onClick={e => { e.stopPropagation(); handleDownloadReport(c, user?.language); }}
                                            style={{ padding: '4px 12px', borderRadius: 6, border: 'none', backgroundColor: '#05966920', color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                            <Download size={12} color="#2DD4BF" /> {t('consultations.downloadReport')}
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); handleShareReport(c, user?.language); }}
                                            style={{ padding: '4px 12px', borderRadius: 6, border: 'none', backgroundColor: '#05966920', color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                            <Share size={12} color="#2DD4BF" /> {t('consultations.shareReport')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* New Consultation button */}
                <button onClick={() => { haptic.medium(); navigate('/intake'); }} className="pressable" style={{
                    width: '100%', padding: '14px', borderRadius: 14, border: '1px solid #1A8A9E',
                    backgroundColor: 'transparent', color: '#1A8A9E', fontSize: 16, fontWeight: 700,
                    marginTop: 20,
                }}>{t('consultations.startNewConsultation')}</button>

            </div>
            </PullToRefresh>
        </div>
    );
}
