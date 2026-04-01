import Header from '@/components/Header';
import {
    Shield,
    ShieldOff,
    ShieldCheck,
    AlertTriangle,
    Clock,
    Eye,
    EyeOff,
    Megaphone,
    VolumeX,
    RefreshCw,
    X,
    ChevronDown,
    ChevronRight,
    History,
    MessageSquareWarning,
    CheckCircle2,
    XCircle,
    FileText,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
    fetchActiveSpecialtyOverrides,
    fetchSpecialtyOverrideHistory,
    doDisableSpecialty,
    doRestoreSpecialty,
    fetchSpecialtyIncidents,
    doUpdateSpecialtyIncident,
    fetchOpenSpecialtyIncidentCount,
} from '@/lib/actions';
import { useAdminAuth } from '@/components/AdminAuthProvider';

// ── Specialty Metadata ────────────────────────────
const SPECIALTIES: { key: string; name: string; nameAr: string; icon: string; color: string; gradient: string; locked?: boolean }[] = [
    { key: 'dermatology', name: 'Dermatology', nameAr: 'الأمراض الجلدية', icon: '🧴', color: '#F472B6', gradient: 'from-pink-500 to-rose-400' },
    { key: 'family_medicine', name: 'Family Medicine', nameAr: 'طب الأسرة', icon: '🏥', color: '#2DD4BF', gradient: 'from-teal-500 to-cyan-400', locked: true },
    { key: 'pediatrics', name: 'Pediatrics', nameAr: 'طب الأطفال', icon: '👶', color: '#60A5FA', gradient: 'from-blue-500 to-sky-400' },
    { key: 'psychiatry', name: 'Psychiatry', nameAr: 'الطب النفسي', icon: '🧠', color: '#A78BFA', gradient: 'from-violet-500 to-purple-400' },
    { key: 'orthopedics', name: 'Orthopedics', nameAr: 'جراحة العظام', icon: '🦴', color: '#FB923C', gradient: 'from-orange-500 to-amber-400' },
    { key: 'diet', name: 'Diet & Nutrition', nameAr: 'التغذية', icon: '🥗', color: '#34D399', gradient: 'from-emerald-500 to-green-400' },
];

const REASON_OPTIONS = [
    { value: 'doctor_unavailable', label: 'Doctor Unavailable', icon: '👨‍⚕️' },
    { value: 'scheduling_conflict', label: 'Scheduling Conflict', icon: '📅' },
    { value: 'system_maintenance', label: 'System Maintenance', icon: '🔧' },
    { value: 'quality_review', label: 'Quality Review', icon: '🔍' },
    { value: 'regulatory', label: 'Regulatory Requirement', icon: '⚖️' },
    { value: 'staffing_shortage', label: 'Staffing Shortage', icon: '👥' },
    { value: 'other', label: 'Other', icon: '📝' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Override = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Incident = Record<string, any>;

export default function SpecialtiesPage() {
    const { user: adminUser } = useAdminAuth();
    const adminId = adminUser?.id ?? '';
    const [overrides, setOverrides] = useState<Override[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [history, setHistory] = useState<Override[]>([]);
    const [openIncidentCount, setOpenIncidentCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Disable modal
    const [showDisableModal, setShowDisableModal] = useState(false);
    const [disableTarget, setDisableTarget] = useState<typeof SPECIALTIES[number] | null>(null);
    const [disableMode, setDisableMode] = useState<'silent' | 'announced'>('silent');
    const [disableReason, setDisableReason] = useState('doctor_unavailable');
    const [disableText, setDisableText] = useState('');
    const [disablePatientMsg, setDisablePatientMsg] = useState('');
    const [disableLoading, setDisableLoading] = useState(false);

    // Tabs
    const [activeTab, setActiveTab] = useState<'status' | 'incidents' | 'history'>('status');

    // Incident detail
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [incidentNotes, setIncidentNotes] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        const [ovr, inc, hist, cnt] = await Promise.all([
            fetchActiveSpecialtyOverrides(),
            fetchSpecialtyIncidents({ limit: 50 }),
            fetchSpecialtyOverrideHistory(),
            fetchOpenSpecialtyIncidentCount(),
        ]);
        setOverrides(ovr);
        setIncidents(inc);
        setHistory(hist);
        setOpenIncidentCount(cnt);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Which specialties are currently disabled
    const disabledMap = new Map<string, Override>();
    overrides.forEach(o => disabledMap.set(o.specialty, o));

    // ── Disable Handler ──────────────────────
    const handleDisable = async () => {
        if (!disableTarget || !disableText.trim()) return;
        setDisableLoading(true);
        // Use a placeholder admin ID — in production this comes from auth session
        const res = await doDisableSpecialty({
            specialty: disableTarget.key,
            mode: disableMode,
            reasonCode: disableReason,
            reasonText: disableText.trim(),
            patientMessage: disablePatientMsg.trim() || undefined,
            adminUserId: adminId,
        });
        setDisableLoading(false);
        if (res.error) {
            alert(res.error);
        } else {
            setShowDisableModal(false);
            setDisableText('');
            setDisablePatientMsg('');
            loadData();
        }
    };

    // ── Restore Handler ──────────────────────
    const handleRestore = async (override: Override) => {
        if (!confirm(`Are you sure you want to re-enable ${override.specialty.replace(/_/g, ' ')}?`)) return;
        const res = await doRestoreSpecialty(
            override.id,
            adminId,
        );
        if (res.error) {
            alert(res.error);
        } else {
            loadData();
        }
    };

    // ── Incident Handlers ────────────────────
    const handleAcknowledge = async (incidentId: string) => {
        await doUpdateSpecialtyIncident(incidentId, { status: 'acknowledged' });
        loadData();
    };

    const handleResolveIncident = async (incidentId: string) => {
        await doUpdateSpecialtyIncident(incidentId, {
            status: 'resolved',
            admin_notes: incidentNotes || undefined,
            resolved_by: adminId,
        });
        setSelectedIncident(null);
        setIncidentNotes('');
        loadData();
    };

    const openDisableModal = (spec: typeof SPECIALTIES[number]) => {
        setDisableTarget(spec);
        setDisableMode('silent');
        setDisableReason('doctor_unavailable');
        setDisableText('');
        setDisablePatientMsg('');
        setShowDisableModal(true);
    };

    return (
        <>
            <Header title="Specialty Management" subtitle="Temporary disable & fallback control" />

            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">

                {/* Alert: disabled specialties */}
                {overrides.length > 0 && (
                    <div
                        className="flex items-center justify-between px-5 py-4 rounded-2xl border animate-fade-in"
                        style={{
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                            borderColor: 'rgba(245,158,11,0.3)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <ShieldOff className="w-5 h-5" style={{ color: '#F59E0B' }} />
                            <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>
                                ⚠ {overrides.length} specialt{overrides.length === 1 ? 'y' : 'ies'} currently disabled
                            </span>
                        </div>
                        {openIncidentCount > 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                                <AlertTriangle className="w-3 h-3" />
                                {openIncidentCount} open incident{openIncidentCount !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                )}

                {/* Tab Nav */}
                <div className="flex gap-1 p-1 rounded-xl bg-bg-elevated border border-border">
                    {([
                        { id: 'status' as const, label: 'Specialty Status', icon: Shield, badge: overrides.length },
                        { id: 'incidents' as const, label: 'Incidents', icon: MessageSquareWarning, badge: openIncidentCount },
                        { id: 'history' as const, label: 'Override History', icon: History, badge: 0 },
                    ]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-accent text-white shadow-lg'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.badge > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.id ? 'bg-white/20' : 'bg-error/20 text-error'
                                }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ════════════════════════════════════════ */}
                {/* TAB: Specialty Status Grid               */}
                {/* ════════════════════════════════════════ */}
                {activeTab === 'status' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {SPECIALTIES.map(spec => {
                            const override = disabledMap.get(spec.key);
                            const isDisabled = !!override;
                            const isLocked = spec.locked;

                            return (
                                <div
                                    key={spec.key}
                                    className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${
                                        isDisabled ? 'ring-2 ring-error/40' : ''
                                    }`}
                                >
                                    {/* Color bar */}
                                    <div
                                        className={`h-1.5 ${isDisabled ? 'bg-error' : ''}`}
                                        style={!isDisabled ? { background: spec.color } : undefined}
                                    />

                                    <div className="p-5">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{spec.icon}</span>
                                                <div>
                                                    <h3 className="font-bold text-text-primary text-sm">{spec.name}</h3>
                                                    <p className="text-xs text-text-muted">{spec.nameAr}</p>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                isDisabled
                                                    ? 'bg-error/15 text-error'
                                                    : 'bg-success/15 text-success'
                                            }`}>
                                                {isDisabled ? (
                                                    <><XCircle className="w-3 h-3" /> Disabled</>
                                                ) : (
                                                    <><CheckCircle2 className="w-3 h-3" /> Active</>
                                                )}
                                            </div>
                                        </div>

                                        {/* Disabled details */}
                                        {isDisabled && override && (
                                            <div className="mb-4 p-3 rounded-xl bg-error/5 border border-error/20 space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-error font-medium">
                                                    {override.mode === 'silent' ? (
                                                        <><VolumeX className="w-3.5 h-3.5" /> Silent Mode</>
                                                    ) : (
                                                        <><Megaphone className="w-3.5 h-3.5" /> Announced Mode</>
                                                    )}
                                                </div>
                                                <p className="text-xs text-text-secondary line-clamp-2">
                                                    <span className="font-medium text-text-muted">Reason:</span> {override.reason_text}
                                                </p>
                                                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                                                    <Clock className="w-3 h-3" />
                                                    Disabled {new Date(override.disabled_at).toLocaleString()}
                                                    {override.admin_name && <> by {override.admin_name}</>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        {isLocked ? (
                                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20">
                                                <ShieldCheck className="w-4 h-4 text-accent" />
                                                <span className="text-xs font-medium text-accent">
                                                    Universal Fallback — Cannot Be Disabled
                                                </span>
                                            </div>
                                        ) : isDisabled ? (
                                            <button
                                                onClick={() => handleRestore(override!)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-success/15 text-success hover:bg-success/25"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                Re-enable Specialty
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => openDisableModal(spec)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all bg-bg-elevated border border-border text-text-secondary hover:text-error hover:border-error/30 hover:bg-error/5"
                                            >
                                                <ShieldOff className="w-4 h-4" />
                                                Disable Specialty
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ════════════════════════════════════════ */}
                {/* TAB: Incidents                           */}
                {/* ════════════════════════════════════════ */}
                {activeTab === 'incidents' && (
                    <div className="space-y-4">
                        {incidents.length === 0 ? (
                            <div className="glass rounded-2xl p-12 flex flex-col items-center text-text-muted">
                                <span className="text-4xl mb-3">✅</span>
                                <p className="font-medium">No incidents reported</p>
                                <p className="text-xs mt-1">All patients are being successfully routed</p>
                            </div>
                        ) : (
                            incidents.map(inc => (
                                <div
                                    key={inc.id}
                                    className={`glass rounded-2xl p-5 border-l-4 transition-all ${
                                        inc.status === 'open' ? 'border-l-error' :
                                        inc.status === 'acknowledged' ? 'border-l-warning' :
                                        'border-l-success'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                    inc.status === 'open' ? 'bg-error/15 text-error' :
                                                    inc.status === 'acknowledged' ? 'bg-warning/15 text-warning' :
                                                    'bg-success/15 text-success'
                                                }`}>
                                                    {inc.status === 'open' ? '🔴' : inc.status === 'acknowledged' ? '🟡' : '🟢'} {inc.status.toUpperCase()}
                                                </span>
                                                <span className="text-xs text-text-muted font-medium">
                                                    {SPECIALTIES.find(s => s.key === inc.specialty)?.icon} {inc.specialty?.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-[10px] text-text-muted">
                                                    {new Date(inc.created_at).toLocaleString()}
                                                </span>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-sm text-text-primary">
                                                    <span className="font-medium text-text-muted">Patient:</span> {inc.patient_name}
                                                </p>
                                                <p className="text-sm text-text-primary">
                                                    <span className="font-medium text-text-muted">Complaint:</span> {inc.chief_complaint}
                                                </p>
                                                <p className="text-sm text-text-secondary">
                                                    <span className="font-medium text-text-muted">AI Reasoning:</span> {inc.ai_reasoning}
                                                </p>
                                                {inc.ai_confidence && (
                                                    <p className="text-xs text-text-muted">
                                                        AI Confidence: {inc.ai_confidence}%
                                                    </p>
                                                )}
                                            </div>

                                            {inc.admin_notes && (
                                                <div className="mt-2 p-2 rounded-lg bg-bg-elevated text-xs text-text-secondary">
                                                    <span className="font-medium text-text-muted">Admin Notes:</span> {inc.admin_notes}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {inc.status === 'open' && (
                                                <button
                                                    onClick={() => handleAcknowledge(inc.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-warning/15 text-warning hover:bg-warning/25 transition-all"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    Acknowledge
                                                </button>
                                            )}
                                            {inc.status !== 'resolved' && (
                                                <button
                                                    onClick={() => { setSelectedIncident(inc); setIncidentNotes(inc.admin_notes || ''); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-success/15 text-success hover:bg-success/25 transition-all"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Resolve
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ════════════════════════════════════════ */}
                {/* TAB: Override History                     */}
                {/* ════════════════════════════════════════ */}
                {activeTab === 'history' && (
                    <div className="glass rounded-2xl overflow-hidden">
                        {history.length === 0 ? (
                            <div className="p-12 flex flex-col items-center text-text-muted">
                                <span className="text-4xl mb-3">📋</span>
                                <p className="font-medium">No override history</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-text-muted text-xs">
                                            <th className="text-left p-4">Specialty</th>
                                            <th className="text-left p-4">Mode</th>
                                            <th className="text-left p-4">Reason</th>
                                            <th className="text-left p-4">Disabled By</th>
                                            <th className="text-left p-4">Disabled At</th>
                                            <th className="text-left p-4">Status</th>
                                            <th className="text-left p-4">Restored At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(h => {
                                            const spec = SPECIALTIES.find(s => s.key === h.specialty);
                                            return (
                                                <tr key={h.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                                                    <td className="p-4 font-medium text-text-primary">
                                                        {spec?.icon} {h.specialty?.replace(/_/g, ' ')}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                            h.mode === 'silent' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
                                                        }`}>
                                                            {h.mode === 'silent' ? '🔇 Silent' : '📢 Announced'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-text-secondary max-w-[200px] truncate">{h.reason_text}</td>
                                                    <td className="p-4 text-text-muted">{h.admin_name}</td>
                                                    <td className="p-4 text-text-muted text-xs">{new Date(h.disabled_at).toLocaleString()}</td>
                                                    <td className="p-4">
                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                            h.is_disabled ? 'bg-error/15 text-error' : 'bg-success/15 text-success'
                                                        }`}>
                                                            {h.is_disabled ? 'Active' : 'Restored'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-text-muted text-xs">
                                                        {h.restored_at ? new Date(h.restored_at).toLocaleString() : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════ */}
            {/* MODAL: Disable Specialty                  */}
            {/* ════════════════════════════════════════ */}
            {showDisableModal && disableTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-error/15">
                                    <ShieldOff className="w-5 h-5 text-error" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-text-primary">Disable {disableTarget.name}</h2>
                                    <p className="text-xs text-text-muted">Temporarily stop accepting new {disableTarget.name.toLowerCase()} consultations</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDisableModal(false)} className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Mode Selector */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">Disable Mode</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDisableMode('silent')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            disableMode === 'silent'
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-border hover:border-border-hover'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <VolumeX className="w-4 h-4 text-blue-400" />
                                            <span className="text-sm font-bold text-text-primary">🔇 Silent</span>
                                        </div>
                                        <p className="text-[11px] text-text-muted leading-tight">
                                            Patient is silently rerouted to FM without knowing
                                        </p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDisableMode('announced')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            disableMode === 'announced'
                                                ? 'border-amber-500 bg-amber-500/10'
                                                : 'border-border hover:border-border-hover'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Megaphone className="w-4 h-4 text-amber-400" />
                                            <span className="text-sm font-bold text-text-primary">📢 Announced</span>
                                        </div>
                                        <p className="text-[11px] text-text-muted leading-tight">
                                            Patient is informed and offered FM as fallback
                                        </p>
                                    </button>
                                </div>
                            </div>

                            {/* Reason Code */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">Reason</label>
                                <select
                                    value={disableReason}
                                    onChange={e => setDisableReason(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                                >
                                    {REASON_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.icon} {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Justification */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Justification <span className="text-error">*</span>
                                </label>
                                <textarea
                                    value={disableText}
                                    onChange={e => setDisableText(e.target.value)}
                                    placeholder="Explain why this specialty is being disabled..."
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border text-text-primary text-sm focus:outline-none focus:border-accent resize-none placeholder:text-text-muted"
                                />
                            </div>

                            {/* Custom Patient Message (Announced only) */}
                            {disableMode === 'announced' && (
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        Custom Patient Message <span className="text-text-muted text-xs">(optional)</span>
                                    </label>
                                    <textarea
                                        value={disablePatientMsg}
                                        onChange={e => setDisablePatientMsg(e.target.value)}
                                        placeholder="The message shown to the patient. Leave empty for auto-generated default."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border text-text-primary text-sm focus:outline-none focus:border-accent resize-none placeholder:text-text-muted"
                                    />
                                </div>
                            )}

                            {/* Warning */}
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-error/5 border border-error/20">
                                <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-text-secondary">
                                    <p className="font-medium text-error">Important:</p>
                                    <p>New intake sessions targeting {disableTarget.name} will be {disableMode === 'silent' ? 'silently redirected to Family Medicine' : 'shown a fallback option'}. Active consultations will not be affected.</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={() => setShowDisableModal(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-bg-elevated border border-border text-text-secondary hover:text-text-primary transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDisable}
                                    disabled={!disableText.trim() || disableLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-error text-white hover:bg-error/90 transition-all disabled:opacity-50"
                                >
                                    {disableLoading ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ShieldOff className="w-4 h-4" />
                                    )}
                                    {disableLoading ? 'Disabling...' : 'Confirm Disable'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════ */}
            {/* MODAL: Resolve Incident                   */}
            {/* ════════════════════════════════════════ */}
            {selectedIncident && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass rounded-2xl w-full max-w-md animate-fade-in">
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h2 className="font-bold text-text-primary flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-success" />
                                Resolve Incident
                            </h2>
                            <button onClick={() => setSelectedIncident(null)} className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="p-3 rounded-xl bg-bg-elevated space-y-1">
                                <p className="text-xs text-text-muted">Complaint: <span className="text-text-primary">{selectedIncident.chief_complaint}</span></p>
                                <p className="text-xs text-text-muted">AI Reasoning: <span className="text-text-secondary">{selectedIncident.ai_reasoning}</span></p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">Admin Notes</label>
                                <textarea
                                    value={incidentNotes}
                                    onChange={e => setIncidentNotes(e.target.value)}
                                    placeholder="How was this resolved? What action was taken?"
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border text-text-primary text-sm focus:outline-none focus:border-accent resize-none placeholder:text-text-muted"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedIncident(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-bg-elevated border border-border text-text-secondary hover:text-text-primary transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleResolveIncident(selectedIncident.id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-success text-white hover:bg-success/90 transition-all"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Mark Resolved
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
