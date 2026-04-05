import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { t, getLocale, setLocale, toLocalNum, localDate, useLocale } from '@cliniqone/i18n';
import { TokenPurchaseModal } from '../../components/TokenPurchaseModal';
import { useConsultations } from '../../hooks/useConsultations';
import { useHomeContent } from '../../hooks/useHomeContent';
import { BrandSpinner } from '../../components/BrandSpinner';
import { PullToRefresh } from '../../components/PullToRefresh';
import { FadeIn } from '../../components/FadeIn';
import { haptic } from '../../hooks/useHaptics';
import { Stethoscope, ClipboardList, TestTube, Coins, Info, Search, Refresh, ChevronRight } from '@cliniqone/ui';
import type { ConsultationStatus } from '@cliniqone/types';

const STATUS_COLORS: Record<string, string> = {
    draft: '#64748B', intake_in_progress: '#1A8A9E', pending_payment: '#D97706',
    submitted: '#3B82F6', assigned: '#0F766E', in_progress: '#3B82F6',
    inquiry_sent: '#D97706', report_ready: '#8B5CF6', completed: '#059669', cancelled: '#DC2626',
};

const ACTIVE_STATUSES: ConsultationStatus[] = ['submitted', 'assigned', 'in_progress', 'inquiry_sent'];

const STATUS_LABEL_KEYS: Record<string, string> = {
    draft: 'consultations.statusDraft', intake_in_progress: 'consultations.statusAiIntake',
    pending_payment: 'consultations.statusPendingPayment', submitted: 'consultations.statusSubmitted',
    assigned: 'consultations.statusDoctorAssigned', in_progress: 'consultations.statusInProgress',
    inquiry_sent: 'consultations.statusInquirySent', report_ready: 'consultations.statusReportReady',
    completed: 'consultations.statusCompleted', cancelled: 'consultations.statusCancelled',
};

const QUICK_ACTIONS = [
    { IconComp: Stethoscope, labelKey: 'dashboard.newConsultation', route: '/intake' },
    { IconComp: ClipboardList, labelKey: 'dashboard.viewHistory', route: '/consultations' },
    { IconComp: TestTube, labelKey: 'dashboard.myTests', route: '/interventions' },
    { IconComp: Coins, labelKey: 'dashboard.buyTokensAction', action: 'purchase' },
    { IconComp: Info, labelKey: 'dashboard.helpAction', route: '/settings/help' },
];

export default function HomePage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const name = user?.nickname || 'there';
    const [showPurchase, setShowPurchase] = useState(false);
    const lang = useLocale();

    const { tips, responseTime, responseTimeAr, refresh: refreshHome } = useHomeContent();
    const { data: consultations, isLoading, isError, refetch } = useConsultations(user?.id || '');
    const recentConsultations = (consultations || []).slice(0, 3);
    const activeConsultation = (consultations || []).find((c: any) => ACTIVE_STATUSES.includes(c.status));

    const getStatusLabel = (status: string) => {
        const key = STATUS_LABEL_KEYS[status];
        return key ? t(key) : status;
    };

    const onRefresh = useCallback(async () => {
        haptic.medium();
        await Promise.all([refetch(), refreshHome()]);
        haptic.success();
    }, [refetch, refreshHome]);

    async function toggleLanguage() {
        haptic.select();
        const next = lang === 'en' ? 'ar' : 'en';
        await setLocale(next);
    }

    function handleQuickAction(action: typeof QUICK_ACTIONS[0]) {
        haptic.medium();
        if (action.action === 'purchase') setShowPurchase(true);
        else if (action.route) navigate(action.route);
    }

    if (isLoading && !isError) return <BrandSpinner />;

    return (
        <div style={styles.container}>
            <PullToRefresh onRefresh={onRefresh}>
                <div style={styles.scroll} className="page-fade">
                {/* Greeting */}
                <FadeIn>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('dashboard.greeting', { name })}</h1>
                        <button onClick={toggleLanguage} className="pressable" style={styles.langToggle}>
                            {lang === 'ar' ? '🇬🇧' : '🇸🇦'}
                        </button>
                    </div>
                </FadeIn>

                {/* Active Consultation Banner */}
                {activeConsultation && activeConsultation.status !== 'inquiry_sent' && (
                    <div onClick={() => { haptic.medium(); navigate(`/consultation/${activeConsultation.id}/waiting-room`); }} className="pressable" style={styles.activeBanner}>
                        <div style={styles.activeBannerDot} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('dashboard.activeConsultation')}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{getStatusLabel(activeConsultation.status)}</p>
                        </div>
                        <ChevronRight size={18} color="#1A8A9E" />
                    </div>
                )}

                {/* Inquiry Banner */}
                {activeConsultation && activeConsultation.status === 'inquiry_sent' && (
                    <div onClick={() => { haptic.medium(); navigate(`/intake/inquiry-chat?consultationId=${activeConsultation.id}`); }} className="pressable" style={styles.inquiryBanner}>
                        <Search size={20} color="#2DD4BF" />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('inquiry.bannerTitle')}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{t('inquiry.bannerMessage')}</p>
                        </div>
                        <span style={{ fontSize: 13, color: '#1A8A9E', fontWeight: 600 }}>{t('inquiry.respond')}</span>
                    </div>
                )}

                {/* Token Balance Card */}
                <FadeIn delay={100}>
                    <div style={styles.tokenCard}>
                        <div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t('dashboard.tokenBalance')}</p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                                <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>{toLocalNum(user?.tokens_balance ?? 0)}</span>
                                <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>{t('tokens.tokensLabel')}</span>
                            </div>
                        </div>
                        <button onClick={() => { haptic.medium(); setShowPurchase(true); }} className="pressable" style={styles.buyBtn}>
                            + {t('dashboard.buyTokens')}
                        </button>
                    </div>
                </FadeIn>

                {/* Start Consultation CTA */}
                <FadeIn delay={200}>
                    <div
                        onClick={() => { haptic.medium(); navigate('/intake'); }}
                        className="cta-hero"
                        style={styles.ctaCard}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
                            <div className="cta-hero-icon" style={styles.ctaIconWrap}>
                                <Stethoscope size={30} color="#fff" />
                            </div>
                            <div>
                                <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>{t('dashboard.startConsultation')}</p>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '3px 0 0', fontWeight: 500 }}>{t('dashboard.aiIntakeSubtitle')}</p>
                            </div>
                        </div>
                        <div className="cta-hero-arrow" style={{ position: 'relative', zIndex: 1 }}>
                            <ChevronRight size={18} color="#fff" />
                        </div>
                    </div>
                </FadeIn>

                {/* Quick Actions */}
                <FadeIn delay={300}>
                    <p style={styles.sectionTitle}>{t('dashboard.quickActions')}</p>
                    <div style={styles.actionsGrid}>
                        {QUICK_ACTIONS.map((action, i) => (
                            <button key={i} onClick={() => handleQuickAction(action)} className="pressable" style={styles.actionCard}>
                                <action.IconComp size={24} color="#2DD4BF" />
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{t(action.labelKey)}</span>
                            </button>
                        ))}
                    </div>
                </FadeIn>

                {/* Recent Consultations */}
                <FadeIn delay={400}>
                    <p style={styles.sectionTitle}>{t('dashboard.recentConsults')}</p>
                    {recentConsultations.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {recentConsultations.map((c: any) => (
                                <div key={c.id} onClick={() => { haptic.light(); navigate(`/consultation/${c.id}`); }} className="pressable" style={styles.consultCard}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {c.chief_complaint || t('dashboard.consultation')}
                                        </p>
                                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>{localDate(c.created_at)}</p>
                                    </div>
                                    <span style={{
                                        fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                                        backgroundColor: (STATUS_COLORS[c.status] || '#64748B') + '20',
                                        color: STATUS_COLORS[c.status] || '#64748B',
                                    }}>
                                        {getStatusLabel(c.status)}
                                    </span>
                                </div>
                            ))}
                            {(consultations?.length || 0) > 3 && (
                                <button onClick={() => { haptic.light(); navigate('/consultations'); }} style={styles.viewAllButton}>
                                    {t('dashboard.viewAllConsultations')}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={styles.emptyState}>
                            <ClipboardList size={32} color="#2DD4BF" />
                            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: '8px 0 4px' }}>{t('dashboard.noConsults')}</p>
                            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>{t('dashboard.startFirst')}</p>
                        </div>
                    )}
                </FadeIn>

                {/* Health Tips */}
                <p style={{ ...styles.sectionTitle, marginTop: 24 }}>{t('dashboard.healthTips')}</p>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                    {tips.map((tip) => (
                        <div key={tip.id} style={styles.tipCard}>
                            <span style={{ fontSize: 24 }}>{tip.icon}</span>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 4px' }}>
                                {lang === 'ar' ? (tip.title_ar || tip.title_en) : tip.title_en}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: '16px' }}>
                                {lang === 'ar' ? (tip.text_ar || tip.text_en) : tip.text_en}
                            </p>
                        </div>
                    ))}
                </div>
                </div>
            </PullToRefresh>

            <TokenPurchaseModal visible={showPurchase} onClose={() => setShowPurchase(false)} currentBalance={user?.tokens_balance ?? 0} />
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: { minHeight: '100vh', backgroundColor: 'var(--bg-primary)' },
    scroll: { maxWidth: 500, margin: '0 auto', padding: '20px 20px 32px', overflowY: 'auto', height: '100%' },
    langToggle: {
        width: 40, height: 40, borderRadius: 20, border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-card)', fontSize: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    activeBanner: {
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        backgroundColor: '#1A8A9E15', borderRadius: 14, border: '1px solid #1A8A9E40',
        marginBottom: 12,
    },
    activeBannerDot: {
        width: 10, height: 10, borderRadius: 5, backgroundColor: '#1A8A9E',
        boxShadow: '0 0 8px rgba(26,138,158,0.5)',
    },
    inquiryBanner: {
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        backgroundColor: '#D9770615', borderRadius: 14, border: '1px solid #D9770640',
        marginBottom: 12,
    },
    tokenCard: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: '16px 18px', marginBottom: 12,
    },
    buyBtn: {
        padding: '10px 16px', borderRadius: 10, border: 'none',
        backgroundColor: '#1A8A9E', color: '#fff', fontSize: 13,
        fontWeight: 700,
    },
    ctaCard: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderRadius: 18, padding: '20px 20px', cursor: 'pointer',
        marginBottom: 20,
    },
    ctaIconWrap: {
        width: 48, height: 48, borderRadius: 14,
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    sectionTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' },
    actionsGrid: {
        display: 'flex', justifyContent: 'space-between', marginBottom: 20,
    },
    actionCard: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: '12px 6px',
        border: '1px solid var(--border)', width: 64, minHeight: 68,
    },
    consultCard: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: '14px 16px',
        border: '1px solid var(--border)',
    },
    viewAllButton: {
        background: 'none', border: 'none', color: '#1A8A9E', fontSize: 14,
        fontWeight: 600, padding: '10px 0', textAlign: 'center',
    },
    emptyState: {
        textAlign: 'center', padding: '28px 16px', backgroundColor: 'var(--bg-card)',
        borderRadius: 14, border: '1px solid var(--border)',
    },
    tipCard: {
        minWidth: 200, padding: '14px 16px', backgroundColor: 'var(--bg-card)',
        borderRadius: 12, border: '1px solid var(--border)', flexShrink: 0,
    },
};
