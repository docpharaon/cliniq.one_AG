'use client';

import Header from '@/components/Header';
import StatusBadge, { PriorityBadge } from '@/components/StatusBadge';
import InterventionOrderForm from '@/components/InterventionOrderForm';
import PsychAssessmentTab from '@/components/PsychAssessmentTab';
import {
    User as UserIcon, Calendar, MapPin, Globe, Stethoscope,
    Brain, FileText, Pill, AlertCircle, ArrowLeft,
    Send, Loader2, ClipboardList, FlaskConical,
    MessageSquare, FileDown, Eye, Plus, HelpCircle, X, Sparkles,
} from 'lucide-react';
import { downloadMedicalPdf, previewMedicalPdf } from '@/lib/generateMedicalPdf';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    fetchConsultationDetail,
    fetchConsultationMessages,
    fetchConsultationInterventions,
} from '@/lib/actions';
import { useParams } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase';
import type { Consultation, User as UserType, Message, Intervention, AISummary, ConsultationReport, PrescriptionMedication } from '@cliniqone/types';

type ConsultationDetail = Consultation & { patient: UserType | null };
type InterventionWithProvider = Intervention & { provider?: { name: string; type: string; city: string } | null };

type TabKey = 'overview' | 'ai' | 'chat' | 'interventions' | 'response' | 'psych';

export default function ConsultationDetailPage() {
    const params = useParams();
    const consultationId = params.id as string;
    const [consultation, setConsultation] = useState<ConsultationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('overview');

    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Interventions state
    const [interventions, setInterventions] = useState<InterventionWithProvider[]>([]);
    const [loadingInterventions, setLoadingInterventions] = useState(false);
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [doctorId, setDoctorId] = useState('');

    // PDF state
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Inquiry state
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [inquiryText, setInquiryText] = useState('');
    const [sendingInquiry, setSendingInquiry] = useState(false);
    const [improvingInquiry, setImprovingInquiry] = useState(false);


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

    async function handleDownloadPdf() {
        if (!consultation || !doctorReport) return;
        setGeneratingPdf(true);
        try {
            // Ensure interventions are loaded
            let intvData = interventions;
            if (intvData.length === 0) {
                try {
                    intvData = await fetchConsultationInterventions(consultationId);
                } catch { /* ignore */ }
            }
            await downloadMedicalPdf({
                consultation: { ...consultation, patient: consultation.patient },
                report: doctorReport,
                interventions: intvData,
                variant: 'full',
            });
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF. Please try again.');
        }
        setGeneratingPdf(false);
    }

    async function handlePreviewPdf() {
        if (!consultation || !doctorReport) return;
        setGeneratingPdf(true);
        try {
            let intvData = interventions;
            if (intvData.length === 0) {
                try {
                    intvData = await fetchConsultationInterventions(consultationId);
                } catch { /* ignore */ }
            }
            await previewMedicalPdf({
                consultation: { ...consultation, patient: consultation.patient },
                report: doctorReport,
                interventions: intvData,
                variant: 'full',
            });
        } catch (err) {
            console.error('PDF preview error:', err);
            alert('Failed to generate PDF preview. Please try again.');
        }
        setGeneratingPdf(false);
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
    const aiReport: AISummary = consultation.ai_summary || {};
    const doctorReport: ConsultationReport | null = consultation.report;

    const TABS: { key: TabKey; label: string; icon: any }[] = [
        { key: 'overview', label: 'Patient File', icon: UserIcon },
        { key: 'ai', label: 'AI Assessment', icon: Brain },
        { key: 'chat', label: 'Chat Transcript', icon: MessageSquare },
        { key: 'interventions', label: 'Interventions', icon: FlaskConical },
        { key: 'response', label: 'Doctor Response', icon: FileText },
        ...(consultation.specialty === 'psychiatry'
            ? [{ key: 'psych' as TabKey, label: '🧠 Psych Assessment', icon: ClipboardList }]
            : []),
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

            <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-4 md:space-y-6 no-print">
                {/* Back + Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Link
                        href="/dashboard/queue"
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Queue
                    </Link>
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                        {/* Send Inquiry button - only for active cases */}
                        {['assigned', 'in_progress'].includes(consultation.status) && (
                            <button
                                onClick={() => setShowInquiryModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-warning/40 text-warning hover:bg-warning-faded transition-all font-medium"
                            >
                                <HelpCircle className="w-3.5 h-3.5" />
                                Send Inquiry
                            </button>
                        )}
                        {doctorReport && (
                            <>
                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={generatingPdf}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-accent/40 text-accent hover:bg-accent-faded transition-all font-medium disabled:opacity-40"
                                >
                                    {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                                    Download PDF
                                </button>
                                <button
                                    onClick={handlePreviewPdf}
                                    disabled={generatingPdf}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-text-secondary hover:text-accent hover:bg-accent-faded transition-all font-medium disabled:opacity-40"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    Preview PDF
                                </button>
                            </>
                        )}
                        <StatusBadge
                            label={consultation.status?.replace('_', ' ') || 'Unknown'}
                            variant={consultation.status === 'completed' || consultation.status === 'report_ready' ? 'success' : consultation.status === 'inquiry_sent' ? 'warning' : 'info'}
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
                                    <UserIcon className="w-6 h-6 text-accent" />
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
                            <div className="glass rounded-2xl p-4 md:p-6 space-y-3 max-h-[65vh] overflow-y-auto">
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
                                                className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 text-sm leading-relaxed ${isPatient
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
                                {(consultation.prescription?.medications?.length ?? 0) > 0 && (
                                    <div className="glass rounded-2xl p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Pill className="w-5 h-5 text-info" />
                                            <h3 className="text-lg font-bold text-text-primary">Prescription</h3>
                                        </div>
                                        <div className="space-y-2">
                                            {consultation.prescription!.medications!.map((med: PrescriptionMedication, i: number) => (
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



                {/* Psych Assessment Tab — only for psychiatry consultations */}
                {activeTab === 'psych' && consultation.specialty === 'psychiatry' && consultation.patient && (
                    <div className="animate-fade-in">
                        <PsychAssessmentTab
                            consultationId={consultationId}
                            doctorId={doctorId}
                            patientId={consultation.patient_id}
                        />
                    </div>
                )}

            {/* Inquiry Modal */}
            {showInquiryModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 md:p-4">
                    <div className="bg-bg-primary border border-border rounded-2xl w-full max-w-[95vw] sm:max-w-lg p-4 md:p-6 space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-warning" />
                                <h3 className="text-lg font-bold text-text-primary">Send Inquiry to Patient</h3>
                            </div>
                            <button onClick={() => setShowInquiryModal(false)} className="text-text-muted hover:text-text-primary">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-text-muted">Ask the patient for additional information. An AI chatbot will guide them through answering your question.</p>
                        <textarea
                            value={inquiryText}
                            onChange={e => setInquiryText(e.target.value)}
                            placeholder="e.g. Can you describe the frequency and timing of your headaches in the past week?"
                            rows={4}
                            className="w-full bg-bg-elevated border border-border rounded-xl p-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                        />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={async () => {
                                    if (!inquiryText.trim()) return;
                                    setImprovingInquiry(true);
                                    try {
                                        const res = await fetch('/api/ai-improve-inquiry', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ question: inquiryText }),
                                        });
                                        if (res.ok) {
                                            const { improved } = await res.json();
                                            if (improved) setInquiryText(improved);
                                        }
                                    } catch { /* ignore */ }
                                    setImprovingInquiry(false);
                                }}
                                disabled={!inquiryText.trim() || improvingInquiry}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-purple/40 text-purple hover:bg-purple-faded transition-all font-medium disabled:opacity-40"
                            >
                                {improvingInquiry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                AI Improve
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={() => setShowInquiryModal(false)}
                                className="px-4 py-2 text-sm rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!inquiryText.trim() || !doctorId) return;
                                    setSendingInquiry(true);
                                    try {
                                        const supabase = createBrowserSupabase();
                                        // Create inquiry
                                        const { error: inquiryError } = await supabase
                                            .from('doctor_inquiries')
                                            .insert({
                                                consultation_id: consultationId,
                                                doctor_id: doctorId,
                                                question_text: inquiryText,
                                            });
                                        if (inquiryError) throw inquiryError;
                                        // Update consultation status
                                        await supabase
                                            .from('consultations')
                                            .update({ status: 'inquiry_sent' })
                                            .eq('id', consultationId);
                                        // Refresh
                                        setConsultation({ ...consultation, status: 'inquiry_sent' });
                                        setShowInquiryModal(false);
                                        setInquiryText('');
                                        alert('✅ Inquiry sent to patient!');
                                    } catch (err: any) {
                                        alert(`Error: ${err.message || 'Failed to send inquiry'}`);
                                    }
                                    setSendingInquiry(false);
                                }}
                                disabled={!inquiryText.trim() || sendingInquiry}
                                className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-lg bg-accent text-bg-primary font-bold hover:shadow-[0_2px_8px_rgba(45,212,191,0.3)] transition-all disabled:opacity-40"
                            >
                                {sendingInquiry ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Send Inquiry
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
