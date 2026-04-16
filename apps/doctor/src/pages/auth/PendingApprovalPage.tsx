import { useNavigate } from 'react-router-dom';
import { useI18n } from '@cliniqone/i18n';
import { colors, typography, spacing, radius, Clock, Refresh } from '@cliniqone/ui';
import { supabase } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import type { CSSProperties } from 'react';

function StepItem({ num, text, done, isRTL }: { num: string; text: string; done?: boolean; isRTL?: boolean }) {
    return (
        <div style={{ ...s.stepRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <div style={{ ...s.stepNum, ...(done ? s.stepNumDone : {}) }}>
                <span style={{ ...s.stepNumText, ...(done ? { color: '#fff', fontWeight: 700 } : {}) }}>{done ? '✓' : num}</span>
            </div>
            <span style={{ ...s.stepText, ...(done ? { color: colors.textSecondary, textDecoration: 'line-through' } : {}), textAlign: isRTL ? 'right' : 'left' }}>{text}</span>
        </div>
    );
}

export function PendingApprovalPage() {
    const navigate = useNavigate();
    const { t, isRTL } = useI18n();
    const { doctor, clear } = useAuthStore();

    async function handleLogout() {
        try { await supabase.auth.signOut(); clear(); navigate('/auth/login', { replace: true }); } catch (err) { console.error('Logout error:', err); }
    }

    async function handleRefresh() {
        await useAuthStore.getState().initialize();
        const doc = useAuthStore.getState().doctor;
        if (doc && doc.status === 'active') navigate('/tabs', { replace: true });
    }

    return (
        <div style={s.container}>
            <div style={{ ...s.content, textAlign: isRTL ? 'right' : 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: spacing.xl }}><Clock size={56} color={colors.warning} /></div>
                <span style={s.title}>{t('doctor.registration.pendingHeader')}</span>
                <p style={s.description}>{t('doctor.registration.pendingDesc')}</p>

                <div style={s.statusCard}>
                    <div style={{ ...s.statusRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{t('doctor.registration.status')}</span>
                        <span style={s.statusBadge}>{t('doctor.registration.pendingReview')}</span>
                    </div>
                    <span style={{ fontSize: 12, color: colors.textSecondary, lineHeight: '18px', display: 'block', textAlign: isRTL ? 'right' : 'left' }}>
                        {t('doctor.registration.daysWait')}
                    </span>
                </div>

                <div style={s.stepsCard}>
                    <span style={{ fontSize: typography.h4.fontSize, fontWeight: 600, color: colors.textPrimary, display: 'block', marginBottom: spacing.md, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.nextSteps')}</span>
                    {doctor?.doctor_type === 'locum' ? (
                        <>
                            <StepItem num="1" text={t('doctor.registration.steps.submitDocs')} done={doctor.onboarding_status !== 'documents_pending'} isRTL={isRTL} />
                            <StepItem num="2" text={t('doctor.registration.steps.adminReview')} done={doctor.onboarding_status === 'approved'} isRTL={isRTL} />
                            <StepItem num="3" text={t('doctor.registration.steps.sandbox')} done={!doctor.sandbox_mode && doctor.onboarding_status === 'approved'} isRTL={isRTL} />
                            <StepItem num="4" text={t('doctor.registration.steps.startLocum')} isRTL={isRTL} />
                        </>
                    ) : (
                        <>
                            <StepItem num="1" text={t('doctor.registration.steps.adminReviewsCreds')} done isRTL={isRTL} />
                            <StepItem num="2" text={t('doctor.registration.steps.accountApproved')} isRTL={isRTL} />
                            <StepItem num="3" text={t('doctor.registration.steps.startConsultations')} isRTL={isRTL} />
                        </>
                    )}
                </div>

                <button style={s.refreshButton} onClick={handleRefresh}>
                    <span style={{ fontSize: 14, color: colors.accentTeal, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row' }}><Refresh size={14} color={colors.accentTeal} /> {t('doctor.registration.checkStatus')}</span>
                </button>
                <button style={s.logoutButton} onClick={handleLogout}>
                    <span style={{ fontSize: 14, color: colors.textTertiary }}>{isRTL ? 'تسجيل الخروج ←' : '← Sign Out'}</span>
                </button>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    content: { display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', paddingInline: spacing.xl },
    title: { display: 'block', fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md },
    description: { fontSize: typography.body.fontSize, color: colors.textSecondary, textAlign: 'center', lineHeight: '22px', marginBottom: spacing['2xl'] },
    statusCard: { backgroundColor: colors.warningFaded, border: `1px solid ${colors.warning}`, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl },
    statusRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    statusBadge: { backgroundColor: colors.warning, paddingInline: spacing.md, paddingBlock: spacing.xs, borderRadius: radius.full, fontSize: typography.caption.fontSize, color: '#000', fontWeight: 700 },
    stepsCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, border: `1px solid ${colors.border}`, marginBottom: spacing['2xl'] },
    stepRow: { display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
    stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgTertiary, display: 'flex', justifyContent: 'center', alignItems: 'center', border: `1px solid ${colors.border}`, flexShrink: 0 },
    stepNumDone: { backgroundColor: colors.success, borderColor: colors.success },
    stepNumText: { fontSize: typography.label.fontSize, color: colors.textSecondary },
    stepText: { fontSize: typography.body.fontSize, color: colors.textPrimary, flex: 1 },
    refreshButton: { backgroundColor: colors.accentTealFaded, border: `1px solid ${colors.accentTeal}`, borderRadius: radius.md, paddingBlock: spacing.md, width: '100%', marginBottom: spacing.md },
    logoutButton: { paddingBlock: spacing.md, width: '100%' },
};
