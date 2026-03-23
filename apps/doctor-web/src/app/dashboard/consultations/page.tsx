'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { FileText, CheckCircle2, Clock, Archive, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { fetchConsultationHistory } from '@/lib/actions';
import { createBrowserSupabase } from '@/lib/supabase';
import Link from 'next/link';

const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'inquiry_sent', label: 'Inquiry Sent' },
    { key: 'report_ready', label: 'Report Ready' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
] as const;

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
    assigned: { label: 'Assigned', variant: 'info' },
    in_progress: { label: 'In Progress', variant: 'info' },
    inquiry_sent: { label: 'Inquiry Sent', variant: 'warning' },
    report_ready: { label: 'Report Ready', variant: 'success' },
    completed: { label: 'Completed', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'error' },
};

export default function ConsultationsPage() {
    const [consultations, setConsultations] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [doctorId, setDoctorId] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const perPage = 25;

    useEffect(() => {
        async function init() {
            const supabase = createBrowserSupabase();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: doctor } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (doctor) setDoctorId(doctor.id);
        }
        init();
    }, []);

    const loadData = useCallback(async () => {
        if (!doctorId) return;
        setLoading(true);
        try {
            const result = await fetchConsultationHistory(
                doctorId,
                page,
                perPage,
                search.trim() || undefined,
                statusFilter !== 'all' ? statusFilter : undefined,
            );
            setConsultations(result.data);
            setTotalCount(result.count);
        } catch (err) {
            console.error('Load consultations error:', err);
        }
        setLoading(false);
    }, [doctorId, page, search, statusFilter]);

    useEffect(() => {
        if (doctorId) loadData();
    }, [doctorId, loadData]);

    const totalPages = Math.ceil(totalCount / perPage);

    return (
        <>
            <Header title="Consultation History" subtitle="View all your past and current consultations" />

            <div className="p-8 max-w-[1400px] mx-auto space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <StatCard icon={FileText} value={totalCount} label="Total Cases" />
                    <StatCard icon={Clock} value={consultations.filter(c => c.status === 'in_progress').length} label="In Progress" iconColor="text-info" iconBg="bg-info-faded" />
                    <StatCard icon={CheckCircle2} value={consultations.filter(c => c.status === 'completed').length} label="Completed" iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard icon={Archive} value={consultations.filter(c => c.status === 'report_ready').length} label="Report Ready" iconColor="text-warning" iconBg="bg-warning-faded" />
                </div>

                {/* Main Card */}
                <div className="glass rounded-2xl p-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">All Consultations</h2>
                            <p className="text-sm text-text-muted mt-0.5">{totalCount} cases</p>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 py-3 border-b border-border/50 overflow-x-auto">
                        {FILTER_TABS.map(tab => (
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
                    </div>

                    {/* Search */}
                    <div className="flex flex-wrap items-center gap-3 py-4">
                        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search by complaint or case ID..."
                                className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                            />
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
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Complaint</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Status</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Date</th>
                                            <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-r-xl">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consultations.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-12 text-text-muted text-sm">
                                                    No consultations found
                                                </td>
                                            </tr>
                                        ) : (
                                            consultations.map((row: any) => {
                                                const st = statusMap[row.status] ?? { label: row.status, variant: 'neutral' as const };
                                                return (
                                                    <tr key={row.id} className="group">
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-l-xl">
                                                            <span className="font-mono text-sm font-semibold text-accent">{row.id.slice(0, 8)}…</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <span className="font-semibold text-text-primary">{row.patient?.nickname || '—'}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <span className="text-text-primary line-clamp-1">{row.chief_complaint || '—'}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <StatusBadge label={st.label} variant={st.variant} />
                                                        </td>
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                            <span className="text-text-muted text-xs">
                                                                {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-r-xl">
                                                            <Link
                                                                href={`/dashboard/consultation/${row.id}`}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors font-medium justify-end"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                View
                                                            </Link>
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
                                        <ChevronLeft className="w-4 h-4" /> Previous
                                    </button>
                                    <span className="text-sm text-text-secondary font-medium">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page >= totalPages}
                                        className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm text-accent hover:bg-accent-faded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next <ChevronRight className="w-4 h-4" />
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
