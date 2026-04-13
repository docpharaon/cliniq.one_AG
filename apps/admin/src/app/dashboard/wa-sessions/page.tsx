import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import {
    MessageCircle, Activity, Clock, User, Globe, Stethoscope,
    RotateCcw, FileText, Search, RefreshCw, Loader2, Eye,
    ExternalLink, AlertTriangle, CheckCircle2, XCircle, Timer,
    MessageSquare,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
    fetchWaChatSessions,
    fetchWaChatSessionStats,
    fetchWaChatSessionDetail,
    doExpireWaChatSessions,
    fetchDoctors,
} from '@/lib/actions';

export default function WaChatSessionsPage() {
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, expired: 0, awaiting: 0, abandoned: 0 });
    const [doctors, setDoctors] = useState<any[]>([]);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Detail View
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const s = await fetchWaChatSessionStats();
            setStats(s);
        } catch (e) { console.error(e); }
        setStatsLoading(false);
    }, []);

    const loadSessions = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchWaChatSessions({
                status: statusFilter || undefined,
                doctorId: doctorFilter || undefined,
                search: searchTerm || undefined,
            });
            setSessions(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [statusFilter, doctorFilter, searchTerm]);

    const loadDoctors = useCallback(async () => {
        try {
            const data = await fetchDoctors(1, 100);
            if (Array.isArray(data)) setDoctors(data);
            else if ((data as any)?.data) setDoctors((data as any).data);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        loadStats();
        loadDoctors();
    }, [loadStats, loadDoctors]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const handleViewDetail = async (id: string) => {
        setDetailLoading(true);
        setSelectedSession({ id }); // Show placeholder/loader in panel
        try {
            const detail = await fetchWaChatSessionDetail(id);
            setSelectedSession(detail);
        } catch (e) { 
            console.error(e);
            setSelectedSession(null);
        }
        setDetailLoading(false);
    };

    const handleExpireAll = async () => {
        if (!confirm('This will move all "active" sessions with expired timers (24h+) to "expired" status. Proceed?')) return;
        const res = await doExpireWaChatSessions();
        alert(`Expired ${res.count} sessions.`);
        loadStats();
        loadSessions();
    };

    const fmtDate = (d: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getPathwayLabel = (p: string) => {
        if (!p) return '—';
        return p.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="space-y-6">
            <Header
                title="WA Chat Sessions"
                subtitle="Monitor real-time WhatsApp chatbot interactions and patient intake"
                icon={MessageCircle}
                actions={
                    <button
                        onClick={handleExpireAll}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-sm font-medium"
                    >
                        <Timer className="w-4 h-4" /> Run Expiry Maintenance
                    </button>
                }
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard label="Total Sessions" value={stats.total} icon={MessageSquare} />
                <StatCard label="Active" value={stats.active} icon={Activity} color="#10b981" />
                <StatCard label="Awaiting Code" value={stats.awaiting} icon={Clock} color="#f59e0b" />
                <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="#6366f1" />
                <StatCard label="Expired" value={stats.expired} icon={Timer} color="#ef4444" />
                <StatCard label="Abandoned" value={stats.abandoned} icon={XCircle} color="#6b7280" />
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                    <div className="relative min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Phone or patient name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-sm focus:ring-2 focus:ring-[var(--accent-color)] outline-none"
                        />
                    </div>
                    
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent-color)] min-w-[140px]"
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="awaiting_doctor_code">Awaiting Code</option>
                        <option value="intake_complete">Intake Complete</option>
                        <option value="consultation_created">Consultation Created</option>
                        <option value="expired">Expired</option>
                        <option value="abandoned">Abandoned</option>
                    </select>

                    <select
                        value={doctorFilter}
                        onChange={(e) => setDoctorFilter(e.target.value)}
                        className="px-3 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent-color)] max-w-[200px]"
                    >
                        <option value="">All Doctors</option>
                        {doctors.map(d => (
                            <option key={d.id} value={d.id}>{d.display_name}</option>
                        ))}
                    </select>

                    <button 
                        onClick={() => { loadSessions(); loadStats(); }}
                        className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[var(--hover-bg)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-medium">
                                <th className="text-left px-6 py-4">Session Info</th>
                                <th className="text-left px-6 py-4">Context</th>
                                <th className="text-left px-6 py-4">Status</th>
                                <th className="text-left px-6 py-4">Activity</th>
                                <th className="text-right px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading && sessions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--accent-color)] mb-2" />
                                        <p className="text-[var(--text-muted)]">Loading sessions...</p>
                                    </td>
                                </tr>
                            ) : sessions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                        No chat sessions found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                sessions.map(session => (
                                    <tr key={session.id} className="hover:bg-[var(--hover-bg)] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-[var(--text-primary)]">
                                                        {session.patient_name || 'Anonymous'}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                                        <Globe className="w-3 h-3" /> {(session.language || 'en').toUpperCase()} • {session.phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
                                                    <Stethoscope className="w-3 h-3 text-accent" />
                                                    {session.doctor_name || session.doctor_code || 'Unassigned'}
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)]">
                                                    Pathway: <span className="text-[var(--text-secondary)]">{getPathwayLabel(session.pathway)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={session.status} />
                                            <div className="text-[10px] text-[var(--text-muted)] mt-1 ml-1 capitalize">
                                                Step: {session.current_step?.replace(/_/g, ' ') || 'init'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                                    <Clock className="w-3 h-3" />
                                                    {fmtDate(session.last_message_at)}
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)]">
                                                    Turns: <span className="font-medium">{session.turn_count || 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleViewDetail(session.id)}
                                                className="p-2 rounded-lg bg-[var(--hover-bg)] border border-[var(--border-color)] hover:border-accent hover:text-accent transition-all"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Slide-out Panel Overlay */}
            {selectedSession && (
                <div 
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
                    onClick={() => setSelectedSession(null)}
                >
                    <div 
                        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-[var(--color-bg-primary)] shadow-2xl flex flex-col transform transition-transform"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-color)]">
                            <div>
                                <h3 className="text-lg font-bold">Session Details</h3>
                                <p className="text-xs text-[var(--text-muted)]">ID: {selectedSession.id}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedSession(null)}
                                className="p-2 rounded-xl hover:bg-[var(--hover-bg)] transition-colors"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                                <Loader2 className="w-10 h-10 animate-spin text-accent" />
                                <p className="text-[var(--text-muted)] font-medium">Fetching conversation log...</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {/* Top Info Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-[var(--hover-bg)] border border-[var(--border-color)]">
                                        <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Patient</div>
                                        <div className="font-bold text-lg">{selectedSession.patient_name || 'Anonymous'}</div>
                                        <div className="text-sm text-accent">{selectedSession.phone}</div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-[var(--hover-bg)] border border-[var(--border-color)]">
                                        <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Service Context</div>
                                        <div className="font-bold">{getPathwayLabel(selectedSession.pathway)}</div>
                                        <div className="text-sm text-[var(--text-muted)]">{selectedSession.doctor?.display_name || 'No doctor assigned'}</div>
                                    </div>
                                </div>

                                {/* Flow Progress */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-accent" /> Session Timeline
                                    </h4>
                                    <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[var(--border-color)]">
                                        <div className="relative pl-8">
                                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-[var(--card-bg)] border-2 border-accent flex items-center justify-center z-10">
                                                <div className="w-2 h-2 rounded-full bg-accent"></div>
                                            </div>
                                            <div className="text-xs font-bold">Session Created</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">{fmtDate(selectedSession.created_at)}</div>
                                        </div>
                                        <div className="relative pl-8">
                                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-[var(--card-bg)] border-2 border-[var(--border-color)] flex items-center justify-center z-10">
                                                <MessageSquare className="w-3 h-3 text-[var(--text-muted)]" />
                                            </div>
                                            <div className="text-xs font-bold">Last Chat Interaction</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">{fmtDate(selectedSession.last_message_at)}</div>
                                        </div>
                                        {selectedSession.completed_at && (
                                            <div className="relative pl-8">
                                                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center z-10">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                </div>
                                                <div className="text-xs font-bold">Intake Completed</div>
                                                <div className="text-[10px] text-[var(--text-muted)]">{fmtDate(selectedSession.completed_at)}</div>
                                            </div>
                                        )}
                                        {selectedSession.status === 'expired' && (
                                            <div className="relative pl-8">
                                                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center z-10">
                                                    <Clock className="w-3.5 h-3.5 text-white" />
                                                </div>
                                                <div className="text-xs font-bold">Session Expired</div>
                                                <div className="text-[10px] text-[var(--text-muted)]">Automatically closed after 24h</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Intake Data (If available) */}
                                {selectedSession.intake_report && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-accent" /> AI Intake Summary
                                        </h4>
                                        <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                                            {selectedSession.intake_report}
                                        </div>
                                    </div>
                                )}

                                {/* Links */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold">Connected Records</h4>
                                    <div className="flex flex-col gap-2">
                                        {selectedSession.consultation_id ? (
                                            <a 
                                                href={`/dashboard/consultations/${selectedSession.consultation_id}`}
                                                className="flex items-center justify-between p-4 rounded-2xl bg-accent/5 border border-accent/20 hover:bg-accent/10 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-5 h-5 text-accent" />
                                                    <div>
                                                        <div className="text-sm font-bold">Linked Consultation</div>
                                                        <div className="text-[10px] text-accent/60">View medical report and messages</div>
                                                    </div>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        ) : (
                                            <div className="p-4 rounded-2xl bg-[var(--hover-bg)] border border-[var(--border-color)] border-dashed text-center text-xs text-[var(--text-muted)]">
                                                No consultation linked yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Panel Footer */}
                        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--hover-bg)]">
                            <button 
                                onClick={() => setSelectedSession(null)}
                                className="w-full py-3 rounded-xl bg-[var(--text-primary)] text-[var(--color-bg-primary)] font-bold hover:opacity-90 transition-opacity"
                            >
                                Close Detail View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
