'use client';

import { useState, useEffect } from 'react';
import {
    X, Clock, AlertTriangle, CheckCircle2, Archive, Trash2,
    FileDown, Download, User, Stethoscope, FileText, Activity,
    Shield, Zap, Calendar, Timer, Loader2, ChevronDown, UserPlus
} from 'lucide-react';
import { downloadAdminPdf } from '@/lib/generateAdminPdf';
import StatusBadge from './StatusBadge';
import { PriorityBadge } from './StatusBadge';
import { doArchiveConsultation, doPurgeConsultation, doAssignDoctor, fetchDoctors } from '@/lib/actions';

// ── Types ────────────────────────────────────

export type ConsultationFull = {
    id: string;
    patient_id: string;
    doctor_id: string | null;
    specialty: string;
    status: string;
    priority: 'routine' | 'high' | 'urgent';
    chief_complaint: string | null;
    ai_summary: Record<string, unknown> | null;
    ai_entities: Record<string, unknown> | null;
    token_cost: number;
    urgent_fee: number;
    report: Record<string, unknown> | null;
    prescription: Record<string, unknown> | null;
    protocol_flags: string[];
    deadline_at: string | null;
    concluded_at: string | null;
    archived_at: string | null;
    archived_by: string | null;
    purged_at: string | null;
    purged_by: string | null;
    pdf_url: string | null;
    created_at: string;
    assigned_at: string | null;
    completed_at: string | null;
    patient_name: string;
    doctor_name: string | null;
    patient?: { id?: string; nickname?: string; email?: string; phone?: string; avatar_url?: string } | null;
    doctor?: { id?: string; display_name?: string; specialty?: string; avatar_url?: string } | null;
};

type Props = {
    consultation: ConsultationFull;
    onClose: () => void;
    onUpdated: () => void;
    adminUserId?: string;
};

// ── Helpers ──────────────────────────────────

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

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function getDeadlineInfo(deadlineAt: string | null, status: string) {
    if (!deadlineAt) return null;
    const deadline = new Date(deadlineAt);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (['completed', 'report_ready', 'cancelled'].includes(status)) {
        return { label: formatDate(deadlineAt), isOverdue: false, color: 'text-text-muted' };
    }

    if (diffMin < 0) {
        const overdueMins = Math.abs(diffMin);
        const hours = Math.floor(overdueMins / 60);
        const mins = overdueMins % 60;
        return {
            label: `Overdue by ${hours > 0 ? `${hours}h ` : ''}${mins}m`,
            isOverdue: true,
            color: 'text-error',
        };
    }

    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return {
        label: `${hours > 0 ? `${hours}h ` : ''}${mins}m remaining`,
        isOverdue: false,
        color: diffMin < 10 ? 'text-warning' : 'text-success',
    };
}

// ── Component ────────────────────────────────

export default function ConsultationDetailPanel({ consultation: c, onClose, onUpdated, adminUserId }: Props) {
    const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [purging, setPurging] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>('details');
    const [hasPrinted, setHasPrinted] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [confirmIrreversible, setConfirmIrreversible] = useState(false);

    const st = statusMap[c.status] ?? { label: c.status, variant: 'neutral' as const };
    const deadlineInfo = getDeadlineInfo(c.deadline_at, c.status);
    const isPurged = !!c.purged_at;
    const isArchived = !!c.archived_at;
    const isConcluded = !!c.concluded_at || c.status === 'completed' || c.status === 'report_ready';

    // Doctor assignment state
    const [showAssignDropdown, setShowAssignDropdown] = useState(false);
    const [doctorList, setDoctorList] = useState<{ id: string; display_name: string; specialty: string }[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [assigning, setAssigning] = useState(false);

    async function loadDoctors() {
        setLoadingDoctors(true);
        try {
            const { data } = await fetchDoctors(1, 100);
            setDoctorList((data || []).map((d: any) => ({ id: d.id, display_name: d.display_name || d.full_name, specialty: d.specialty })));
        } catch (e) {
            console.error('Failed to load doctors', e);
        }
        setLoadingDoctors(false);
    }

    function handleOpenAssign() {
        setShowAssignDropdown(true);
        if (doctorList.length === 0) loadDoctors();
    }

    async function handleAssign(doctorId: string) {
        setAssigning(true);
        await doAssignDoctor(c.id, doctorId);
        setAssigning(false);
        setShowAssignDropdown(false);
        onUpdated();
    }

    async function handleArchive() {
        if (!adminUserId) return;
        setArchiving(true);
        await doArchiveConsultation(c.id, adminUserId);
        setArchiving(false);
        onUpdated();
    }

    async function handlePurge() {
        if (!adminUserId) return;
        setPurging(true);
        await doPurgeConsultation(c.id, adminUserId);
        setPurging(false);
        setShowPurgeConfirm(false);
        onUpdated();
    }

    async function handleDownloadPDF() {
        setGeneratingPdf(true);
        try {
            await downloadAdminPdf(c as any);
            setHasPrinted(true);
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF. Please try again.');
        }
        setGeneratingPdf(false);
    }

    function SectionToggle({ title, icon: Icon, sectionKey }: { title: string; icon: React.ElementType; sectionKey: string }) {
        const isOpen = activeSection === sectionKey;
        return (
            <button
                onClick={() => setActiveSection(isOpen ? null : sectionKey)}
                className="flex items-center justify-between w-full py-3 text-sm font-semibold text-text-primary hover:text-accent transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-accent" />
                    {title}
                </div>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

            {/* Panel */}
            <div className="fixed top-0 right-0 h-full w-full max-w-[600px] bg-bg-primary border-l border-border z-50 flex flex-col animate-slide-in overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-border flex items-start justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-lg font-bold text-text-primary">
                                Case {c.id.slice(0, 8)}…
                            </h2>
                            <StatusBadge label={st.label} variant={st.variant} pulse={c.status === 'in_progress'} />
                            <PriorityBadge priority={c.priority} />
                        </div>
                        <p className="text-sm text-text-muted">{c.specialty?.replace('_', ' ')} consultation</p>
                        {c.urgent_fee > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                                <Zap className="w-3.5 h-3.5 text-warning" />
                                <span className="text-xs text-warning font-semibold">Urgent (+{c.urgent_fee} tokens)</span>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-elevated transition-colors">
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                    {/* Deadline Banner */}
                    {deadlineInfo && (
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${deadlineInfo.isOverdue
                            ? 'bg-error/10 border-error/30'
                            : 'bg-bg-elevated border-border'
                            }`}>
                            <Timer className={`w-5 h-5 ${deadlineInfo.color}`} />
                            <div>
                                <p className={`text-sm font-semibold ${deadlineInfo.color}`}>
                                    {deadlineInfo.label}
                                </p>
                                <p className="text-xs text-text-muted">
                                    Deadline: {formatDate(c.deadline_at)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Archive/Purge Status */}
                    {isPurged && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error/10 border border-error/30">
                            <Trash2 className="w-4 h-4 text-error" />
                            <span className="text-sm text-error font-medium">Cloud data purged — {formatDate(c.purged_at)}</span>
                        </div>
                    )}
                    {isArchived && !isPurged && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/10 border border-accent/30">
                            <Archive className="w-4 h-4 text-accent" />
                            <span className="text-sm text-accent font-medium">Archived — {formatDate(c.archived_at)}</span>
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                        <h3 className="text-xs font-semibold uppercase text-text-muted mb-3 tracking-wider">Timeline</h3>
                        <div className="space-y-2">
                            {[
                                { label: 'Created', date: c.created_at, icon: Calendar, always: true },
                                { label: 'Assigned', date: c.assigned_at, icon: User },
                                { label: 'Deadline', date: c.deadline_at, icon: Timer },
                                { label: 'Concluded', date: c.concluded_at, icon: CheckCircle2 },
                                { label: 'Completed', date: c.completed_at, icon: CheckCircle2 },
                                { label: 'Archived', date: c.archived_at, icon: Archive },
                                { label: 'Purged', date: c.purged_at, icon: Trash2 },
                            ].filter(e => e.always || e.date).map((event, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <event.icon className={`w-4 h-4 shrink-0 ${event.date ? 'text-accent' : 'text-text-muted/30'}`} />
                                    <span className="text-text-secondary w-20 shrink-0">{event.label}</span>
                                    <span className={`font-medium ${event.date ? 'text-text-primary' : 'text-text-muted/30'}`}>
                                        {formatDate(event.date ?? null)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* People */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-accent" />
                                <span className="text-xs font-semibold uppercase text-text-muted">Patient</span>
                            </div>
                            <p className="text-sm font-semibold text-text-primary">{c.patient_name}</p>
                        </div>
                        <div className="bg-bg-elevated rounded-xl p-4 border border-border relative">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-accent" />
                                    <span className="text-xs font-semibold uppercase text-text-muted">Doctor</span>
                                </div>
                                {!isPurged && (
                                    <button
                                        onClick={handleOpenAssign}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-accent hover:bg-accent-faded transition-colors"
                                    >
                                        <UserPlus className="w-3 h-3" />
                                        {c.doctor_name ? 'Reassign' : 'Assign'}
                                    </button>
                                )}
                            </div>
                            <p className={`text-sm font-semibold ${c.doctor_name ? 'text-text-primary' : 'text-text-muted italic'}`}>
                                {c.doctor_name ?? 'Unassigned'}
                            </p>

                            {/* Assign Dropdown */}
                            {showAssignDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-bg-primary border border-border rounded-xl shadow-2xl p-3 max-h-[240px] overflow-y-auto">
                                    <p className="text-xs font-semibold text-text-muted mb-2 uppercase">Select Doctor</p>
                                    {loadingDoctors ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                                        </div>
                                    ) : doctorList.length === 0 ? (
                                        <p className="text-xs text-text-muted py-2">No doctors available</p>
                                    ) : (
                                        doctorList.map(doc => (
                                            <button
                                                key={doc.id}
                                                disabled={assigning}
                                                onClick={() => handleAssign(doc.id)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent-faded transition-colors flex items-center justify-between ${c.doctor_id === doc.id ? 'bg-accent/10 text-accent font-semibold' : 'text-text-primary'
                                                    } disabled:opacity-50`}
                                            >
                                                <span>{doc.display_name}</span>
                                                <span className="text-[10px] text-text-muted">{doc.specialty?.replace('_', ' ')}</span>
                                            </button>
                                        ))
                                    )}
                                    <button
                                        onClick={() => setShowAssignDropdown(false)}
                                        className="w-full mt-2 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:bg-bg-elevated transition-colors text-center border border-border"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details Section */}
                    {!isPurged && (
                        <div className="border-t border-border">
                            <SectionToggle title="Details" icon={FileText} sectionKey="details" />
                            {activeSection === 'details' && (
                                <div className="space-y-3 pb-3">
                                    <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                                        <p className="text-xs text-text-muted mb-1">Chief Complaint</p>
                                        <p className="text-sm text-text-primary">{c.chief_complaint || '—'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-bg-elevated rounded-xl p-3 border border-border">
                                            <p className="text-xs text-text-muted">Token Cost</p>
                                            <p className="text-lg font-bold text-accent">{c.token_cost}</p>
                                        </div>
                                        {c.urgent_fee > 0 && (
                                            <div className="bg-bg-elevated rounded-xl p-3 border border-border">
                                                <p className="text-xs text-text-muted">Urgent Fee</p>
                                                <p className="text-lg font-bold text-warning">+{c.urgent_fee}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Report Section */}
                    {!isPurged && c.report && (
                        <div className="border-t border-border">
                            <SectionToggle title="Medical Report" icon={Activity} sectionKey="report" />
                            {activeSection === 'report' && (
                                <div className="bg-bg-elevated rounded-xl p-4 border border-border mb-3">
                                    <pre className="text-xs text-text-secondary whitespace-pre-wrap overflow-x-auto max-h-[300px] overflow-y-auto">
                                        {JSON.stringify(c.report, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Protocol Flags */}
                    {c.protocol_flags && c.protocol_flags.length > 0 && (
                        <div className="border-t border-border">
                            <SectionToggle title="Protocol Flags" icon={Shield} sectionKey="protocols" />
                            {activeSection === 'protocols' && (
                                <div className="flex flex-wrap gap-2 pb-3">
                                    {c.protocol_flags.map((flag, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-error/10 text-error text-xs font-semibold border border-error/20">
                                            Protocol {flag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-border shrink-0 space-y-3">
                    {/* Print & Download */}
                    {isConcluded && !isPurged && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleDownloadPDF}
                                disabled={generatingPdf}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all disabled:opacity-50"
                            >
                                {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                Download PDF
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={generatingPdf}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-accent hover:bg-accent-faded transition-colors disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Archive */}
                    {isConcluded && !isArchived && !isPurged && (
                        <button
                            onClick={handleArchive}
                            disabled={archiving}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-accent/30 text-sm text-accent font-medium hover:bg-accent-faded transition-colors disabled:opacity-50"
                        >
                            {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                            Mark as Archived (PDF Stored Offline)
                        </button>
                    )}

                    {/* Purge */}
                    {isArchived && !isPurged && (
                        <button
                            onClick={() => setShowPurgeConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-error/30 text-sm text-error font-medium hover:bg-error/10 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Purge Cloud Data
                        </button>
                    )}
                </div>
            </div>

            {/* Purge Confirmation Modal — Print-Before-Purge Enforcement */}
            {showPurgeConfirm && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[60]" onClick={() => { setShowPurgeConfirm(false); setConfirmIrreversible(false); }} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md bg-bg-primary border border-border rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-error" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary">Purge Cloud Data</h3>
                                <p className="text-xs text-text-muted">Case {c.id.slice(0, 8)} — Zero Retention Policy</p>
                            </div>
                        </div>

                        <div className="bg-error/5 border border-error/20 rounded-xl p-4 mb-4">
                            <p className="text-sm text-text-secondary">
                                This will <strong className="text-error">permanently delete</strong> all cloud data for this consultation:
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-text-muted">
                                <li>• All chat messages</li>
                                <li>• AI intake sessions</li>
                                <li>• Protocol logs</li>
                                <li>• Medical report & prescription data</li>
                            </ul>
                        </div>

                        {/* Print First Button */}
                        <button
                            onClick={handleDownloadPDF}
                            disabled={generatingPdf}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-bg-primary text-sm font-bold mb-4 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all disabled:opacity-50"
                        >
                            {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                            {hasPrinted ? '✅ Downloaded — Download Again' : '📥 Download PDF First'}
                        </button>

                        {/* Enforcement Checkboxes */}
                        <div className="space-y-3 mb-4 border-t border-border pt-4">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={hasPrinted}
                                    disabled
                                    className="mt-0.5 w-4 h-4 rounded border-border accent-accent cursor-pointer"
                                />
                                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                                    I confirm I have <strong className="text-text-primary">downloaded/printed a hard copy</strong> of this consultation record
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={confirmIrreversible}
                                    onChange={e => setConfirmIrreversible(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-border accent-error cursor-pointer"
                                />
                                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                                    I understand this action is <strong className="text-error">irreversible</strong> and all cloud data will be permanently deleted
                                </span>
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowPurgeConfirm(false); setConfirmIrreversible(false); }}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePurge}
                                disabled={purging || !hasPrinted || !confirmIrreversible}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-error text-white text-sm font-semibold hover:bg-error/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {purging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Purge Forever
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
