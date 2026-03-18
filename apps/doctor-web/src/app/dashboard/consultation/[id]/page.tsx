'use client';

import Header from '@/components/Header';
import StatusBadge, { PriorityBadge } from '@/components/StatusBadge';
import InterventionOrderForm from '@/components/InterventionOrderForm';
import {
    User, Calendar, MapPin, Globe, Stethoscope,
    Brain, FileText, Pill, AlertCircle, ArrowLeft,
    Send, Loader2, ClipboardList, FlaskConical,
    MessageSquare, Printer, Eye, Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import {
    fetchConsultationDetail,
    fetchConsultationMessages,
    fetchConsultationInterventions,
} from '@/lib/actions';
import { useParams } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase';

type TabKey = 'overview' | 'ai' | 'chat' | 'interventions' | 'response';

export default function ConsultationDetailPage() {
    const params = useParams();
    const consultationId = params.id as string;
    const [consultation, setConsultation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('overview');

    // Chat state
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Interventions state
    const [interventions, setInterventions] = useState<any[]>([]);
    const [loadingInterventions, setLoadingInterventions] = useState(false);
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [doctorId, setDoctorId] = useState('');

    // Print ref
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchConsultationDetail(consultationId);
                setConsultation(data);

                // Get doctor ID
                const supabase = createBrowserSupabase();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: doc } = await supabase
                        .from('doctors')
                        .select('id')
                        .eq('user_id', user.id)
                        .single();
                    if (doc) setDoctorId(doc.id);
                }
            } catch (err) {
                console.error('Load consultation error:', err);
            }
            setLoading(false);
        }
        load();
    }, [consultationId]);

    // Load chat messages when tab is selected
    useEffect(() => {
        if (activeTab === 'chat' && messages.length === 0 && !loadingMessages) {
            setLoadingMessages(true);
            fetchConsultationMessages(consultationId)
                .then(data => setMessages(data))
                .catch(err => console.error('Messages error:', err))
                .finally(() => setLoadingMessages(false));
        }
    }, [activeTab, consultationId, messages.length, loadingMessages]);

    // Load interventions when tab is selected
    useEffect(() => {
        if (activeTab === 'interventions' && interventions.length === 0 && !loadingInterventions) {
            loadInterventions();
        }
    }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

    async function loadInterventions() {
        setLoadingInterventions(true);
        try {
            const data = await fetchConsultationInterventions(consultationId);
            setInterventions(data);
        } catch (err) {
            console.error('Interventions error:', err);
        }
        setLoadingInterventions(false);
    }

    function handlePrint() {
        window.print();
    }

    if (loading) {
        return (
            <>
                <Header title="Consultation" subtitle="Loading..." />
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
            </>
        );
    }

    if (!consultation) {
        return (
            <>
                <Header title="Consultation" subtitle="Not found" />
                <div className="flex flex-col items-center justify-center h-[60vh] text-text-muted">
                    <AlertCircle className="w-12 h-12 mb-4" />
                    <p>Consultation not found</p>
                    <Link href="/dashboard/queue" className="text-accent hover:underline mt-2">Back to Queue</Link>
                </div>
            </>
        );
    }

    const patient = consultation.patient;
    const aiReport = consultation.ai_summary || {};
    const doctorReport = consultation.doctor_report;

    const TABS: { key: TabKey; label: string; icon: any }[] = [
        { key: 'overview', label: 'Patient File', icon: User },
        { key: 'ai', label: 'AI Assessment', icon: Brain },
        { key: 'chat', label: 'Chat Transcript', icon: MessageSquare },
        { key: 'interventions', label: 'Interventions', icon: FlaskConical },
        { key: 'response', label: 'Doctor Response', icon: FileText },
    ];

    const interventionStatusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'neutral' }> = {
        ordered: { label: 'Ordered', variant: 'info' },
        pending_auth: { label: 'Pending Auth', variant: 'warning' },
        authorized: { label: 'Authorized', variant: 'info' },
        scheduled: { label: 'Scheduled', variant: 'info' },
        in_progress: { label: 'In Progress', variant: 'warning' },
        completed: { label: 'Completed', variant: 'success' },
        results_ready: { label: 'Results Ready', variant: 'success' },
        reviewed: { label: 'Reviewed', variant: 'success' },
        cancelled: { label: 'Cancelled', variant: 'error' },
    };

    return (
        <>
            <Header
                title={`Case ${consultationId.slice(0, 8)}…`}
                subtitle={consultation.chief_complaint || 'Consultation'}
            />

            <div className="p-8 max-w-[1200px] mx-auto space-y-6 no-print">
                {/* Back + Actions Bar */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/dashboard/queue"
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Queue
                    </Link>
                    <div className="flex items-center gap-3">
                        {doctorReport && (
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-text-secondary hover:text-accent hover:bg-accent-faded transition-all font-medium"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Print Report
                            </button>
                        )}
                        <StatusBadge
                            label={consultation.status?.replace('_', ' ') || 'Unknown'}
                            variant={consultation.status === 'completed' || consultation.status === 'report_ready' ? 'success' : 'info'}
                        />
                        <PriorityBadge priority={consultation.priority || 'routine'} />
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="flex items-center gap-1 border-b border-border pb-1 overflow-x-auto">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.key
                                    ? 'text-accent border-accent'
                                    : 'text-text-muted border-transparent hover:text-text-primary'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                        {/* Patient Info */}
                        <div className="glass rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-xl bg-accent-faded flex items-center justify-center">
                                    <User className="w-6 h-6 text-accent" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary">{patient?.nickname || 'Patient'}</h3>
                                    <p className="text-sm text-text-muted capitalize">{patient?.gender || '—'}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {patient?.year_of_birth && (
                                    <InfoRow icon={Calendar} label="Age" value={`${new Date().getFullYear() - patient.year_of_birth} years`} />
                                )}
                                {patient?.city && (
                                    <InfoRow icon={MapPin} label="Location" value={`${patient.city}${patient.country ? `, ${patient.country}` : ''}`} />
                                )}
                                {patient?.language && (
                                    <InfoRow icon={Globe} label="Language" value={patient.language} />
                                )}
                            </div>
                        </div>

                        {/* Chief Complaint + Metadata */}
                        <div className="glass rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-xl bg-warning-faded flex items-center justify-center">
                                    <Stethoscope className="w-6 h-6 text-warning" />
                                </div>
                                <h3 className="text-lg font-bold text-text-primary">Chief Complaint</h3>
                            </div>
                            <p className="text-text-primary text-sm leading-relaxed">{consultation.chief_complaint || 'No complaint provided'}</p>

                            <div className="pt-3 border-t border-border space-y-3">
                                <InfoRow icon={Calendar} label="Created" value={new Date(consultation.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                                <InfoRow icon={ClipboardList} label="Tokens" value={`💎 ${consultation.token_cost || 3}`} />
                                {consultation.specialty && (
                                    <InfoRow icon={Stethoscope} label="Specialty" value={consultation.specialty} />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="space-y-6 animate-fade-in">
                        {aiReport.summary && (
                            <div className="glass rounded-2xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Brain className="w-5 h-5 text-purple" />
                                    <h3 className="text-lg font-bold text-text-primary">AI Summary</h3>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-faded text-purple font-semibold ml-auto">AI Generated</span>
                                </div>
                                <p className="text-text-secondary text-sm leading-relaxed">{aiReport.summary}</p>
                            </div>
                        )}

                        {aiReport.key_findings && aiReport.key_findings.length > 0 && (
                            <div className="glass rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-text-primary mb-4">Key Findings</h3>
                                <div className="space-y-2">
                                    {aiReport.key_findings.map((finding: string, i: number) => (
                                        <div key={i} className="flex items-start gap-3 px-4 py-2 rounded-xl bg-bg-elevated">
                                            <span className="text-accent font-bold mt-0.5">{i + 1}.</span>
                                            <p className="text-sm text-text-primary">{finding}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {aiReport.differential_diagnoses && aiReport.differential_diagnoses.length > 0 && (
                            <div className="glass rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-text-primary mb-4">Differential Diagnoses</h3>
                                <div className="space-y-2">
                                    {aiReport.differential_diagnoses.map((dx: string, i: number) => (
                                        <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-bg-elevated">
                                            <FlaskConical className="w-4 h-4 text-info flex-shrink-0" />
                                            <p className="text-sm text-text-primary">{dx}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {aiReport.medications && aiReport.medications.length > 0 && (
                                <div className="glass rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Pill className="w-5 h-5 text-info" />
                                        <h3 className="font-bold text-text-primary">Current Medications</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {aiReport.medications.map((med: string, i: number) => (
                                            <div key={i} className="px-3 py-2 rounded-lg bg-bg-elevated text-sm text-text-primary">{med}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {aiReport.allergies && aiReport.allergies.length > 0 && (
                                <div className="glass rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <AlertCircle className="w-5 h-5 text-error" />
                                        <h3 className="font-bold text-text-primary">Allergies</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {aiReport.allergies.map((allergy: string, i: number) => (
                                            <div key={i} className="px-3 py-2 rounded-lg bg-error-faded text-sm text-error font-medium">{allergy}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {!aiReport.summary && (
                            <div className="flex flex-col items-center py-12 text-text-muted">
                                <Brain className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm">No AI assessment available for this consultation</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Chat Transcript Tab */}
                {activeTab === 'chat' && (
                    <div className="animate-fade-in">
                        {loadingMessages ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center py-16 text-text-muted">
                                <MessageSquare className="w-12 h-12 mb-3 opacity-40" />
                                <p className="text-sm">No chat messages for this consultation</p>
                            </div>
                        ) : (
                            <div className="glass rounded-2xl p-6 space-y-3 max-h-[65vh] overflow-y-auto">
                                <div className="flex items-center gap-2 mb-4">
                                    <MessageSquare className="w-5 h-5 text-accent" />
                                    <h3 className="text-lg font-bold text-text-primary">Chat Transcript</h3>
                                    <span className="text-xs text-text-muted ml-auto">{messages.length} messages</span>
                                </div>
                                {messages.map((msg: any, i: number) => {
                                    const isPatient = msg.role === 'user' || msg.role === 'patient';
                                    const isSystem = msg.role === 'system';
                                    return (
                                        <div
                                            key={msg.id || i}
                                            className={`flex ${isPatient ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isPatient
                                                    ? 'bg-accent/20 text-text-primary rounded-br-md'
                                                    : isSystem
                                                        ? 'bg-bg-elevated text-text-muted text-xs italic text-center rounded-xl max-w-full'
                                                        : 'bg-bg-elevated text-text-primary rounded-bl-md border border-border'
                                                    }`}
                                            >
                                                {!isSystem && (
                                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isPatient ? 'text-accent' : 'text-purple'}`}>
                                                        {isPatient ? 'Patient' : msg.role === 'assistant' ? 'AI' : msg.role}
                                                    </p>
                                                )}
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                <p className={`text-[10px] mt-1.5 ${isPatient ? 'text-accent/60' : 'text-text-muted'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Interventions Tab */}
                {activeTab === 'interventions' && (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-info" />
                                <h3 className="text-lg font-bold text-text-primary">Interventions</h3>
                                <span className="text-xs text-text-muted">({interventions.length})</span>
                            </div>
                            <button
                                onClick={() => setShowOrderForm(true)}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-gradient-to-r from-accent to-purple text-white font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.3)] transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" /> Order Test
                            </button>
                        </div>

                        {loadingInterventions ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                            </div>
                        ) : interventions.length === 0 ? (
                            <div className="glass rounded-2xl p-12 text-center">
                                <FlaskConical className="w-12 h-12 text-info mx-auto mb-4 opacity-50" />
                                <h4 className="text-lg font-bold text-text-primary mb-2">No Interventions Yet</h4>
                                <p className="text-sm text-text-muted mb-4">Order lab tests, imaging, or referrals for this patient</p>
                                <button
                                    onClick={() => setShowOrderForm(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary font-bold text-sm hover:shadow-[0_4px_12px_rgba(45,212,191,0.3)] transition-all"
                                >
                                    <Plus className="w-4 h-4" /> Order Test
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {interventions.map((intv: any) => {
                                    const st = interventionStatusMap[intv.status] ?? { label: intv.status, variant: 'neutral' as const };
                                    return (
                                        <div key={intv.id} className="glass rounded-2xl p-5 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-text-primary">{intv.title}</h4>
                                                    <StatusBadge label={st.label} variant={st.variant} />
                                                </div>
                                                <PriorityBadge priority={intv.priority} />
                                            </div>
                                            <p className="text-xs text-text-muted">
                                                {intv.category}{intv.specific_test ? ` → ${intv.specific_test}` : ''}
                                                {intv.type ? ` · ${intv.type.replace('_', ' ')}` : ''}
                                            </p>
                                            {intv.clinical_indication && (
                                                <p className="text-sm text-text-secondary">{intv.clinical_indication}</p>
                                            )}
                                            {intv.instructions_for_patient && (
                                                <p className="text-xs text-info">📋 {intv.instructions_for_patient}</p>
                                            )}
                                            <p className="text-[10px] text-text-muted">
                                                Ordered {new Date(intv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {showOrderForm && consultation && (
                            <InterventionOrderForm
                                consultationId={consultationId}
                                patientId={consultation.patient_id}
                                doctorId={doctorId}
                                onOrderCreated={() => {
                                    setShowOrderForm(false);
                                    loadInterventions();
                                }}
                                onClose={() => setShowOrderForm(false)}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'response' && (
                    <div className="animate-fade-in">
                        {doctorReport ? (
                            <div className="space-y-6">
                                {doctorReport.diagnosis && (
                                    <div className="glass rounded-2xl p-6">
                                        <h3 className="text-lg font-bold text-text-primary mb-3">Clinical Assessment</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Primary Diagnosis</p>
                                                <p className="text-text-primary">{doctorReport.diagnosis}</p>
                                            </div>
                                            {doctorReport.icd10 && (
                                                <div>
                                                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">ICD-10</p>
                                                    <p className="text-accent font-mono">{doctorReport.icd10}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {doctorReport.treatment_plan && (
                                    <div className="glass rounded-2xl p-6">
                                        <h3 className="text-lg font-bold text-text-primary mb-3">Treatment Plan</h3>
                                        <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{doctorReport.treatment_plan}</p>
                                    </div>
                                )}

                                {/* Prescription */}
                                {consultation.prescription?.medications?.length > 0 && (
                                    <div className="glass rounded-2xl p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Pill className="w-5 h-5 text-info" />
                                            <h3 className="text-lg font-bold text-text-primary">Prescription</h3>
                                        </div>
                                        <div className="space-y-2">
                                            {consultation.prescription.medications.map((med: any, i: number) => (
                                                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 rounded-xl bg-bg-elevated border border-border">
                                                    <span className="font-semibold text-text-primary text-sm flex-1">{med.name}</span>
                                                    <span className="text-xs text-text-muted">{med.dose} · {med.frequency} · {med.duration} · {med.route}</span>
                                                    {med.notes && <span className="text-xs text-info italic">{med.notes}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {doctorReport.patient_education && (
                                    <div className="glass rounded-2xl p-6">
                                        <h3 className="text-lg font-bold text-text-primary mb-3">Patient Education</h3>
                                        <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{doctorReport.patient_education}</p>
                                    </div>
                                )}

                                {(doctorReport.follow_up || doctorReport.follow_up_timeframe) && (
                                    <div className="glass rounded-2xl p-6">
                                        <h3 className="text-lg font-bold text-text-primary mb-3">Follow-up</h3>
                                        <p className="text-text-secondary text-sm">{doctorReport.follow_up}</p>
                                        {doctorReport.follow_up_timeframe && (
                                            <p className="text-xs text-accent mt-1">Timeframe: {doctorReport.follow_up_timeframe}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="glass rounded-2xl p-12 text-center">
                                <Send className="w-12 h-12 text-accent mx-auto mb-4 opacity-60" />
                                <h3 className="text-lg font-bold text-text-primary mb-2">No Response Yet</h3>
                                <p className="text-text-muted text-sm mb-6">Compose your medical response for this consultation</p>
                                <Link
                                    href={`/dashboard/consultation/${consultationId}/respond`}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-purple text-white font-bold text-sm hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(45,212,191,0.4)] transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                    Compose Response
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Printable Report (hidden on screen, shown on print) */}
            <div ref={printRef} className="hidden print-only print-report">
                <div className="max-w-[700px] mx-auto p-8">
                    {/* Clinic Header */}
                    <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                        <h1 className="text-2xl font-bold">cliniq.one</h1>
                        <p className="text-sm text-gray-600">Medical Consultation Report</p>
                    </div>

                    {/* Patient Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div>
                            <p><strong>Patient:</strong> {patient?.nickname || 'N/A'}</p>
                            <p><strong>Gender:</strong> {patient?.gender || 'N/A'}</p>
                            {patient?.year_of_birth && <p><strong>Age:</strong> {new Date().getFullYear() - patient.year_of_birth} years</p>}
                        </div>
                        <div className="text-right">
                            <p><strong>Case ID:</strong> {consultationId.slice(0, 8)}</p>
                            <p><strong>Date:</strong> {new Date(consultation.created_at).toLocaleDateString()}</p>
                            <p><strong>Specialty:</strong> {consultation.specialty || 'General'}</p>
                        </div>
                    </div>

                    {/* Chief Complaint */}
                    <div className="mb-6">
                        <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">Chief Complaint</h2>
                        <p className="text-sm">{consultation.chief_complaint || 'N/A'}</p>
                    </div>

                    {/* Diagnosis */}
                    {doctorReport?.diagnosis && (
                        <div className="mb-6">
                            <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">Clinical Assessment</h2>
                            <p className="text-sm"><strong>Diagnosis:</strong> {doctorReport.diagnosis}</p>
                            {doctorReport.icd10 && <p className="text-sm"><strong>ICD-10:</strong> {doctorReport.icd10}</p>}
                        </div>
                    )}

                    {/* Treatment Plan */}
                    {doctorReport?.treatment_plan && (
                        <div className="mb-6">
                            <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">Treatment Plan</h2>
                            <p className="text-sm whitespace-pre-wrap">{doctorReport.treatment_plan}</p>
                        </div>
                    )}

                    {/* Prescription */}
                    {consultation.prescription?.medications?.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">Prescription</h2>
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-300">
                                        <th className="text-left py-1 pr-2">Medication</th>
                                        <th className="text-left py-1 pr-2">Dose</th>
                                        <th className="text-left py-1 pr-2">Frequency</th>
                                        <th className="text-left py-1 pr-2">Duration</th>
                                        <th className="text-left py-1">Route</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consultation.prescription.medications.map((med: any, i: number) => (
                                        <tr key={i} className="border-b border-gray-200">
                                            <td className="py-1 pr-2">{med.name}</td>
                                            <td className="py-1 pr-2">{med.dose}</td>
                                            <td className="py-1 pr-2">{med.frequency}</td>
                                            <td className="py-1 pr-2">{med.duration}</td>
                                            <td className="py-1">{med.route}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Patient Education */}
                    {doctorReport?.patient_education && (
                        <div className="mb-6">
                            <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">Patient Education</h2>
                            <p className="text-sm whitespace-pre-wrap">{doctorReport.patient_education}</p>
                        </div>
                    )}

                    {/* Follow-up */}
                    {(doctorReport?.follow_up || doctorReport?.follow_up_timeframe) && (
                        <div className="mb-6">
                            <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">Follow-up</h2>
                            <p className="text-sm">{doctorReport.follow_up}</p>
                            {doctorReport.follow_up_timeframe && <p className="text-sm">Timeframe: {doctorReport.follow_up_timeframe}</p>}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="border-t-2 border-gray-800 pt-4 mt-8 text-center text-xs text-gray-500">
                        <p>Generated by cliniq.one — {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                        <p>This is a system-generated document.</p>
                    </div>
                </div>
            </div>
        </>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-text-muted flex-shrink-0" />
            <span className="text-sm text-text-muted w-24">{label}</span>
            <span className="text-sm text-text-primary font-medium">{value}</span>
        </div>
    );
}
