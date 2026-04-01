import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import { AlertTriangle, CheckCircle, Search, Clock, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchErrorReports } from '@/lib/actions';

type ErrorRow = {
    id: string;
    reporter_name: string | null;
    category: string;
    description: string;
    status: string;
    resolution_notes: string | null;
    created_at: string;
};

const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    open: 'error',
    investigating: 'warning',
    resolved: 'success',
    dismissed: 'neutral',
};

const columns = [
    {
        key: 'id',
        label: 'ID',
        render: (row: ErrorRow) => (
            <span className="font-mono text-xs text-accent">{row.id.slice(0, 8)}…</span>
        ),
    },
    {
        key: 'reporter_name',
        label: 'Reporter',
        render: (row: ErrorRow) => (
            <span className="text-text-primary">{row.reporter_name ?? 'Anonymous'}</span>
        ),
    },
    {
        key: 'category',
        label: 'Category',
        render: (row: ErrorRow) => (
            <span className="text-accent text-sm capitalize">{row.category?.replace('_', ' ')}</span>
        ),
    },
    {
        key: 'description',
        label: 'Description',
        render: (row: ErrorRow) => (
            <span className="text-sm text-text-secondary max-w-[300px] truncate block">{row.description}</span>
        ),
    },
    {
        key: 'status',
        label: 'Status',
        render: (row: ErrorRow) => (
            <StatusBadge label={row.status.charAt(0).toUpperCase() + row.status.slice(1)} variant={statusMap[row.status] ?? 'neutral'} pulse={row.status === 'open'} />
        ),
    },
    {
        key: 'created_at',
        label: 'Reported',
        render: (row: ErrorRow) => (
            <span className="text-sm text-text-secondary">{new Date(row.created_at).toLocaleDateString()}</span>
        ),
    },
    {
        key: 'actions',
        label: '',
        render: (row: ErrorRow) => (
            <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors">View</button>
                {row.status === 'open' && (
                    <button className="px-3 py-1.5 text-xs rounded-lg bg-success-faded text-success hover:bg-success/20 transition-colors font-semibold">Resolve</button>
                )}
            </div>
        ),
    },
];

export default function ErrorsPage() {
    const [errors, setErrors] = useState<ErrorRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');

    useEffect(() => {
        fetchErrorReports(1, 50).then(({ data, count }) => {
            setErrors(data as ErrorRow[]);
            setTotalCount(count);
            setLoading(false);
        });
    }, []);

    const openCount = errors.filter(e => e.status === 'open').length;
    const investigatingCount = errors.filter(e => e.status === 'investigating').length;
    const resolvedCount = errors.filter(e => e.status === 'resolved').length;

    const filteredErrors = activeFilter === 'All'
        ? errors
        : errors.filter(e => e.status === activeFilter.toLowerCase());

    return (
        <>
            <Header title="Error Reports" subtitle="Patient-reported issues & bug tracking" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <StatCard icon={AlertTriangle} value={String(totalCount)} label="Total Reports" />
                    <StatCard icon={Clock} value={String(openCount)} label="Open" iconColor="text-error" iconBg="bg-error-faded" />
                    <StatCard icon={Search} value={String(investigatingCount)} label="Investigating" iconColor="text-warning" iconBg="bg-warning-faded" />
                    <StatCard icon={CheckCircle} value={String(resolvedCount)} label="Resolved" iconColor="text-success" iconBg="bg-success-faded" />
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap gap-2">
                    {['All', 'Open', 'Investigating', 'Resolved', 'Dismissed'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setActiveFilter(s)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeFilter === s
                                ? 'bg-accent text-bg-primary'
                                : 'bg-bg-elevated border border-border text-text-secondary hover:text-accent hover:border-accent'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        title="Error Log"
                        subtitle={`${filteredErrors.length} error reports`}
                        columns={columns}
                        data={filteredErrors}
                        totalCount={filteredErrors.length}
                        searchPlaceholder="Search by category or description..."
                        rowKey={(row) => row.id}
                        actions={
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all">
                                <Plus className="w-4 h-4" /> Log Report
                            </button>
                        }
                    />
                )}
            </div>
        </>
    );
}
