'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import StatusBadge, { PriorityBadge } from '@/components/StatusBadge';
import {
    ClipboardList, AlertTriangle, Timer, Clock,
    Eye, Loader2, Search, ChevronLeft, ChevronRight, Zap,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { fetchQueueConsultations, claimConsultationAction } from '@/lib/actions';
import { createBrowserSupabase } from '@/lib/supabase';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import Link from 'next/link';

const STATUS_TABS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'mine', label: 'My Cases' },
] as const;

const PRIORITY_TABS = [
    { key: 'all', label: 'All' },
    { key: 'urgent', label: '🔴 Urgent' },
    { key: 'high', label: '🟡 High' },
    { key: 'routine', label: '🟢 Routine' },
] as const;

type QueueRow = {
    id: string;
    status: string;
    priority: 'routine' | 'high' | 'urgent';
    chief_complaint: string;
    token_cost: number;
    urgent_fee: number;
    created_at: string;
    doctor_id: string | null;
    patient: {
        nickname: string;
        gender: string;
        year_of_birth: number;
    };
};

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
    submitted: { label: 'Pending', variant: 'warning' },
    assigned: { label: 'Assigned', variant: 'info' },
    in_progress: { label: 'In Progress', variant: 'info' },
    inquiry_sent: { label: 'Inquiry Sent', variant: 'warning' },
    report_ready: { label: 'Report Ready', variant: 'success' },
    completed: { label: 'Completed', variant: 'success' },
};

export default function QueuePage() {
    const [consultations, setConsultations] = useState<QueueRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [doctorId, setDoctorId] = useState('');
    const [specialty, setSpecialty] = useState('');

    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [claiming, setClaiming] = useState<string | null>(null);
    const { can } = useFeatureGate();
    const canClaim = can('claim_cases');
    const perPage = 25;

    useEffect(() => {
        async function init() {
            const supabase = createBrowserSupabase();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: doctor } = await supabase
                .from('doctors')
                .select('id, specialty')
                .eq('user_id', user.id)
                .single();

            if (doctor) {
                setDoctorId(doctor.id);
                setSpecialty(doctor.specialty);
            }
        }
        init();
    }, []);

    const loadData = useCallback(async () => {
        if (!doctorId) return;
        setLoading(true);
        try {
            const result = await fetchQueueConsultations(
                doctorId,
                specialty,
                page,
                perPage,
                statusFilter !== 'all' ? statusFilter : undefined,
                priorityFilter !== 'all' ? priorityFilter : undefined,
            );
            setConsultations(result.data as QueueRow[]);
            setTotalCount(result.count);
        } catch (err) {
            console.error('Load queue error:', err);
        }
        setLoading(false);
    }, [doctorId, specialty, page, statusFilter, priorityFilter]);

    useEffect(() => {
        if (doctorId) loadData();
    }, [doctorId, loadData]);

    async function handleClaim(consultationId: string) {
        setClaiming(consultationId);
        try {
            const res = await claimConsultationAction(consultationId, doctorId);
            if (res.success) {
                loadData();
            }
        } catch (err) {
            console.error('Claim error:', err);
        }
        setClaiming(null);
    }

    const totalPages = Math.ceil(totalCount / perPage);
    const pendingCount = consultations.filter(c => !c.doctor_id).length;
    const urgentCount = consultations.filter(c => c.priority === 'urgent').length;

    return (
        <>
            <Header title="Consultation Queue" subtitle="View and claim patient consultations" />

            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <StatCard icon={ClipboardList} value={totalCount} label="Total Cases" />
                    <StatCard icon={Clock} value={pendingCount} label="Pending" iconColor="text-warning" iconBg="bg-warning-faded" />
                    <StatCard icon={AlertTriangle} value={urgentCount} label="Urgent" iconColor="text-error" iconBg="bg-error-faded" />
                </div>

                {/* Main Table Card */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
                    {/* Filters Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 pb-3 md:pb-4 border-b border-border">
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-text-primary">Queue</h2>
                            <p className="text-xs md:text-sm text-text-muted mt-0.5">{totalCount} cases</p>
                        </div>
                    </div>

                    {/* Status Tabs */}
                    <div className="flex items-center gap-1 py-3 border-b border-border/50 overflow-x-auto">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${statusFilter === tab.key
                                    ? 'bg-accent text-bg-primary shadow-[0_2px_8px_rgba(45,212,191,0.3)]'
                                    : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                        <div className="mx-2 h-5 border-l border-border" />
                        {PRIORITY_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => { setPriorityFilter(tab.key); setPage(1); }}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${priorityFilter === tab.key
                                    ? 'bg-accent text-bg-primary shadow-[0_2px_8px_rgba(45,212,191,0.3)]'
                                    : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* ─── Mobile Card View (< md) ─── */}
                            <div className="md:hidden space-y-3 pt-3">
                                {consultations.length === 0 ? (
                                    <div className="text-center py-12 text-text-muted text-sm">No consultations found</div>
                                ) : (
                                    consultations.map(row => {
                                        const st = statusMap[row.status] ?? { label: row.status, variant: 'neutral' as const };
                                        return (
                                            <Link
                                                key={row.id}
                                                href={`/dashboard/consultation/${row.id}`}
                                                className="block bg-bg-card border border-border rounded-2xl p-4 hover:border-accent/30 transition-all active:scale-[0.98]"
                                            >
                                                {/* Row 1: Avatar + Name + Priority */}
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div
                                                        className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                                                        style={{ backgroundColor: `hsl(${((row.patient?.nickname || 'P').charCodeAt(0) * 37) % 360}, 60%, 45%)` }}
                                                    >
                                                        {(row.patient?.nickname || 'P')[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-semibold text-text-primary text-sm">{row.patient?.nickname || 'Patient'}</span>
                                                        <p className="text-xs text-text-muted capitalize">
                                                            {row.patient?.gender} · {new Date().getFullYear() - (row.patient?.year_of_birth || 2000)}y
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5" data-small-touch>
                                                        <PriorityBadge priority={row.priority} />
                                                        {row.urgent_fee > 0 && (
                                                            <span className="inline-flex items-center gap-0.5 text-[10px] text-warning font-semibold">
                                                                <Zap className="w-3 h-3" />+{row.urgent_fee}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Row 2: Complaint */}
                                                <p className="text-sm text-text-primary line-clamp-2 mb-2">
                                                    {row.chief_complaint || 'No complaint'}
                                                </p>

                                                {/* Row 3: Status + Tokens + Date + Claim */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span data-small-touch><StatusBadge label={st.label} variant={st.variant} pulse={row.status === 'in_progress'} /></span>
                                                    <span className="text-gold font-semibold text-xs" data-small-touch>💎 {row.token_cost || 3}</span>
                                                    <span className="text-text-muted text-xs ml-auto" data-small-touch>
                                                        {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    {!row.doctor_id && (
                                                        canClaim ? (
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClaim(row.id); }}
                                                                disabled={!!claiming}
                                                                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-accent text-bg-primary font-semibold transition-all disabled:opacity-40"
                                                            >
                                                                {claiming === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                                                Claim
                                                            </button>
                                                        ) : (
                                                            <span className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-warning/10 text-warning font-semibold cursor-not-allowed">
                                                                🔒 Locked
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>

                            {/* ─── Desktop Table View (≥ md) ─── */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full border-separate" style={{ borderSpacing: '0 6px' }}>
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-l-xl">Patient</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Complaint</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Priority</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Status</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Tokens</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Date</th>
                                            <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-r-xl">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consultations.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="text-center py-12 text-text-muted text-sm">
                                                    No consultations found
                                                </td>
                                            </tr>
                                        ) : (
                                            consultations.map(row => {
                                                const st = statusMap[row.status] ?? { label: row.status, variant: 'neutral' as const };
                                                return (
                                                    <tr key={row.id} className="group">
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-l-xl">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                                                                    style={{ backgroundColor: `hsl(${((row.patient?.nickname || 'P').charCodeAt(0) * 37) % 360}, 60%, 45%)` }}
                                                                >
                                                                    {(row.patient?.nickname || 'P')[0].toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold text-text-primary">{row.patient?.nickname || 'Patient'}</span>
                                                                    <p className="text-xs text-text-muted capitalize">
                                                                        {row.patient?.gender} · {new Date().getFullYear() - (row.patient?.year_of_birth || 2000)}y
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <span className="text-text-primary line-clamp-1">{row.chief_complaint || '—'}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <div className="flex items-center gap-1.5">
                                                                <PriorityBadge priority={row.priority} />
                                                                {row.urgent_fee > 0 && (
                                                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-warning font-semibold">
                                                                        <Zap className="w-3 h-3" />+{row.urgent_fee}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <StatusBadge label={st.label} variant={st.variant} pulse={row.status === 'in_progress'} />
                                                        </td>
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <span className="text-gold font-semibold">💎 {row.token_cost || 3}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <span className="text-text-muted text-xs">
                                                                {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-r-xl">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {!row.doctor_id && (
                                                                    canClaim ? (
                                                                        <button
                                                                            onClick={() => handleClaim(row.id)}
                                                                            disabled={!!claiming}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent text-bg-primary font-semibold hover:shadow-[0_2px_8px_rgba(45,212,191,0.3)] transition-all disabled:opacity-40"
                                                                        >
                                                                            {claiming === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                                                            Claim
                                                                        </button>
                                                                    ) : (
                                                                        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-warning/10 text-warning font-semibold cursor-not-allowed">
                                                                            🔒 Locked
                                                                        </span>
                                                                    )
                                                                )}
                                                                <Link
                                                                    href={`/dashboard/consultation/${row.id}`}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors font-medium"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    View
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page <= 1}
                                        className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm text-accent hover:bg-accent-faded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>
                                    <span className="text-sm text-text-secondary font-medium">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page >= totalPages}
                                        className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm text-accent hover:bg-accent-faded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
