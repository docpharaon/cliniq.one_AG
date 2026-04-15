'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import {
    ListFilter, Activity, Clock, User, Globe,
    Search, RefreshCw, Loader2, Info,
    CheckCircle2, XCircle, Timer,
    MessageSquare, Send, Mail, Smartphone
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
    fetchWaNotificationLog,
    fetchWaNotificationStats,
    doProcessWaQueue,
} from '@/lib/actions';

export default function WaNotificationsPage() {
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState({ total24h: 0, failed24h: 0, sent24h: 0, read24h: 0 });
    const [processing, setProcessing] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Detail View
    const [selectedLog, setSelectedLog] = useState<any>(null);

    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const s = await fetchWaNotificationStats();
            setStats(s);
        } catch (e) { console.error(e); }
        setStatsLoading(false);
    }, []);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchWaNotificationLog({
                status: statusFilter || undefined,
                type: typeFilter || undefined,
                search: searchTerm || undefined,
            });
            setLogs(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [statusFilter, typeFilter, searchTerm]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleProcessQueue = async () => {
        if (processing) return;
        setProcessing(true);
        try {
            const res = await doProcessWaQueue();
            if (res.success) {
                alert('Queue processing triggered! Logs will refresh in a few seconds.');
                setTimeout(() => { loadLogs(); loadStats(); }, 3000);
            } else {
                alert(`Error: ${res.error}`);
            }
        } catch (e: any) {
            alert(`Execution failed: ${e.message}`);
        }
        setProcessing(false);
    };

    const fmtDate = (d: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getRecipientName = (log: any) => {
        if (log.consultation?.patient?.nickname) return log.consultation.patient.nickname;
        return 'Patient';
    };

    return (
        <div className="space-y-6">
            <Header
                title="WhatsApp Delivery Logs"
                subtitle="Monitor automated notification delivery, read receipts, and failure reasons"
                icon={ListFilter}
                actions={
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleProcessQueue}
                            disabled={processing}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20 transition-all text-sm font-medium disabled:opacity-50"
                        >
                            {processing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Timer className="w-4 h-4" />
                            )}
                            Process Queue Now
                        </button>
                        <button
                            onClick={() => { loadLogs(); loadStats(); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-all text-sm font-medium"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
                        </button>
                    </div>
                }
            />

            {/* Stats Grid - Focus on 24h health */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Messages (24h)" value={stats.total24h} icon={Send} />
                <StatCard label="Successfully Sent" value={stats.sent24h} icon={CheckCircle2} color="#10b981" />
                <StatCard label="Read by Patients" value={stats.read24h} icon={Globe} color="#6366f1" />
                <StatCard label="Failures" value={stats.failed24h} icon={XCircle} color="#ef4444" />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--border-color)]">
                <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                    <div className="relative min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search by phone number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--hover-bg)] border border-[var(--border-color)] text-sm focus:ring-2 focus:ring-[var(--accent-color)] outline-none"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2.5 rounded-xl bg-[var(--hover-bg)] border border-[var(--border-color)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent-color)] min-w-[140px]"
                    >
                        <option value="">All Statuses</option>
                        <option value="sent">Sent</option>
                        <option value="delivered">Delivered</option>
                        <option value="read">Read</option>
                        <option value="failed">Failed</option>
                        <option value="queued">Queued</option>
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2.5 rounded-xl bg-[var(--hover-bg)] border border-[var(--border-color)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent-color)] min-w-[160px]"
                    >
                        <option value="">All Types</option>
                        <option value="confirmation">Confirmation</option>
                        <option value="reminder_24h">24h Reminder</option>
                        <option value="reminder_2h">2h Reminder</option>
                        <option value="report_ready">Report Ready</option>
                        <option value="lab_results">Lab Results</option>
                        <option value="cancellation">Cancellation</option>
                    </select>
                </div>

                <div className="text-xs text-[var(--text-muted)] font-medium">
                    Showing latest 200 logs
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[var(--hover-bg)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-medium">
                                <th className="text-left px-6 py-4">Recipient</th>
                                <th className="text-left px-6 py-4">Channel & Type</th>
                                <th className="text-left px-6 py-4">Status</th>
                                <th className="text-left px-6 py-4">Timestamp</th>
                                <th className="text-right px-6 py-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--accent-color)] mb-2" />
                                        <p className="text-[var(--text-muted)]">Fetching delivery logs...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                        No notification logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-[var(--hover-bg)] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-[var(--text-primary)]">
                                                        {getRecipientName(log)}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-muted)]">
                                                        {log.recipient_phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                                                    {log.channel === 'whatsapp' ? (
                                                        <Smartphone className="w-3.5 h-3.5 text-green-500" />
                                                    ) : (
                                                        <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                                                    )}
                                                    <span className="capitalize">{log.channel}</span>
                                                </div>
                                                <div className="text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-accent/5 self-start border border-accent/10">
                                                    {log.notification_type.replace(/_/g, ' ').toUpperCase()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={log.status} />
                                            {log.status === 'failed' && (
                                                <div className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Error recorded
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-[var(--text-muted)] whitespace-nowrap">
                                            {fmtDate(log.sent_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-2 rounded-lg bg-[var(--hover-bg)] border border-[var(--border-color)] hover:border-accent hover:text-accent transition-all"
                                            >
                                                <Info className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Error/Detail Modal */}
            {selectedLog && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelectedLog(null)}
                >
                    <div
                        className="w-full max-w-md bg-[var(--card-bg)] rounded-3xl border border-[var(--border-color)] shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
                            <h3 className="font-bold text-lg">Message Receipt Details</h3>
                            <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-[var(--hover-bg)] rounded-xl">
                                <XCircle className="w-5 h-5 text-[var(--text-muted)]" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold">Message ID</p>
                                    <p className="font-mono text-xs break-all mt-1">{selectedLog.message_sid || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold">Status</p>
                                    <div className="mt-1"><StatusBadge status={selectedLog.status} /></div>
                                </div>
                            </div>

                            {selectedLog.error_message && (
                                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20">
                                    <p className="text-red-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Error Message
                                    </p>
                                    <p className="text-sm text-red-600 font-medium">{selectedLog.error_message}</p>
                                </div>
                            )}

                            <div className="p-4 rounded-2xl bg-[var(--hover-bg)] border border-[var(--border-color)]">
                                <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold mb-2">Message Preview</p>
                                <p className="text-sm italic text-[var(--text-secondary)]">Template: {selectedLog.notification_type}</p>
                                <div className="mt-2 text-xs text-[var(--text-muted)] line-clamp-3">
                                    {selectedLog.message_body || 'Native Template content not logged in cleartext for privacy.'}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-[var(--hover-bg)] border-t border-[var(--border-color)]">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="w-full py-3 rounded-xl bg-[var(--text-primary)] text-[var(--color-bg-primary)] font-bold hover:opacity-90"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Reuse some icons from StatCard implicitly via lucide-react constants if possible
// Note: In Next.js with app dir, ensure Sidebar links to /dashboard/wa-notifications
