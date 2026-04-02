import { useNavigate } from 'react-router-dom';
import { colors, typography, spacing, radius, Clock, Refresh } from '@cliniqone/ui';
import { supabase } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import type { CSSProperties } from 'react';

function StepItem({ num, text, done }: { num: string; text: string; done?: boolean }) {
    return (
        <div style={s.stepRow}>
            <div style={{ ...s.stepNum, ...(done ? s.stepNumDone : {}) }}>
                <span style={{ ...s.stepNumText, ...(done ? { color: '#fff', fontWeight: 700 } : {}) }}>{done ? '✓' : num}</span>
            </div>
            <span style={{ ...s.stepText, ...(done ? { color: colors.textSecondary, textDecoration: 'line-through' } : {}) }}>{text}</span>
        </div>
    );
}

export function PendingApprovalPage() {
    const navigate = useNavigate();
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
            <div style={s.content}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: spacing.xl }}><Clock size={56} color={colors.warning} /></div>
                <span style={s.title}>Application Under Review</span>
                <p style={s.description}>Your doctor account has been created successfully. An administrator will review and approve your registration.</p>

                <div style={s.statusCard}>
                    <div style={s.statusRow}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Status</span>
                        <span style={s.statusBadge}>Pending Review</span>
                    </div>
                    <span style={{ fontSize: 12, color: colors.textSecondary, lineHeight: '18px' }}>
                        You'll be notified once your account is approved. This usually takes 1-2 business days.
                    </span>
                </div>

                <div style={s.stepsCard}>
                    <span style={{ fontSize: typography.h4.fontSize, fontWeight: 600, color: colors.textPrimary, display: 'block', marginBottom: spacing.md }}>What Happens Next?</span>
                    {doctor?.doctor_type === 'locum' ? (
                        <>
                            <StepItem num="1" text="Submit credentials & documents" done={doctor.onboarding_status !== 'documents_pending'} />
                            <StepItem num="2" text="Admin reviews your application" done={doctor.onboarding_status === 'approved'} />
                            <StepItem num="3" text="Complete sandbox training" done={!doctor.sandbox_mode && doctor.onboarding_status === 'approved'} />
                            <StepItem num="4" text="Start accepting locum consultations" />
                        </>
                    ) : (
                        <>
                            <StepItem num="1" text="Admin reviews your credentials" done />
                            <StepItem num="2" text="Account gets approved" />
                            <StepItem num="3" text="You can start accepting consultations" />
                        </>
                    )}
                </div>

                <button style={s.refreshButton} onClick={handleRefresh}>
                    <span style={{ fontSize: 14, color: colors.accentTeal, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Refresh size={14} color={colors.accentTeal} /> Check Status</span>
                </button>
                <button style={s.logoutButton} onClick={handleLogout}>
                    <span style={{ fontSize: 14, color: colors.textTertiary }}>← Sign Out</span>
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
