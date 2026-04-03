import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, safeFetch } from '@cliniqone/api';
import { t, useLocale, localDate } from '@cliniqone/i18n';
import { useAuthStore } from '../stores/authStore';
import { BackButton } from '../components/BackButton';
import { BrandSpinner } from '../components/BrandSpinner';
import { FadeIn } from '../components/FadeIn';
import { TestTube } from '@cliniqone/ui';
import { haptic } from '../hooks/useHaptics';

type Intervention = {
    id: string;
    consultation_id: string;
    type: string;
    status: string;
    priority: string;
    title: string;
    description: string | null;
    category: string;
    specific_test: string | null;
    instructions_for_patient: string | null;
    scheduled_at: string | null;
    completed_at: string | null;
    estimated_cost_sar: number | null;
    results_summary: string | null;
    created_at: string;
    updated_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    ordered:         { label: 'Ordered',       color: '#3B82F6', bg: '#3B82F620' },
    pending_auth:    { label: 'Pending Auth',  color: '#D97706', bg: '#D9770620' },
    authorized:      { label: 'Authorized',    color: '#0F766E', bg: '#0F766E20' },
    scheduled:       { label: 'Scheduled',     color: '#8B5CF6', bg: '#8B5CF620' },
    in_progress:     { label: 'In Progress',   color: '#3B82F6', bg: '#3B82F620' },
    completed:       { label: 'Completed',     color: '#059669', bg: '#05966920' },
    results_ready:   { label: 'Results Ready', color: '#059669', bg: '#05966920' },
    reviewed:        { label: 'Reviewed',      color: '#64748B', bg: '#64748B20' },
    cancelled:       { label: 'Cancelled',     color: '#DC2626', bg: '#DC262620' },
    patient_accepted:{ label: 'Accepted',      color: '#059669', bg: '#05966920' },
};

const TYPE_EMOJI: Record<string, string> = {
    lab_test: '🧪',
    imaging: '📷',
    referral: '🔄',
    therapy: '💆',
    home_health: '🏠',
    follow_up: '📋',
};

type FilterTab = 'all' | 'active' | 'completed';

export function InterventionsPage() {
    const navigate = useNavigate();
    const lang = useLocale();
    const { user } = useAuthStore();
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterTab>('all');

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            const { data } = await safeFetch(
                () => supabase
                    .from('interventions')
                    .select('*')
                    .eq('patient_id', user.id)
                    .order('created_at', { ascending: false }),
                { timeout: 8000, retries: 1, label: 'fetchAllInterventions' },
            );
            setInterventions((data as Intervention[]) || []);
            setLoading(false);
        })();
    }, [user?.id]);

    const activeStatuses = ['ordered', 'pending_auth', 'authorized', 'scheduled', 'in_progress', 'patient_accepted'];
    const completedStatuses = ['completed', 'results_ready', 'reviewed'];

    const filtered = interventions.filter(iv => {
        if (filter === 'active') return activeStatuses.includes(iv.status);
        if (filter === 'completed') return completedStatuses.includes(iv.status);
        return true;
    });

    const activeCount = interventions.filter(iv => activeStatuses.includes(iv.status)).length;
    const completedCount = interventions.filter(iv => completedStatuses.includes(iv.status)).length;

    function handleViewConsultation(consultationId: string) {
        haptic.medium();
        navigate(`/consultation/${consultationId}`);
    }

    if (loading) return <BrandSpinner />;

    const FILTER_TABS: { key: FilterTab; label: string; count: number }[] = [
        { key: 'all', label: t('common.all') || 'All', count: interventions.length },
        { key: 'active', label: t('common.active') || 'Active', count: activeCount },
        { key: 'completed', label: t('common.completed') || 'Completed', count: completedCount },
    ];

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />

                {/* Header */}
                <FadeIn>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 4px' }}>
                        <div style={s.headerIcon}>
                            <TestTube size={24} color="#2DD4BF" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                {t('interventions.title') || 'My Tests & Procedures'}
                            </h1>
                            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                                {t('interventions.subtitle') || 'All doctor-ordered tests across your consultations'}
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* Summary Cards */}
                {interventions.length > 0 && (
                    <FadeIn delay={100}>
                        <div style={s.summaryRow}>
                            <div style={s.summaryCard}>
                                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{interventions.length}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Total</span>
                            </div>
                            <div style={{ ...s.summaryCard, borderColor: '#3B82F640' }}>
                                <span style={{ fontSize: 24, fontWeight: 800, color: '#3B82F6' }}>{activeCount}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Active</span>
                            </div>
                            <div style={{ ...s.summaryCard, borderColor: '#05966940' }}>
                                <span style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>{completedCount}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Done</span>
                            </div>
                        </div>
                    </FadeIn>
                )}

                {/* Filter Tabs */}
                {interventions.length > 0 && (
                    <FadeIn delay={200}>
                        <div style={s.filterRow}>
                            {FILTER_TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => { haptic.select(); setFilter(tab.key); }}
                                    className="pressable"
                                    style={{
                                        ...s.filterBtn,
                                        ...(filter === tab.key ? s.filterBtnActive : {}),
                                    }}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span style={{
                                            ...s.filterCount,
                                            backgroundColor: filter === tab.key ? '#fff' : 'var(--border)',
                                            color: filter === tab.key ? '#1A8A9E' : 'var(--text-tertiary)',
                                        }}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </FadeIn>
                )}

                {/* Intervention List */}
                {filtered.length === 0 ? (
                    <FadeIn delay={300}>
                        <div style={s.emptyState}>
                            <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🧪</span>
                            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px' }}>
                                {interventions.length === 0
                                    ? (t('interventions.noTests') || 'No tests or procedures yet')
                                    : (t('interventions.noneInCategory') || 'No tests in this category')
                                }
                            </p>
                            {interventions.length === 0 && (
                                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
                                    {t('interventions.noTestsHint') || 'When your doctor orders tests, they\'ll appear here.'}
                                </p>
                            )}
                        </div>
                    </FadeIn>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                        {filtered.map((iv, i) => {
                            const statusCfg = STATUS_CONFIG[iv.status] || { label: iv.status, color: '#64748B', bg: '#64748B20' };
                            const emoji = TYPE_EMOJI[iv.type] || '📋';

                            return (
                                <FadeIn key={iv.id} delay={300 + i * 60}>
                                    <div
                                        onClick={() => handleViewConsultation(iv.consultation_id)}
                                        className="pressable"
                                        style={s.card}
                                    >
                                        {/* Top row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                                                <span style={{ fontSize: 24 }}>{emoji}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {iv.title}
                                                    </p>
                                                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                                                        {iv.category}{iv.specific_test ? ` · ${iv.specific_test}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: 11, fontWeight: 600, padding: '4px 10px',
                                                borderRadius: 8, backgroundColor: statusCfg.bg, color: statusCfg.color,
                                                whiteSpace: 'nowrap', flexShrink: 0,
                                            }}>
                                                {statusCfg.label}
                                            </span>
                                        </div>

                                        {/* Instructions */}
                                        {iv.instructions_for_patient && (
                                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 0', lineHeight: '18px' }}>
                                                💡 {iv.instructions_for_patient}
                                            </p>
                                        )}

                                        {/* Results summary */}
                                        {iv.results_summary && (
                                            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, backgroundColor: '#05966910', border: '1px solid #05966920' }}>
                                                <p style={{ fontSize: 12, fontWeight: 600, color: '#059669', margin: '0 0 2px' }}>📊 Results</p>
                                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: '16px' }}>{iv.results_summary}</p>
                                            </div>
                                        )}

                                        {/* Footer meta */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {iv.priority !== 'routine' && (
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 700, padding: '2px 8px',
                                                        borderRadius: 6, textTransform: 'uppercase',
                                                        backgroundColor: iv.priority === 'stat' ? '#DC262620' : '#D9770620',
                                                        color: iv.priority === 'stat' ? '#DC2626' : '#D97706',
                                                    }}>
                                                        {iv.priority}
                                                    </span>
                                                )}
                                                {iv.estimated_cost_sar && (
                                                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                                        ~{iv.estimated_cost_sar} ر.س
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                                {localDate(iv.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </FadeIn>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    headerIcon: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: '#1A8A9E15',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    summaryRow: {
        display: 'flex', gap: 10, marginTop: 16,
    },
    summaryCard: {
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '12px 8px', borderRadius: 12,
        backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
    },
    filterRow: {
        display: 'flex', gap: 8, marginTop: 16,
    },
    filterBtn: {
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
    },
    filterBtnActive: {
        backgroundColor: '#1A8A9E', color: '#fff', borderColor: '#1A8A9E',
    },
    filterCount: {
        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 6, minWidth: 18, textAlign: 'center',
    },
    emptyState: {
        textAlign: 'center', padding: '40px 16px', marginTop: 20,
        backgroundColor: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)',
    },
    card: {
        backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 16,
        border: '1px solid var(--border)', cursor: 'pointer',
    },
};
