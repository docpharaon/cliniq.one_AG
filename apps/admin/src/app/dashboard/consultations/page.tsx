import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import ConsultationDetailPanel, { type ConsultationFull } from '@/components/ConsultationDetailPanel';
import {
    Stethoscope, Activity, AlertTriangle, CheckCircle2, Archive,
    Trash2, Search, Download, ChevronLeft, ChevronRight, Eye,
    Timer, Zap, Clock, Loader2, Printer, Shield, ArrowRight
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
    fetchConsultations,
    fetchConsultationStats,
    fetchConsultationById,
    fetchPendingArchiveCount,
    doBatchArchive,
    doBatchPurge,
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
    { key: 'pending_archive', label: '⚠ Pending Archive' },
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

    // Batch + Pending Archive state
    const [pendingArchiveCount, setPendingArchiveCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [batchAction, setBatchAction] = useState<'archive' | 'purge' | null>(null);
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [batchConfirmPrinted, setBatchConfirmPrinted] = useState(false);
    const [batchConfirmIrreversible, setBatchConfirmIrreversible] = useState(false);

    const loadData = useCallback(() => {
        setLoading(true);

        // Map special filters
        let statusFilter: string | undefined;
        if (activeFilter === 'all') statusFilter = undefined;
        else if (activeFilter === 'overdue') statusFilter = undefined;
        else if (activeFilter === 'archived') statusFilter = undefined;
        else if (activeFilter === 'purged') statusFilter = undefined;
        else if (activeFilter === 'pending_archive') statusFilter = undefined;
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
            } else if (activeFilter === 'pending_archive') {
                rows = rows.filter(r => r.concluded_at && !r.archived_at && !r.purged_at);
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
        fetchPendingArchiveCount().then(c => setPendingArchiveCount(c));
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
        setSelectedIds(new Set());
    }

    // Batch operations
    function toggleSelect(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        const eligible = consultations.filter(r => r.concluded_at && !r.purged_at);
        if (selectedIds.size === eligible.length && eligible.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(eligible.map(r => r.id)));
        }
    }

    async function handleBatchArchive() {
        if (selectedIds.size === 0) return;
        setBatchProcessing(true);
        await doBatchArchive(Array.from(selectedIds), 'admin-placeholder');
        setBatchProcessing(false);
        setBatchAction(null);
        refreshAll();
    }

    async function handleBatchPurge() {
        if (selectedIds.size === 0 || !batchConfirmPrinted || !batchConfirmIrreversible) return;
        setBatchProcessing(true);
        await doBatchPurge(Array.from(selectedIds), 'admin-placeholder');
        setBatchProcessing(false);
        setBatchAction(null);
        setBatchConfirmPrinted(false);
        setBatchConfirmIrreversible(false);
        refreshAll();
    }

    const totalPages = Math.ceil(totalCount / perPage);
    const selectedArr = consultations.filter(r => selectedIds.has(r.id));
    const allSelectedArchived = selectedArr.length > 0 && selectedArr.every(r => !!r.archived_at);

    return (
        <>
            <Header title="Consultations" subtitle="Monitor deadlines, archive & purge consultation data" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">

                {/* ── Pending Archive Alert Banner ── */}
                {pendingArchiveCount > 0 && (
                    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-error/10 to-amber-500/10 border border-error/30 animate-fade-in">
                        <div className="w-10 h-10 rounded-xl bg-error/15 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-error" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-error">
                                {pendingArchiveCount} concluded consultation{pendingArchiveCount > 1 ? 's' : ''} require{pendingArchiveCount === 1 ? 's' : ''} archiving
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                                These cases contain medical data that must be printed and purged per the zero-retention policy.
                            </p>
                        </div>
                        <button
                            onClick={() => handleFilterChange('pending_archive')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-error/15 text-error text-xs font-bold hover:bg-error/25 transition-colors whitespace-nowrap"
                        >
                            View Pending <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

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

                {/* ── Retention Pipeline Tracker ── */}
                <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-accent" />
                        <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Data Lifecycle Pipeline</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {[
                            { label: 'Concluded', count: stats.concluded, color: 'bg-success-faded text-success', icon: CheckCircle2 },
                            { label: 'Pending Print & Archive', count: pendingArchiveCount, color: pendingArchiveCount > 0 ? 'bg-error/10 text-error' : 'bg-bg-elevated text-text-muted', icon: Printer },
                            { label: 'Archived', count: stats.archived, color: 'bg-accent/10 text-accent', icon: Archive },
                            { label: 'Purged', count: stats.purged, color: 'bg-bg-elevated text-text-muted', icon: Trash2 },
                        ].map((step, i) => (
                            <div key={step.label} className="flex items-center gap-2">
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${step.color} transition-colors`}>
                                    <step.icon className="w-3.5 h-3.5" />
                                    <span className="text-xs font-semibold">{step.label}</span>
                                    <span className="text-xs font-bold">{step.count}</span>
                                </div>
                                {i < 3 && <ArrowRight className="w-3.5 h-3.5 text-text-muted/40" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Main Table Card ─────────────── */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
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
                                {tab.key === 'pending_archive' && pendingArchiveCount > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-error/20 text-error animate-pulse">
                                        {pendingArchiveCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Search + Export + Batch Actions */}
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

                        {/* Batch action bar */}
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/30 animate-fade-in">
                                <span className="text-xs font-bold text-accent">{selectedIds.size} selected</span>
                                <button
                                    onClick={handleBatchArchive}
                                    disabled={batchProcessing}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent/15 text-accent hover:bg-accent/25 transition-colors disabled:opacity-50"
                                >
                                    <Archive className="w-3 h-3" /> Archive
                                </button>
                                {allSelectedArchived && (
                                    <button
                                        onClick={() => setBatchAction('purge')}
                                        disabled={batchProcessing}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-error/15 text-error hover:bg-error/25 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="w-3 h-3" /> Purge
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        )}

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
                                            <th className="px-3 py-3 text-center text-xs bg-bg-elevated rounded-l-xl w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.size > 0 && selectedIds.size === consultations.filter(r => r.concluded_at && !r.purged_at).length}
                                                    onChange={toggleSelectAll}
                                                    className="w-3.5 h-3.5 accent-accent cursor-pointer"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Case ID</th>
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
                                                        {/* Select Checkbox */}
                                                        <td className="px-3 py-4 text-center bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-l-xl">
                                                            {(row.concluded_at && !row.purged_at) ? (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedIds.has(row.id)}
                                                                    onChange={() => toggleSelect(row.id)}
                                                                    className="w-3.5 h-3.5 accent-accent cursor-pointer"
                                                                />
                                                            ) : (
                                                                <span className="block w-3.5 h-3.5" />
                                                            )}
                                                        </td>
                                                        {/* Case ID */}
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
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

            {/* ── Batch Purge Modal ──────── */}
            {batchAction === 'purge' && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[60]" onClick={() => { setBatchAction(null); setBatchConfirmPrinted(false); setBatchConfirmIrreversible(false); }} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md bg-bg-primary border border-border rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-error" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary">Batch Purge — {selectedIds.size} Consultations</h3>
                                <p className="text-xs text-text-muted">Zero Retention Policy</p>
                            </div>
                        </div>

                        <div className="bg-error/5 border border-error/20 rounded-xl p-4 mb-4">
                            <p className="text-sm text-text-secondary">
                                This will <strong className="text-error">permanently delete</strong> all cloud data for <strong>{selectedIds.size} consultations</strong>:
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-text-muted">
                                <li>• All chat messages & AI sessions</li>
                                <li>• Protocol logs, reports & prescriptions</li>
                            </ul>
                        </div>

                        <div className="space-y-3 mb-4 border-t border-border pt-4">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={batchConfirmPrinted}
                                    onChange={e => setBatchConfirmPrinted(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-border accent-accent cursor-pointer"
                                />
                                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                                    I confirm I have <strong className="text-text-primary">printed/exported hard copies</strong> for all selected consultations
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={batchConfirmIrreversible}
                                    onChange={e => setBatchConfirmIrreversible(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-border accent-error cursor-pointer"
                                />
                                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                                    I understand this action is <strong className="text-error">irreversible</strong>
                                </span>
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setBatchAction(null); setBatchConfirmPrinted(false); setBatchConfirmIrreversible(false); }}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBatchPurge}
                                disabled={batchProcessing || !batchConfirmPrinted || !batchConfirmIrreversible}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-error text-white text-sm font-semibold hover:bg-error/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {batchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Purge All ({selectedIds.size})
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
