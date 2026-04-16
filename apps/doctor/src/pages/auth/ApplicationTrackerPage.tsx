import { useState, useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@cliniqone/i18n';
import { colors, spacing, radius, Edit, FileText, Search, Calendar, CheckCircle, PartyPopper, XCircle, Refresh, Send, ClipboardList, AlertTriangle, Camera, Smartphone, Share } from '@cliniqone/ui';
import type { CliniqIconProps } from '@cliniqone/ui';
import { supabase, getMyApplicationWithDocs } from '@cliniqone/api';
import type { DoctorApplication } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import { BrandSpinner } from '../../components/BrandSpinner';

const STATUS_CONFIG_RAW: Record<string, { Icon: (p: CliniqIconProps) => ReactNode; titleKey: string; subtitleKey: string; color: string; bg: string }> = {
    draft: {
        Icon: Edit, titleKey: 'doctor.tracker.status.draft.title', subtitleKey: 'doctor.tracker.status.draft.subtitle',
        color: colors.textTertiary, bg: colors.bgTertiary,
    },
    submitted: {
        Icon: Send, titleKey: 'doctor.tracker.status.submitted.title',
        subtitleKey: 'doctor.tracker.status.submitted.subtitle',
        color: '#2563eb', bg: '#2563eb15',
    },
    documents_review: {
        Icon: Search, titleKey: 'doctor.tracker.status.documents_review.title',
        subtitleKey: 'doctor.tracker.status.documents_review.subtitle',
        color: '#d97706', bg: '#d9770615',
    },
    interview_scheduled: {
        Icon: Calendar, titleKey: 'doctor.tracker.status.interview_scheduled.title',
        subtitleKey: 'doctor.tracker.status.interview_scheduled.subtitle',
        color: '#7c3aed', bg: '#7c3aed15',
    },
    interview_completed: {
        Icon: CheckCircle, titleKey: 'doctor.tracker.status.interview_completed.title',
        subtitleKey: 'doctor.tracker.status.interview_completed.subtitle',
        color: '#0891b2', bg: '#0891b215',
    },
    approved: {
        Icon: PartyPopper, titleKey: 'doctor.tracker.status.approved.title',
        subtitleKey: 'doctor.tracker.status.approved.subtitle',
        color: colors.success, bg: `${colors.success}15`,
    },
    rejected: {
        Icon: XCircle, titleKey: 'doctor.tracker.status.rejected.title',
        subtitleKey: 'doctor.tracker.status.rejected.subtitle',
        color: '#dc2626', bg: '#dc262615',
    },
    resubmission_requested: {
        Icon: Refresh, titleKey: 'doctor.tracker.status.resubmission_requested.title',
        subtitleKey: 'doctor.tracker.status.resubmission_requested.subtitle',
        color: '#ea580c', bg: '#ea580c15',
    },
};

const PIPELINE_STEPS = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'documents_review', label: 'Documents Review' },
    { key: 'interview', label: 'Interview' },
    { key: 'approved', label: 'Approved' },
];

function getStepIndex(status: string): number {
    switch (status) {
        case 'submitted': return 0;
        case 'documents_review': return 1;
        case 'interview_scheduled':
        case 'interview_completed': return 2;
        case 'approved': return 3;
        default: return -1;
    }
}

export function ApplicationTrackerPage() {
    const navigate = useNavigate();
    const { t, isRTL, locale } = useI18n();
    const { session, clear, doctor } = useAuthStore();
    const [application, setApplication] = useState<DoctorApplication | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadApplication();
    }, []);

    async function loadApplication() {
        if (!session?.user) return;
        setLoading(true);
        const app = await getMyApplicationWithDocs(session.user.id);
        setApplication(app);
        setLoading(false);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        clear();
        navigate('/auth/landing', { replace: true });
    }

    async function handleRefresh() {
        await loadApplication();
        await useAuthStore.getState().initialize();
        const doc = useAuthStore.getState().doctor;
        if (doc && doc.status === 'active') {
            navigate('/tabs', { replace: true });
        }
    }

    function handleEnterApp() {
        navigate('/tabs', { replace: true });
    }

    function handleEditResubmit() {
        navigate('/auth/register', { replace: true });
    }

    if (loading) {
        return <BrandSpinner message={t('doctor.tracker.loading')} />;
    }

    if (!application) {
        return (
            <div style={{ ...s.container, textAlign: isRTL ? 'right' : 'left' }}>
                <div style={s.content}>
                    <ClipboardList size={48} color={colors.accentTeal} style={{ display: 'block', marginBottom: spacing.xl }} />
                    <span style={s.title}>{t('doctor.tracker.noAppTitle')}</span>
                    <p style={s.subtitle}>{t('doctor.tracker.noAppDesc')}</p>
                    <button style={s.primaryBtn} onClick={() => navigate('/auth/register', { replace: true })}>
                        <ClipboardList size={14} color={colors.bgPrimary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 6 }} /> {t('doctor.tracker.startApp')}
                    </button>
                    <button style={s.secondaryBtn} onClick={handleLogout}>
                        {isRTL ? 'تسجيل الخروج ←' : '← Sign Out'}
                    </button>
                </div>
            </div>
        );
    }

    const config = STATUS_CONFIG_RAW[application.status] || STATUS_CONFIG_RAW.submitted;
    const stepIndex = getStepIndex(application.status);

    const PIPELINE_STEPS = [
        { key: 'submitted', label: t('doctor.tracker.pipeline.submitted') },
        { key: 'documents_review', label: t('doctor.tracker.pipeline.documents_review') },
        { key: 'interview', label: t('doctor.tracker.pipeline.interview') },
        { key: 'approved', label: t('doctor.tracker.pipeline.approved') },
    ];

    return (
        <div style={s.container}>
            <div style={s.scroll}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: colors.accentTeal }}>cliniq.one</span>
                </div>

                {/* Status Hero */}
                <div style={{ ...s.heroCard, backgroundColor: config.bg, borderColor: `${config.color}30`, textAlign: isRTL ? 'right' : 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: spacing.md }}>
                        <config.Icon size={48} color={config.color} />
                    </div>
                    <h1 style={{ ...s.heroTitle, color: config.color }}>{t(config.titleKey)}</h1>
                    <p style={s.heroSubtitle}>{t(config.subtitleKey)}</p>
                </div>

                {/* Pipeline Progress (not shown for rejected/resubmission) */}
                {application.status !== 'rejected' && application.status !== 'resubmission_requested' && (
                    <div style={s.pipelineCard}>
                        <div style={{ ...s.pipelineRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            {PIPELINE_STEPS.map((step, i) => {
                                const isDone = i < stepIndex || application.status === 'approved';
                                const isCurrent = i === stepIndex && application.status !== 'approved';
                                return (
                                    <div key={step.key} style={s.pipelineStep}>
                                        <div style={{
                                            ...s.pipelineDot,
                                            ...(isDone ? { backgroundColor: colors.success, borderColor: colors.success, color: '#fff' } : {}),
                                            ...(isCurrent ? { backgroundColor: colors.accentTeal, borderColor: colors.accentTeal, color: colors.bgPrimary, boxShadow: `0 0 12px ${colors.accentTeal}40` } : {}),
                                        }}>
                                            {isDone ? '✓' : i + 1}
                                        </div>
                                        <span style={{
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: isDone || isCurrent ? colors.textPrimary : colors.textTertiary,
                                            marginTop: 4,
                                            textAlign: 'center',
                                        }}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Interview Card */}
                {(application.status === 'interview_scheduled' || application.status === 'interview_completed') && (
                    <div style={{ ...s.interviewCard, textAlign: isRTL ? 'right' : 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: spacing.md, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <Calendar size={20} color={colors.textPrimary} />
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>
                                {t('doctor.tracker.interview.title')}
                            </h3>
                        </div>

                        {application.interview_scheduled_at && (
                            <div style={{ ...s.interviewRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                <span style={s.interviewLabel}><Calendar size={12} color={colors.textSecondary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 4 }} /> {t('doctor.tracker.interview.dateTime')}</span>
                                <span style={s.interviewValue}>
                                    {new Date(application.interview_scheduled_at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        )}

                        {application.interview_type && (
                            <div style={{ ...s.interviewRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                <span style={s.interviewLabel}>
                                    {application.interview_type === 'video_call' ? <Camera size={12} color={colors.textSecondary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 4 }} /> : <Smartphone size={12} color={colors.textSecondary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 4 }} />} {t('doctor.tracker.interview.type')}
                                </span>
                                <span style={s.interviewValue}>
                                    {application.interview_type === 'video_call' ? t('doctor.tracker.interview.video') : t('doctor.tracker.interview.phone')}
                                </span>
                            </div>
                        )}

                        {application.interview_meeting_url && (
                            <a
                                href={application.interview_meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={s.meetingLink}
                            >
                                <Share size={14} color="#fff" style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 6 }} /> {t('doctor.tracker.interview.joinVideo')}
                            </a>
                        )}

                        {application.interview_phone_number && (
                            <div style={{ ...s.interviewRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                <span style={s.interviewLabel}><Smartphone size={12} color={colors.textSecondary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 4 }} /> {t('doctor.tracker.interview.callNumber')}</span>
                                <span style={s.interviewValue}>{application.interview_phone_number}</span>
                            </div>
                        )}

                        {application.interview_notes && (
                            <div style={{ ...s.interviewRow, flexDirection: 'column', alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                                <span style={s.interviewLabel}><Edit size={12} color={colors.textSecondary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 4 }} /> {t('doctor.tracker.interview.notes')}</span>
                                <span style={{ ...s.interviewValue, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>{application.interview_notes}</span>
                            </div>
                        )}

                        {application.status === 'interview_completed' && (
                            <div style={{ marginTop: spacing.md, padding: spacing.sm, backgroundColor: `${colors.success}10`, borderRadius: radius.md }}>
                                <span style={{ fontSize: 12, color: colors.success, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    <CheckCircle size={12} color={colors.success} /> {t('doctor.tracker.interview.completedMsg')}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Rejection Reason */}
                {application.status === 'rejected' && application.rejection_reason && (
                    <div style={{ ...s.rejectionCard, textAlign: isRTL ? 'right' : 'left' }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>
                            {t('doctor.tracker.reason')}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary, lineHeight: '20px' }}>
                            {application.rejection_reason}
                        </p>
                    </div>
                )}

                {/* Resubmission Feedback */}
                {application.status === 'resubmission_requested' && application.resubmission_feedback && (
                    <div style={{ ...s.resubmitCard, textAlign: isRTL ? 'right' : 'left' }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#ea580c', marginBottom: 8 }}>
                            {t('doctor.tracker.adminFeedback')}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary, lineHeight: '20px' }}>
                            {application.resubmission_feedback}
                        </p>
                        <button style={{ ...s.primaryBtn, marginTop: spacing.md }} onClick={handleEditResubmit}>
                            <Edit size={14} color={colors.bgPrimary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 6 }} /> {t('doctor.tracker.editResubmit')}
                        </button>
                    </div>
                )}

                {/* Approved CTA */}
                {application.status === 'approved' && doctor?.status === 'active' && (
                    <button style={s.primaryBtn} onClick={handleEnterApp}>
                        <Send size={14} color={colors.bgPrimary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 6 }} /> {t('doctor.tracker.enterApp')}
                    </button>
                )}

                {/* Actions */}
                <div style={{ marginTop: spacing.xl, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    {application.status !== 'approved' && (
                        <button style={s.refreshBtn} onClick={handleRefresh}>
                            <Refresh size={14} color={colors.accentTeal} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 6 }} /> {t('doctor.registration.checkStatus')}
                        </button>
                    )}
                    <button style={s.secondaryBtn} onClick={handleLogout}>
                        {isRTL ? 'تسجيل الخروج ←' : '← Sign Out'}
                    </button>
                </div>

                {/* Submitted date */}
                {application.submitted_at && (
                    <p style={{ textAlign: 'center', fontSize: 11, color: colors.textTertiary, marginTop: spacing.xl }}>
                        {t('doctor.tracker.submittedAt', { date: new Date(application.submitted_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                            month: 'long', day: 'numeric', year: 'numeric',
                        }) })}
                    </p>
                )}
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bgPrimary },
    content: { display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', paddingInline: spacing.xl },
    scroll: { flex: 1, overflowY: 'auto', padding: spacing.lg, paddingBottom: 40 },
    title: { display: 'block', fontSize: 22, fontWeight: 700, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: '20px', marginBottom: spacing.xl },
    heroCard: {
        borderRadius: radius.xl, padding: spacing.xl, border: '1px solid', marginBottom: spacing.lg,
    },
    heroTitle: {
        fontSize: 22, fontWeight: 700, textAlign: 'center', margin: 0, marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 13, color: colors.textSecondary, textAlign: 'center', margin: 0, lineHeight: '20px',
    },
    pipelineCard: {
        backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg,
    },
    pipelineRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    },
    pipelineStep: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
    },
    pipelineDot: {
        width: 32, height: 32, borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
        backgroundColor: colors.bgTertiary, color: colors.textTertiary, border: `2px solid ${colors.border}`,
    },
    interviewCard: {
        backgroundColor: '#7c3aed10', border: '1px solid #7c3aed30', borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg,
    },
    interviewRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: `${spacing.sm}px 0`, borderBottom: `1px solid ${colors.border}40`,
    },
    interviewLabel: {
        fontSize: 12, fontWeight: 600, color: colors.textSecondary,
    },
    interviewValue: {
        fontSize: 13, fontWeight: 600, color: colors.textPrimary,
    },
    meetingLink: {
        display: 'block', textAlign: 'center', padding: spacing.md,
        backgroundColor: '#7c3aed', color: '#fff', borderRadius: radius.md,
        fontWeight: 700, fontSize: 14, textDecoration: 'none',
        marginTop: spacing.md,
    },
    rejectionCard: {
        backgroundColor: '#dc262610', border: '1px solid #dc262630', borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg,
    },
    resubmitCard: {
        backgroundColor: '#ea580c10', border: '1px solid #ea580c30', borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg,
    },
    primaryBtn: {
        width: '100%', padding: '16px 24px', borderRadius: radius.md,
        border: 'none', backgroundColor: colors.accentTeal, color: colors.bgPrimary,
        fontSize: 15, fontWeight: 700, cursor: 'pointer',
    },
    refreshBtn: {
        width: '100%', padding: '14px 24px', borderRadius: radius.md,
        border: `1px solid ${colors.accentTeal}`, backgroundColor: `${colors.accentTeal}10`,
        color: colors.accentTeal, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    },
    secondaryBtn: {
        width: '100%', padding: '14px 24px', borderRadius: radius.md,
        border: 'none', backgroundColor: 'transparent',
        color: colors.textTertiary, fontSize: 14, cursor: 'pointer',
    },
};
