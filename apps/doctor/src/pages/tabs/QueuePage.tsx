import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../hooks/useHaptics';
import { colors, typography, ClipboardList, PartyPopper, Siren, Bot, Gem, CheckCircle, Clock } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { usePendingQueue, useClaimConsultation, useDoctorConsultations } from '../../hooks/useDoctorData';
import { BrandSpinner } from '../../components/BrandSpinner';
import { PullToRefresh } from '../../components/PullToRefresh';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';
import { useI18n } from '@cliniqone/i18n';
import type { CSSProperties } from 'react';

export function QueuePage() {
    const navigate = useNavigate();
    const { doctor } = useAuthStore();
    const { t, isRTL } = useI18n();

    const sortOptions = [
        { label: t('doctor.sortBy.priority'), value: 'priority' },
        { label: t('doctor.sortBy.time'), value: 'time' },
        { label: t('doctor.sortBy.specialty'), value: 'specialty' }
    ];
    const filterOptions = [
        { label: t('doctor.filters.all'), value: 'all' },
        { label: t('doctor.filters.urgent'), value: 'urgent' },
        { label: t('doctor.filters.dermatology'), value: 'dermatology' },
        { label: t('doctor.filters.familyMedicine'), value: 'family_medicine' }
    ];

    const [activeSort, setActiveSort] = useState('priority');
    const [activeFilter, setActiveFilter] = useState('all');

    const { data: rawPending, isLoading: pendingLoading, refetch: refetchPending } = usePendingQueue(doctor?.specialty || '');
    const { data: rawMy, isLoading: myLoading, refetch: refetchMy } = useDoctorConsultations(doctor?.id || '', undefined);
    const claimMutation = useClaimConsultation();

    const myActiveItems = (rawMy || []).filter((c: any) => ['assigned', 'in_progress'].includes(c.status));
    const consultations = [...myActiveItems, ...(rawPending || [])];
    const isLoading = pendingLoading || myLoading;

    const filtered = consultations.filter((c: any) => {
        if (activeFilter === 'urgent') return c.priority === 'urgent';
        if (activeFilter === 'dermatology') return c.specialty === 'dermatology';
        if (activeFilter === 'family_medicine') return c.specialty === 'family_medicine';
        return true;
    });

    const sorted = [...filtered].sort((a: any, b: any) => {
        if (activeSort === 'priority') {
            const order: Record<string, number> = { urgent: 0, high: 1, routine: 2 };
            return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
        }
        if (activeSort === 'time') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return 0;
    });

    const [showClaimDialog, setShowClaimDialog] = useState(false);
    const [claimTargetId, setClaimTargetId] = useState<string | null>(null);
    const toast = useToast((s) => s.show);

    const handleClaim = (consultationId: string) => {
        if (!doctor?.id) return;
        setClaimTargetId(consultationId);
        setShowClaimDialog(true);
    };

    const confirmClaim = () => {
        if (!claimTargetId || !doctor?.id) return;
        setShowClaimDialog(false);
        claimMutation.mutate(
            { consultationId: claimTargetId, doctorId: doctor.id },
            {
                onSuccess: () => toast(t('doctor.assigned'), 'success'),
                onError: (err) => toast(err.message || t('common.error'), 'error'),
            },
        );
    };

    const onRefresh = useCallback(async () => {
        await Promise.all([refetchPending(), refetchMy()]);
    }, [refetchPending, refetchMy]);

    const getWaitTime = (createdAt: string) => {
        const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
        if (mins < 60) return t('doctor.timeMins', { mins });
        return t('doctor.timeHoursMins', { hours: Math.floor(mins / 60), mins: mins % 60 });
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
        <div style={s.container}>
            <div style={{ ...s.headerBar, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <span style={s.title}><ClipboardList size={20} color={colors.textPrimary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 6 }} /> {t('doctor.consultationQueue')}</span>
                <span style={s.badge}>{t('doctor.casesCount', { count: sorted.length })}</span>
            </div>

            {/* Sort Chips */}
            <div style={{ ...s.chipRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                {sortOptions.map((opt) => (
                    <button key={opt.value} style={{ ...s.chip, ...(activeSort === opt.value ? s.chipActive : {}) }} className="pressable" onClick={() => { haptic.select(); setActiveSort(opt.value); }}>
                        <span style={{ fontSize: 11, color: activeSort === opt.value ? colors.textPrimary : colors.textTertiary, fontWeight: activeSort === opt.value ? 600 : 400 }}>{opt.label}</span>
                    </button>
                ))}
            </div>

            {/* Filter Chips */}
            <div style={{ ...s.chipRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                {filterOptions.map((opt) => (
                    <button key={opt.value} style={{ ...s.chip, ...(activeFilter === opt.value ? s.chipActiveFilter : {}) }} className="pressable" onClick={() => { haptic.select(); setActiveFilter(opt.value); }}>
                        <span style={{ fontSize: 11, color: activeFilter === opt.value ? colors.textPrimary : colors.textTertiary, fontWeight: activeFilter === opt.value ? 600 : 400 }}>{opt.label}</span>
                    </button>
                ))}
            </div>

            {/* Queue List */}
            <div style={s.list} className="scrollable">
                <div style={s.listContent}>
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                            <BrandSpinner fullScreen={false} />
                        </div>
                    ) : sorted.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
                            <PartyPopper size={48} color={colors.accentTeal} />
                            <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary }}>{t('doctor.allCaughtUp')}</span>
                            <span style={{ fontSize: 14, color: colors.textTertiary, marginTop: 4, textAlign: 'center' }}>{t('doctor.noMatches')}</span>
                        </div>
                    ) : (
                        sorted.map((item: any) => (
                            <button
                                key={item.id}
                                style={{ ...s.card, textAlign: isRTL ? 'right' : 'left' }}
                                className="pressable"
                                onClick={() => {
                                    haptic.medium();
                                    if (item.doctor_id === doctor?.id) navigate(`/consultation/${item.id}`);
                                    else handleClaim(item.id);
                                }}
                            >
                                <div style={{ ...s.cardHeader, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    <span style={{ ...s.priorityBadge, backgroundColor: item.priority === 'urgent' ? colors.errorFaded : colors.successFaded, color: item.priority === 'urgent' ? colors.error : colors.success }}>
                                        {item.priority === 'urgent' ? <><Siren size={11} /> {t('doctor.urgent')}</> : t('doctor.routine')}
                                    </span>
                                    {item.doctor_id === doctor?.id ? (
                                        <span style={{ color: colors.accentTeal, fontSize: 11, fontWeight: 700, backgroundColor: colors.accentTealFaded, paddingInline: 8, paddingBlock: 3, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircle size={11} /> {t('doctor.assigned')}</span>
                                    ) : (
                                        <span style={{ fontSize: 11, color: colors.textTertiary, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {getWaitTime(item.created_at)}</span>
                                    )}
                                </div>
                                <span style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4, display: 'block' }}>{item.patient?.nickname || t('doctor.patient')} · {item.patient?.gender?.[0]?.toUpperCase() || '?'}</span>
                                <span style={{ fontSize: 14, color: colors.textPrimary, marginBottom: 10, display: 'block', fontWeight: 500 }}>{item.chief_complaint || t('intake.consultation')}</span>
                                {item.ai_summary && (
                                    <div style={{ ...s.aiBox, textAlign: isRTL ? 'right' : 'left' }}>
                                        <span style={{ fontSize: 11, color: colors.accentTeal, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexDirection: isRTL ? 'row-reverse' : 'row' }}><Bot size={12} color={colors.accentTeal} /> {t('doctor.aiAssessment')}</span>
                                        <span style={{ fontSize: 11, color: colors.textSecondary }}>
                                            {typeof item.ai_summary === 'object' ? item.ai_summary.summary || JSON.stringify(item.ai_summary).slice(0, 100) : String(item.ai_summary).slice(0, 100)}
                                        </span>
                                    </div>
                                )}
                                <div style={{ ...s.cardFooter, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    <span style={{ fontSize: 11, color: colors.accentTeal }}>{item.specialty}</span>
                                    <span style={{ fontSize: 11, color: colors.gold, [isRTL ? 'marginRight' : 'marginLeft']: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Gem size={11} color={colors.gold} /> {item.token_cost || 3}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>

        <ConfirmDialog
            visible={showClaimDialog}
            title={t('doctor.acceptConsultation')}
            message={t('doctor.claimMsg')}
            confirmLabel={t('doctor.accept')}
            cancelLabel={t('common.cancel')}
            onConfirm={confirmClaim}
            onCancel={() => setShowClaimDialog(false)}
        />
        </PullToRefresh>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    headerBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 20, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary },
    badge: { fontSize: 11, color: colors.accentTeal, backgroundColor: colors.accentTealFaded, paddingInline: 10, paddingBlock: 4, borderRadius: 10 },
    chipRow: { display: 'flex', gap: 8, paddingInline: 20, paddingBlock: 4, flexWrap: 'nowrap', overflowX: 'auto' },
    chip: { backgroundColor: colors.bgSecondary, paddingInline: 14, paddingBlock: 8, borderRadius: 20, border: `1px solid ${colors.border}`, whiteSpace: 'nowrap' as any },
    chipActive: { backgroundColor: colors.accentTealFaded, borderColor: colors.accentTeal },
    chipActiveFilter: { backgroundColor: colors.purpleFaded, borderColor: colors.purple },
    list: { flex: 1 },
    listContent: { padding: 20, paddingTop: 8, paddingBottom: 40 },
    card: { display: 'block', width: '100%', backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${colors.border}`, textAlign: 'left' as any },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    priorityBadge: { paddingInline: 10, paddingBlock: 4, borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 },
    aiBox: { backgroundColor: colors.bgTertiary, borderRadius: 10, padding: 10, marginBottom: 10 },
    cardFooter: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
};
