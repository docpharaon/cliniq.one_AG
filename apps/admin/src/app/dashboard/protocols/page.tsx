import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { useEffect, useState } from 'react';
import { fetchProtocolLogs } from '@/lib/actions';

const protocolDescriptions: Record<string, string> = {
    A: 'Suicidal ideation',
    B: 'Chest pain / cardiac',
    C: 'Severe allergic reaction',
    D: 'Child abuse suspected',
    E: 'Domestic violence',
    F: 'Overdose / poisoning',
    G: 'Acute breathing difficulty',
    H: 'Severe bleeding',
    I: 'Other emergency',
};

type ProtocolRow = {
    id: string;
    consultation_id: string;
    patient_name: string;
    protocol_code: string;
    severity: string;
    trigger_text: string;
    action_taken: string;
    resolved: boolean;
    created_at: string;
};

const severityMap: Record<string, 'error' | 'warning' | 'info' | 'neutral'> = {
    critical: 'error',
    high: 'warning',
    medium: 'info',
    low: 'neutral',
};

const columns = [
    {
        key: 'protocol_code',
        label: 'Protocol',
        render: (row: ProtocolRow) => (
            <div>
                <span className="text-lg font-bold text-error">Protocol {row.protocol_code}</span>
                <p className="text-xs text-text-muted">{protocolDescriptions[row.protocol_code]}</p>
            </div>
        ),
    },
    {
        key: 'severity',
        label: 'Severity',
        render: (row: ProtocolRow) => (
            <StatusBadge
                label={row.severity.toUpperCase()}
                variant={severityMap[row.severity] ?? 'neutral'}
                pulse={row.severity === 'critical'}
            />
        ),
    },
    { key: 'patient_name', label: 'Patient' },
    {
        key: 'consultation_id',
        label: 'Case',
        render: (row: ProtocolRow) => (
            <span className="font-mono text-sm text-accent">{row.consultation_id?.slice(0, 8)}…</span>
        ),
    },
    {
        key: 'trigger_text',
        label: 'Trigger',
        render: (row: ProtocolRow) => (
            <span className="text-sm text-text-secondary max-w-[250px] truncate block">{row.trigger_text}</span>
        ),
    },
    {
        key: 'resolved',
        label: 'Status',
        render: (row: ProtocolRow) => (
            <StatusBadge
                label={row.resolved ? 'Resolved' : 'Open'}
                variant={row.resolved ? 'success' : 'error'}
            />
        ),
    },
    {
        key: 'created_at',
        label: 'Date',
        render: (row: ProtocolRow) => (
            <span className="text-sm text-text-secondary">
                {new Date(row.created_at).toLocaleDateString()}
            </span>
        ),
    },
    {
        key: 'actions',
        label: '',
        render: (row: ProtocolRow) => (
            <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors">
                    Review
                </button>
                {!row.resolved && (
                    <button className="px-3 py-1.5 text-xs rounded-lg bg-success-faded text-success hover:bg-success/20 transition-colors font-semibold">
                        Resolve
                    </button>
                )}
            </div>
        ),
    },
];

export default function ProtocolsPage() {
    const [protocols, setProtocols] = useState<ProtocolRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');

    useEffect(() => {
        fetchProtocolLogs(1, 50).then(({ data, count }) => {
            setProtocols(data as ProtocolRow[]);
            setTotalCount(count);
            setLoading(false);
        });
    }, []);

    const filteredProtocols = activeFilter === 'All'
        ? protocols
        : protocols.filter(p => p.severity === activeFilter.toLowerCase());

    return (
        <>
            <Header title="Protocol Violations" subtitle="Safety alerts & intervention logs" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
                {/* Severity Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {['All', 'Critical', 'High', 'Medium', 'Low'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setActiveFilter(s)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeFilter === s
                                ? 'bg-error text-white'
                                : 'bg-bg-elevated border border-border text-text-secondary hover:text-error hover:border-error'
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
                        title="Protocol Alert Log"
                        subtitle={`${totalCount} protocol violations recorded`}
                        columns={columns}
                        data={filteredProtocols}
                        totalCount={totalCount}
                        searchPlaceholder="Search by patient, case ID, or code..."
                        rowKey={(row) => row.id}
                    />
                )}
            </div>
        </>
    );
}
