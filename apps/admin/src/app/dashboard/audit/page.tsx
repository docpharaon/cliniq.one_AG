'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAuditLog } from '@/lib/actions';
import { Loader2, Search, Shield, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

type AuditEntry = {
    id: string;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    old_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
};

const PER_PAGE = 20;

export default function AuditLogPage() {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        const res = await fetchAuditLog(page, PER_PAGE, search || undefined);
        const items = (res?.data || []) as AuditEntry[];
        setEntries(items);
        setHasMore(items.length === PER_PAGE);
        setLoading(false);
    }, [page, search]);

    useEffect(() => { loadData(); }, [loadData]);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        setPage(1);
        loadData();
    }

    function formatTime(iso: string) {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function formatAction(action: string) {
        return action.replace(/\./g, ' → ').replace(/_/g, ' ');
    }

    function formatJSON(val: Record<string, unknown> | null) {
        if (!val) return '—';
        const entries = Object.entries(val);
        if (entries.length === 0) return '—';
        if (entries.length === 1 && entries[0][0] === 'value') {
            const v = entries[0][1];
            return typeof v === 'string' ? (v.length > 60 ? v.slice(0, 60) + '…' : v) : JSON.stringify(v);
        }
        const str = JSON.stringify(val, null, 0);
        return str.length > 80 ? str.slice(0, 80) + '…' : str;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-faded flex items-center justify-center">
                        <Shield className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Audit Log</h1>
                        <p className="text-sm text-text-secondary">Track all administrative changes</p>
                    </div>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="ml-auto flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by action or entity…"
                            className="pl-9 pr-4 py-2.5 rounded-xl bg-bg-elevated border border-border text-sm text-text-primary w-64 placeholder:text-text-muted focus:border-accent/50 focus:outline-none transition-colors"
                        />
                    </div>
                    <button type="submit" className="px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:bg-accent/90 transition-all">
                        Search
                    </button>
                </form>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
            ) : entries.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-text-muted">
                    <Shield className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No audit log entries found</p>
                    {search && <p className="text-xs mt-1">Try a different search term</p>}
                </div>
            ) : (
                <div className="glass rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Time</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Action</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Entity</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Entity ID</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Old Value</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">New Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((e) => (
                                    <tr key={e.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-text-muted">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-xs">{formatTime(e.created_at)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-semibold capitalize">
                                                {formatAction(e.action)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary capitalize">{e.entity_type.replace(/_/g, ' ')}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-text-muted">{e.entity_id || '—'}</td>
                                        <td className="px-4 py-3 text-xs text-text-muted max-w-[200px] truncate" title={JSON.stringify(e.old_value)}>
                                            {formatJSON(e.old_value)}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-text-muted max-w-[200px] truncate" title={JSON.stringify(e.new_value)}>
                                            {formatJSON(e.new_value)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <span className="text-xs text-text-muted">Page {page}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Prev
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={!hasMore}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
