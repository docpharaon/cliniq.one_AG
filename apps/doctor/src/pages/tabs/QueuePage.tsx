import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../hooks/useHaptics';
import { colors, typography, ClipboardList, PartyPopper, Siren, Bot, Gem, CheckCircle, Clock } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { usePendingQueue, useClaimConsultation, useDoctorConsultations } from '../../hooks/useDoctorData';
import type { CSSProperties } from 'react';

const sortOptions = ['By Priority', 'By Time', 'By Specialty'];
const filterOptions = ['All', 'Urgent', 'Dermatology', 'Family Medicine'];

export function QueuePage() {
    const navigate = useNavigate();
    const { doctor } = useAuthStore();
    const [activeSort, setActiveSort] = useState('By Priority');
    const [activeFilter, setActiveFilter] = useState('All');

    const { data: rawPending, isLoading: pendingLoading, refetch: refetchPending } = usePendingQueue(doctor?.specialty || '');
    const { data: rawMy, isLoading: myLoading, refetch: refetchMy } = useDoctorConsultations(doctor?.id || '', undefined);
    const claimMutation = useClaimConsultation();

    const myActiveItems = (rawMy || []).filter((c: any) => ['assigned', 'in_progress'].includes(c.status));
    const consultations = [...myActiveItems, ...(rawPending || [])];
    const isLoading = pendingLoading || myLoading;

    const filtered = consultations.filter((c: any) => {
        if (activeFilter === 'Urgent') return c.priority === 'urgent';
        if (activeFilter === 'Dermatology') return c.specialty === 'dermatology';
        if (activeFilter === 'Family Medicine') return c.specialty === 'family_medicine';
        return true;
    });

    const sorted = [...filtered].sort((a: any, b: any) => {
        if (activeSort === 'By Priority') {
            const order: Record<string, number> = { urgent: 0, high: 1, routine: 2 };
            return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
        }
        if (activeSort === 'By Time') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return 0;
    });

    const handleClaim = (consultationId: string) => {
        if (!doctor?.id) return;
        if (!confirm('Accept this consultation?')) return;
        claimMutation.mutate(
            { consultationId, doctorId: doctor.id },
            {
                onSuccess: () => alert('Consultation assigned to you.'),
                onError: (err) => alert(err.message || 'Failed to claim'),
            },
        );
    };

    const getWaitTime = (createdAt: string) => {
        const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
        if (mins < 60) return `${mins} min`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    return (
        <div style={s.container}>
            <div style={s.headerBar}>
                <span style={s.title}><ClipboardList size={20} color={colors.textPrimary} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Consultation Queue</span>
                <span style={s.badge}>{sorted.length} cases</span>
            </div>

            {/* Sort Chips */}
            <div style={s.chipRow}>
                {sortOptions.map((opt) => (
                    <button key={opt} style={{ ...s.chip, ...(activeSort === opt ? s.chipActive : {}) }} className="pressable" onClick={() => { haptic.select(); setActiveSort(opt); }}>
                        <span style={{ fontSize: 11, color: activeSort === opt ? colors.textPrimary : colors.textTertiary, fontWeight: activeSort === opt ? 600 : 400 }}>{opt}</span>
                    </button>
                ))}
            </div>

            {/* Filter Chips */}
            <div style={s.chipRow}>
                {filterOptions.map((opt) => (
                    <button key={opt} style={{ ...s.chip, ...(activeFilter === opt ? s.chipActiveFilter : {}) }} className="pressable" onClick={() => { haptic.select(); setActiveFilter(opt); }}>
                        <span style={{ fontSize: 11, color: activeFilter === opt ? colors.textPrimary : colors.textTertiary, fontWeight: activeFilter === opt ? 600 : 400 }}>{opt}</span>
                    </button>
                ))}
            </div>

            {/* Queue List */}
            <div style={s.list} className="scrollable">
                <div style={s.listContent}>
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                            <div className="spinner" style={{ color: colors.accentTeal }} />
                        </div>
                    ) : sorted.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
                            <PartyPopper size={48} color={colors.accentTeal} />
                            <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary }}>All caught up!</span>
                            <span style={{ fontSize: 14, color: colors.textTertiary, marginTop: 4 }}>No consultations match the current filter.</span>
                        </div>
                    ) : (
                        sorted.map((item: any) => (
                            <button
                                key={item.id}
                                style={s.card}
                                className="pressable"
                                onClick={() => {
                                    haptic.medium();
                                    if (item.doctor_id === doctor?.id) navigate(`/consultation/${item.id}`);
                                    else handleClaim(item.id);
                                }}
                            >
                                <div style={s.cardHeader}>
                                    <span style={{ ...s.priorityBadge, backgroundColor: item.priority === 'urgent' ? colors.errorFaded : colors.successFaded, color: item.priority === 'urgent' ? colors.error : colors.success }}>
                                        {item.priority === 'urgent' ? <><Siren size={11} /> URGENT</> : 'ROUTINE'}
                                    </span>
                                    {item.doctor_id === doctor?.id ? (
                                        <span style={{ color: colors.accentTeal, fontSize: 11, fontWeight: 700, backgroundColor: colors.accentTealFaded, paddingInline: 8, paddingBlock: 3, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircle size={11} /> ASSIGNED</span>
                                    ) : (
                                        <span style={{ fontSize: 11, color: colors.textTertiary, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {getWaitTime(item.created_at)}</span>
                                    )}
                                </div>
                                <span style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4, display: 'block', textAlign: 'left' }}>{item.patient?.nickname || 'Patient'} · {item.patient?.gender?.[0]?.toUpperCase() || '?'}</span>
                                <span style={{ fontSize: 14, color: colors.textPrimary, marginBottom: 10, display: 'block', textAlign: 'left', fontWeight: 500 }}>{item.chief_complaint || 'Consultation'}</span>
                                {item.ai_summary && (
                                    <div style={s.aiBox}>
                                        <span style={{ fontSize: 11, color: colors.accentTeal, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}><Bot size={12} color={colors.accentTeal} /> AI Assessment</span>
                                        <span style={{ fontSize: 11, color: colors.textSecondary }}>
                                            {typeof item.ai_summary === 'object' ? item.ai_summary.summary || JSON.stringify(item.ai_summary).slice(0, 100) : String(item.ai_summary).slice(0, 100)}
                                        </span>
                                    </div>
                                )}
                                <div style={s.cardFooter}>
                                    <span style={{ fontSize: 11, color: colors.accentTeal }}>{item.specialty}</span>
                                    <span style={{ fontSize: 11, color: colors.gold, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Gem size={11} color={colors.gold} /> {item.token_cost || 3}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
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
