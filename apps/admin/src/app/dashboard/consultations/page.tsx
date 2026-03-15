'use client';

import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import ConsultationDetailPanel, { type ConsultationFull } from '@/components/ConsultationDetailPanel';
import {
    Stethoscope, Activity, AlertTriangle, CheckCircle2, Archive,
    Trash2, Search, Download, ChevronLeft, ChevronRight, Eye,
    Timer, Zap, Clock, Loader2, Printer
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
    fetchConsultations,
    fetchConsultationStats,
    fetchConsultationById,
} from '@/lib/actions';

// ── Types ────────────────────────────────────

type ConsultRow = ConsultationFull;

type ConsultStats = {
    total: number;
    inProgress: number;
    overdue: number;
    concluded: number;
    archived: number;
    purged: number;
};

// ── Constants ────────────────────────────────

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
    draft: { label: 'Draft', variant: 'neutral' },
    intake_in_progress: { label: 'Intake', variant: 'info' },
    pending_payment: { label: 'Payment', variant: 'warning' },
    submitted: { label: 'Submitted', variant: 'warning' },
    assigned: { label: 'Assigned', variant: 'info' },
    in_progress: { label: 'In Progress', variant: 'info' },
    report_ready: { label: 'Report Ready', variant: 'success' },
    completed: { label: 'Completed', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'error' },
};

const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'overdue', label: '⚠ Overdue' },
    { key: 'report_ready', label: 'Report Ready' },
    { key: 'completed', label: 'Completed' },
    { key: 'archived', label: 'Archived' },
    { key: 'purged', label: 'Purged' },
    { key: 'cancelled', label: 'Cancelled' },
] as const;

// ── Helpers ──────────────────────────────────

function getDeadlineBadge(row: ConsultRow) {
    if (!row.deadline_at) return null;
    const deadline = new Date(row.deadline_at);
    const now = new Date();
    const diffMin = Math.round((deadline.getTime() - now.getTime()) / 60000);

    if (['completed', 'report_ready', 'cancelled'].includes(row.status)) return null;

    if (diffMin < 0) {
        const overdue = Math.abs(diffMin);
        const h = Math.floor(overdue / 60);
        const m = overdue % 60;
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-error/15 text-error text-xs font-semibold animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {h > 0 ? `${h}h ${m}m` : `${m}m`} overdue
            </span>
        );
    }

    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${diffMin < 10 ? 'bg-warning/15 text-warning' : 'bg-success-faded text-success'
            }`}>
            <Timer className="w-3 h-3" />
            {h > 0 ? `${h}h ${m}m` : `${m}m`}
        </span>
    );
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Page ─────────────────────────────────────

export default function ConsultationsPage() {
    const [consultations, setConsultations] = useState<ConsultRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ConsultStats>({ total: 0, inProgress: 0, overdue: 0, concluded: 0, archived: 0, purged: 0 });
    const [activeFilter, setActiveFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const perPage = 25;

    const [selectedConsultation, setSelectedConsultation] = useState<ConsultRow | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const loadData = useCallback(() => {
        setLoading(true);

        // Map special filters
        let statusFilter: string | undefined;
        if (activeFilter === 'all') statusFilter = undefined;
        else if (activeFilter === 'overdue') statusFilter = undefined; // handled client-side
        else if (activeFilter === 'archived') statusFilter = undefined;
        else if (activeFilter === 'purged') statusFilter = undefined;
        else statusFilter = activeFilter;

        const searchTerm = search.trim() || undefined;

        fetchConsultations(page, perPage, searchTerm, statusFilter).then(({ data, count }) => {
            let rows = data as ConsultRow[];

            // Client-side filters for special tabs
            if (activeFilter === 'overdue') {
                const now = new Date();
                rows = rows.filter(r =>
                    r.deadline_at &&
                    new Date(r.deadline_at) < now &&
                    ['assigned', 'in_progress'].includes(r.status) &&
                    !r.purged_at
                );
            } else if (activeFilter === 'archived') {
                rows = rows.filter(r => r.archived_at && !r.purged_at);
            } else if (activeFilter === 'purged') {
                rows = rows.filter(r => !!r.purged_at);
            }

            setConsultations(rows);
            setTotalCount(activeFilter === 'all' ? count : rows.length);
            setLoading(false);
        });
    }, [activeFilter, search, page]);

    const loadStats = useCallback(() => {
        fetchConsultationStats().then(s => setStats(s as ConsultStats));
    }, []);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { loadStats(); }, [loadStats]);

    function handleFilterChange(key: string) {
        setActiveFilter(key);
        setPage(1);
    }

    function handleSearchChange(val: string) {
        setSearch(val);
        setPage(1);
    }

    async function handleViewDetail(row: ConsultRow) {
        setLoadingDetail(true);
        const detail = await fetchConsultationById(row.id);
        setSelectedConsultation(detail as ConsultRow);
        setLoadingDetail(false);
    }

    function refreshAll() {
        loadData();
        loadStats();
    }

    const totalPages = Math.ceil(totalCount / perPage);

    return (
        <>
            <Header title="Consultations" subtitle="Monitor deadlines, archive & purge consultation data" />
            <div className="p-8 max-w-[1400px] mx-auto space-y-6">

                {/* ── Stat Cards ───────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard
                        label="Total"
                        value={stats.total}
                        icon={Stethoscope}
                    />
                    <StatCard
                        label="In Progress"
                        value={stats.inProgress}
                        icon={Activity}
                        iconColor="text-info"
                        iconBg="bg-info/10"
                    />
                    <StatCard
                        label="Overdue"
                        value={stats.overdue}
                        icon={AlertTriangle}
                        iconColor="text-error"
                        iconBg="bg-error/10"
                    />
                    <StatCard
                        label="Concluded"
                        value={stats.concluded}
                        icon={CheckCircle2}
                        iconColor="text-success"
                        iconBg="bg-success-faded"
                    />
                    <StatCard
                        label="Archived"
                        value={stats.archived}
                        icon={Archive}
                        iconColor="text-warning"
                        iconBg="bg-warning-faded"
                    />
                </div>

                {/* ── Main Table Card ─────────────── */}
                <div className="glass rounded-2xl p-6 animate-fade-in">
                    {/* Table Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">All Consultations</h2>
                            <p className="text-sm text-text-muted mt-0.5">
                                {totalCount} medical cases
                            </p>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 py-3 border-b border-border/50 overflow-x-auto">
                        {FILTER_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => handleFilterChange(tab.key)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeFilter === tab.key
                                    ? 'bg-accent text-bg-primary shadow-[0_2px_8px_rgba(45,212,191,0.3)]'
                                    : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                    }`}
                            >
                                {tab.label}
                                {tab.key === 'overdue' && stats.overdue > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-error/20 text-error">
                                        {stats.overdue}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Search + Export */}
                    <div className="flex flex-wrap items-center gap-3 py-4">
                        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => handleSearchChange(e.target.value)}
                                placeholder="Search by case ID, complaint, or doctor..."
                                className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                            />
                        </div>
                        <div className="ml-auto">
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-accent hover:bg-accent-faded transition-colors">
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-separate" style={{ borderSpacing: '0 6px' }}>
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-l-xl">Case ID</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Patient</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Doctor</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Status</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Priority</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Deadline</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Lifecycle</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Date</th>
                                            <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-r-xl">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consultations.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="text-center py-12 text-text-muted text-sm">
                                                    {search.trim() ? 'No results match your search' : 'No consultations found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            consultations.map(row => {
                                                const st = statusMap[row.status] ?? { label: row.status, variant: 'neutral' as const };
                                                const isPurged = !!row.purged_at;
                                                const isArchived = !!row.archived_at;

                                                return (
                                                    <tr key={row.id} className="group">
                                                        {/* Case ID */}
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-l-xl">
                                                            <span className="font-mono text-sm font-semibold text-accent">{row.id.slice(0, 8)}…</span>
                                                        </td>
                                                        {/* Patient */}
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <span className="font-semibold text-text-primary">{row.patient_name}</span>
                                                        </td>
                                                        {/* Doctor */}
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <span className={row.doctor_name ? 'text-text-primary' : 'text-text-muted italic'}>
                                                                {row.doctor_name ?? 'Unassigned'}
                                                            </span>
                                                        </td>
                                                        {/* Status */}
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <StatusBadge label={st.label} variant={st.variant} pulse={row.status === 'in_progress'} />
                                                        </td>
                                                        {/* Priority */}
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
                                                        {/* Deadline */}
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            {getDeadlineBadge(row) ?? <span className="text-text-muted text-xs">—</span>}
                                                        </td>
                                                        {/* Lifecycle */}
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <div className="flex items-center gap-1.5">
                                                                {isPurged ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-error/10 text-error text-xs font-medium">
                                                                        <Trash2 className="w-3 h-3" /> Purged
                                                                    </span>
                                                                ) : isArchived ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-xs font-medium">
                                                                        <Archive className="w-3 h-3" /> Archived
                                                                    </span>
                                                                ) : row.concluded_at ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-success-faded text-success text-xs font-medium">
                                                                        <CheckCircle2 className="w-3 h-3" /> Concluded
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-text-muted text-xs">Active</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {/* Date */}
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <span className="text-text-muted text-xs">{formatDate(row.created_at)}</span>
                                                        </td>
                                                        {/* Actions */}
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-r-xl">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => handleViewDetail(row)}
                                                                    disabled={loadingDetail}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors font-medium"
                                                                >
                                                                    {loadingDetail ? (
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                    )}
                                                                    View
                                                                </button>
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

            {/* ── Detail Panel ──────────── */}
            {selectedConsultation && (
                <ConsultationDetailPanel
                    consultation={selectedConsultation}
                    onClose={() => setSelectedConsultation(null)}
                    onUpdated={() => {
                        setSelectedConsultation(null);
                        refreshAll();
                    }}
                    adminUserId="admin-placeholder"
                />
            )}
        </>
    );
}
