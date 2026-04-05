import { useEffect, useState, useCallback } from 'react';
import {
    Flag, Loader2, CheckCircle2, Eye, Copy, Check,
    AlertTriangle, RefreshCw, ChevronDown, ChevronUp,
    MessageSquare, X,
} from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase';

type ChatMessage = {
    id: string;
    role: 'patient' | 'ai' | 'system';
    content: string;
    timestamp: number;
    imageUrls?: string[];
};

type DiagnosticData = {
    chatbotVersion?: string;
    pathway?: string;
    specialty?: string;
    chiefComplaint?: string;
    currentNodeIndex?: number;
    progressPercent?: number;
    totalNodes?: number;
    currentSection?: string;
    sectionsVisited?: { step_key: string; label: string; prompt_id: string | null }[];
    gibberishCount?: number;
    protocolFlags?: string[];
    totalMessages?: number;
    timestamp?: string;
};

type ChatReport = {
    id: string;
    patient_id: string;
    session_id: string | null;
    category: string;
    note: string;
    chat_snapshot: ChatMessage[];
    diagnostic_data: DiagnosticData;
    status: 'new' | 'reviewed' | 'resolved';
    admin_note: string | null;
    created_at: string;
    reviewed_at: string | null;
    users?: { nickname?: string; email?: string } | null;
};

const CATEGORY_LABELS: Record<string, string> = {
    wrong_question: '❓ Wrong Question',
    repeated_question: '🔁 Repeated Question',
    inappropriate: '⚠️ Inappropriate',
    stuck_loop: '🔄 Stuck in Loop',
    skipped_section: '⏭️ Skipped Section',
    other: '📝 Other',
};

const STATUS_STYLES: Record<string, string> = {
    new: 'bg-red-500/15 text-red-400 border-red-500/30',
    reviewed: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export default function ChatReportsPanel() {
    const [reports, setReports] = useState<ChatReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [updating, setUpdating] = useState(false);
    const [copied, setCopied] = useState(false);

    const loadReports = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createBrowserSupabase();
            let query = supabase
                .from('chat_reports')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            if (filter !== 'all') {
                query = query.eq('status', filter);
            }
            const { data: rawReports } = await query;
            const reports = (rawReports as ChatReport[]) || [];

            // Batch-fetch user info (no FK on chat_reports.patient_id)
            const patientIds = [...new Set(reports.map(r => r.patient_id).filter(Boolean))];
            if (patientIds.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id, nickname, email')
                    .in('id', patientIds);
                const userMap = new Map((users || []).map(u => [u.id, u]));
                for (const report of reports) {
                    const user = userMap.get(report.patient_id);
                    if (user) report.users = { nickname: user.nickname, email: user.email };
                }
            }

            setReports(reports);
        } catch (err) {
            console.error('Failed to load reports:', err);
        }
        setLoading(false);
    }, [filter]);

    useEffect(() => { loadReports(); }, [loadReports]);

    async function updateReport(id: string, status: string) {
        setUpdating(true);
        try {
            const supabase = createBrowserSupabase();
            await supabase
                .from('chat_reports')
                .update({
                    status,
                    admin_note: adminNote || null,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', id);
            await loadReports();
            setAdminNote('');
        } catch (err) {
            console.error('Failed to update report:', err);
        }
        setUpdating(false);
    }

    function buildClipboardText(report: ChatReport): string {
        const diag = report.diagnostic_data || {};
        const lines: string[] = [
            `═══════════ CHAT REPORT #${report.id.slice(0, 8)} ═══════════`,
            `Date: ${new Date(report.created_at).toLocaleString()}`,
            `Patient: ${report.users?.nickname || 'Unknown'} (${report.users?.email || '—'})`,
            `Category: ${CATEGORY_LABELS[report.category] || report.category}`,
            `Status: ${report.status.toUpperCase()}`,
            `Session: ${report.session_id || '—'}`,
            ``,
            `── Patient Note ──`,
            report.note,
            ``,
            `── Diagnostics ──`,
            `Pathway: ${diag.pathway || '—'}`,
            `Specialty: ${diag.specialty || '—'}`,
            `Chief Complaint: ${diag.chiefComplaint || '—'}`,
            `Progress: ${diag.progressPercent ?? 0}%`,
            `Current Section: ${diag.currentSection || '—'}`,
            `Sections Visited: ${diag.sectionsVisited?.map(s => s.step_key).join(' → ') || '—'}`,
            `Gibberish Count: ${diag.gibberishCount ?? 0}`,
            `Protocol Flags: ${diag.protocolFlags?.join(', ') || 'none'}`,
            `Total Messages: ${diag.totalMessages ?? 0}`,
            `Total Nodes: ${diag.totalNodes ?? 0}`,
            `Timestamp: ${diag.timestamp || '—'}`,
            ``,
            `── Chat Flow (${report.chat_snapshot?.length || 0} messages) ──`,
        ];

        for (const msg of (report.chat_snapshot || [])) {
            const time = new Date(msg.timestamp).toLocaleTimeString();
            const role = msg.role === 'patient' ? '🧑 Patient' : msg.role === 'ai' ? '🤖 AI' : '⚙️ System';
            lines.push(`[${time}] ${role}: ${msg.content}`);
            if (msg.imageUrls?.length) {
                lines.push(`  📸 ${msg.imageUrls.length} photo(s) attached`);
            }
        }

        if (report.admin_note) {
            lines.push('', `── Admin Note ──`, report.admin_note);
        }

        lines.push('', `═══════════ END OF REPORT ═══════════`);
        return lines.join('\n');
    }

    async function copyReport(report: ChatReport) {
        const text = buildClipboardText(report);
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const newCount = reports.filter(r => r.status === 'new').length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                        <Flag className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-text-primary">
                            Patient Reports
                            {newCount > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                    {newCount}
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-text-muted">AI chat issues reported by patients</p>
                    </div>
                </div>
                <button
                    onClick={loadReports}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-text-secondary hover:bg-bg-elevated transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-bg-elevated rounded-xl border border-border">
                {['all', 'new', 'reviewed', 'resolved'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            filter === f
                                ? 'bg-accent text-bg-primary'
                                : 'text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        {f === 'new' && newCount > 0 && (
                            <span className="ml-1 text-[10px] font-bold">({newCount})</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-accent" />
                </div>
            )}

            {/* Empty State */}
            {!loading && reports.length === 0 && (
                <div className="text-center py-12">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm text-text-muted">No reports found</p>
                </div>
            )}

            {/* Report Cards */}
            {!loading && reports.map(report => {
                const isExpanded = expandedId === report.id;
                const diag = report.diagnostic_data || {};

                return (
                    <div
                        key={report.id}
                        className="glass rounded-2xl border border-border overflow-hidden transition-all"
                    >
                        {/* Summary Row */}
                        <button
                            onClick={() => {
                                setExpandedId(isExpanded ? null : report.id);
                                if (!isExpanded) setAdminNote(report.admin_note || '');
                            }}
                            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-bg-elevated/50 transition-colors"
                        >
                            <div className="flex-shrink-0">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-sm font-semibold text-text-primary truncate">
                                        {report.users?.nickname || 'Patient'}
                                    </span>
                                    <span className="text-[10px] text-text-muted">
                                        {new Date(report.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-text-secondary">
                                        {CATEGORY_LABELS[report.category] || report.category}
                                    </span>
                                    <span className="text-[10px] text-text-muted truncate max-w-[200px]">
                                        — {report.note.slice(0, 60)}{report.note.length > 60 ? '…' : ''}
                                    </span>
                                </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${STATUS_STYLES[report.status]}`}>
                                {report.status.toUpperCase()}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                        </button>

                        {/* Expanded Detail */}
                        {isExpanded && (
                            <div className="border-t border-border px-5 py-4 space-y-4 animate-fade-in">

                                {/* Patient Note */}
                                <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Patient Note</p>
                                    <p className="text-sm text-text-primary leading-relaxed">{report.note}</p>
                                </div>

                                {/* Diagnostics Grid */}
                                <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">Diagnostics</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Pathway', value: diag.pathway || '—' },
                                            { label: 'Specialty', value: diag.specialty || '—' },
                                            { label: 'Chief Complaint', value: diag.chiefComplaint || '—' },
                                            { label: 'Progress', value: `${diag.progressPercent ?? 0}%` },
                                            { label: 'Current Section', value: diag.currentSection || '—' },
                                            { label: 'Total Messages', value: String(diag.totalMessages ?? 0) },
                                            { label: 'Gibberish Count', value: String(diag.gibberishCount ?? 0) },
                                            { label: 'Protocol Flags', value: diag.protocolFlags?.join(', ') || 'none' },
                                        ].map(item => (
                                            <div key={item.label} className="p-2 rounded-lg bg-bg-primary">
                                                <p className="text-[9px] text-text-muted uppercase font-semibold mb-0.5">{item.label}</p>
                                                <p className="text-xs text-text-primary font-medium truncate">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {diag.sectionsVisited && diag.sectionsVisited.length > 0 && (
                                        <div className="mt-3 p-2 rounded-lg bg-bg-primary">
                                            <p className="text-[9px] text-text-muted uppercase font-semibold mb-1">Sections Visited</p>
                                            <div className="flex flex-wrap gap-1">
                                                {diag.sectionsVisited.map((s, i) => (
                                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">
                                                        {s.label || s.step_key}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Chat Replay */}
                                <div className="bg-bg-elevated rounded-xl border border-border">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="w-3.5 h-3.5 text-accent" />
                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                                Chat Flow ({report.chat_snapshot?.length || 0} messages)
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => copyReport(report)}
                                            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold rounded-lg border border-border text-text-secondary hover:bg-bg-tertiary transition-colors"
                                        >
                                            {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                                            {copied ? 'Copied!' : 'Copy Report'}
                                        </button>
                                    </div>
                                    <div className="max-h-[500px] overflow-y-auto p-4 space-y-2">
                                        {(report.chat_snapshot || []).map((msg, idx) => {
                                            const isPatient = msg.role === 'patient';
                                            const isSystem = msg.role === 'system';
                                            const time = new Date(msg.timestamp).toLocaleTimeString();

                                            if (isSystem) {
                                                return (
                                                    <div key={idx} className="text-center py-1">
                                                        <span className="text-[10px] px-3 py-1 rounded-full bg-bg-tertiary text-text-muted">
                                                            {msg.content}
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={idx} className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                                                        isPatient
                                                            ? 'bg-accent/15 border border-accent/20'
                                                            : 'bg-bg-tertiary border border-border'
                                                    }`}>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-[9px] font-bold text-text-muted uppercase">
                                                                {isPatient ? '🧑 Patient' : '🤖 AI'}
                                                            </span>
                                                            <span className="text-[9px] text-text-muted">{time}</span>
                                                        </div>
                                                        <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                                                            {msg.content}
                                                        </p>
                                                        {msg.imageUrls && msg.imageUrls.length > 0 && (
                                                            <p className="text-[10px] text-accent mt-1">📸 {msg.imageUrls.length} photo(s)</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Admin Actions */}
                                <div className="bg-bg-elevated rounded-xl p-4 border border-border space-y-3">
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Admin Actions</p>
                                    <textarea
                                        value={adminNote}
                                        onChange={e => setAdminNote(e.target.value)}
                                        placeholder="Add admin note (optional)..."
                                        className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted resize-none"
                                        rows={2}
                                    />
                                    <div className="flex items-center gap-2">
                                        {report.status !== 'reviewed' && (
                                            <button
                                                onClick={() => updateReport(report.id, 'reviewed')}
                                                disabled={updating}
                                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
                                            >
                                                {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                                Mark Reviewed
                                            </button>
                                        )}
                                        {report.status !== 'resolved' && (
                                            <button
                                                onClick={() => updateReport(report.id, 'resolved')}
                                                disabled={updating}
                                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                                            >
                                                {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                Mark Resolved
                                            </button>
                                        )}
                                    </div>
                                    {report.admin_note && report.admin_note !== adminNote && (
                                        <div className="p-2 rounded-lg bg-bg-primary border border-border">
                                            <p className="text-[9px] text-text-muted uppercase font-semibold mb-0.5">Previous Admin Note</p>
                                            <p className="text-xs text-text-secondary">{report.admin_note}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
