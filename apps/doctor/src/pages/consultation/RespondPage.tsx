import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { colors, typography, Save, Search, Camera, Pill, MessageSquare, Sparkles, Send, Microscope, BookOpen, Siren, FileText, TestTube, Eye, Stethoscope, Leaf, Calendar, ClipboardList, Trash, CheckCircle, Clock, Edit } from '@cliniqone/ui';
import type { CliniqIconProps } from '@cliniqone/ui';
import { useSubmitReport, useCreateInquiry, useDoctorInquiries, useConsultationDetail } from '../../hooks/useDoctorData';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '@cliniqone/api';
import { BackButton } from '../../components/BackButton';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';
import { haptic } from '../../hooks/useHaptics';
import type { DoctorInquiry } from '@cliniqone/types';
import type { CSSProperties, ReactNode } from 'react';

interface Medication {
    name: string; strength: string; form: string; quantity: string; directions: string; duration: string; addToPrescription: boolean;
}
const emptyMed: Medication = { name: '', strength: '', form: 'Cream', quantity: '', directions: '', duration: '', addToPrescription: true };

const DRAFT_KEY_PREFIX = 'doctor_draft_';

function getDraftKey(consultationId: string) {
    return `${DRAFT_KEY_PREFIX}${consultationId}`;
}

function loadDraft(consultationId: string) {
    try {
        const stored = localStorage.getItem(getDraftKey(consultationId));
        return stored ? JSON.parse(stored) : null;
    } catch { return null; }
}

function saveDraft(consultationId: string, data: Record<string, unknown>) {
    try {
        localStorage.setItem(getDraftKey(consultationId), JSON.stringify({ ...data, _savedAt: Date.now() }));
    } catch { /* storage full — ignore */ }
}

function clearDraft(consultationId: string) {
    localStorage.removeItem(getDraftKey(consultationId));
}

function SectionHeader({ title, Icon }: { title: string; Icon: (p: CliniqIconProps) => ReactNode }) {
    return <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon size={18} color={colors.textPrimary} /> {title}</span>;
}
function Label({ text }: { text: string }) {
    return <label style={s.label}>{text}</label>;
}

export function RespondPage() {
    const { id: consultationId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { doctor } = useAuthStore();
    const doctorId = doctor?.id || '';
    const submitReportMutation = useSubmitReport();
    const createInquiryMutation = useCreateInquiry();
    const { data: inquiries = [] } = useDoctorInquiries(consultationId || '');
    const { data: consultation } = useConsultationDetail(consultationId || '');

    // Load draft on mount
    const draft = consultationId ? loadDraft(consultationId) : null;

    // Inquiry state
    const [inquiryText, setInquiryText] = useState('');
    const [aiImprovedText, setAiImprovedText] = useState('');
    const [isImprovingWithAi, setIsImprovingWithAi] = useState(false);
    const [showInquiryForm, setShowInquiryForm] = useState(false);
    const [inquiryRequestType, setInquiryRequestType] = useState<'text' | 'skin_photo' | 'medication_photo' | 'document_photo'>('text');

    // Clinical Assessment
    const [diagnosis, setDiagnosis] = useState(draft?.diagnosis || '');
    const [icd10, setIcd10] = useState(draft?.icd10 || '');
    const [differentials, setDifferentials] = useState(draft?.differentials || '');
    const [reasoning, setReasoning] = useState(draft?.reasoning || '');
    // Treatment Plan
    const [medications, setMedications] = useState<Medication[]>(draft?.medications || [{ ...emptyMed }]);
    const [nonPharm, setNonPharm] = useState(draft?.nonPharm || '');
    // Patient Education
    const [aboutCondition, setAboutCondition] = useState(draft?.aboutCondition || '');
    const [expectations, setExpectations] = useState(draft?.expectations || '');
    const [prevention, setPrevention] = useState(draft?.prevention || '');
    // Warning Signs
    const [warningChecks, setWarningChecks] = useState<Record<string, boolean>>(draft?.warningChecks || {
        'Fever above 38.5°C': false, 'Rapid spread of symptoms': false, 'Difficulty breathing': false, 'Severe swelling': false, 'Worsening despite treatment': false,
    });
    const [followUp, setFollowUp] = useState(draft?.followUp || '');
    // Notes
    const [notes, setNotes] = useState(draft?.notes || '');
    // Preview
    const [showPreview, setShowPreview] = useState(false);
    const [showInquiryConfirm, setShowInquiryConfirm] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const toast = useToast((s) => s.show);

    // Auto-save draft whenever form fields change
    const persistDraft = useCallback(() => {
        if (!consultationId) return;
        saveDraft(consultationId, { diagnosis, icd10, differentials, reasoning, medications, nonPharm, aboutCondition, expectations, prevention, warningChecks, followUp, notes });
    }, [consultationId, diagnosis, icd10, differentials, reasoning, medications, nonPharm, aboutCondition, expectations, prevention, warningChecks, followUp, notes]);

    useEffect(() => {
        const timer = setTimeout(persistDraft, 1000); // debounce 1s
        return () => clearTimeout(timer);
    }, [persistDraft]);

    const addMedication = () => setMedications([...medications, { ...emptyMed }]);
    const removeMedication = (index: number) => setMedications(medications.filter((_, i) => i !== index));
    const updateMed = (index: number, field: keyof Medication, value: string | boolean) => {
        const updated = [...medications]; (updated[index] as any)[field] = value; setMedications(updated);
    };

    const handleImproveWithAi = async () => {
        if (!inquiryText.trim()) return;
        setIsImprovingWithAi(true);
        try {
            const { data: fnData } = await supabase.functions.invoke('ai-intake', { body: { action: 'improve-inquiry', questionText: inquiryText, language: 'en' } });
            if (fnData?.improvedText) setAiImprovedText(fnData.improvedText);
        } catch { toast('Failed to improve text. Please try again.', 'error'); }
        finally { setIsImprovingWithAi(false); }
    };

    const handleSendInquiry = () => {
        const textToSend = aiImprovedText || inquiryText;
        if (!textToSend.trim()) { toast('Please type your question first.', 'warning'); return; }
        if (!consultationId || !doctorId) { toast('Missing consultation or doctor ID.', 'error'); return; }
        setShowInquiryConfirm(true);
    };

    const confirmSendInquiry = () => {
        setShowInquiryConfirm(false);
        createInquiryMutation.mutate(
            { consultationId: consultationId!, doctorId, questionText: inquiryText, aiImprovedText: aiImprovedText || undefined, requestType: inquiryRequestType },
            { onSuccess: () => { toast('Inquiry sent!', 'success'); setInquiryText(''); setAiImprovedText(''); setShowInquiryForm(false); }, onError: (err) => toast(err.message || 'Failed to send inquiry.', 'error') },
        );
    };

    const handleSubmit = () => {
        if (!diagnosis) { toast('Please enter a primary diagnosis.', 'warning'); return; }
        if (!consultationId) { toast('No consultation ID.', 'error'); return; }
        setShowSubmitConfirm(true);
    };

    const confirmSubmit = () => {
        setShowSubmitConfirm(false);
        const report: Record<string, unknown> = {
            diagnosis, icd10_code: icd10, differentials, clinical_reasoning: reasoning, non_pharmacologic: nonPharm,
            patient_education: { about_condition: aboutCondition, expectations, prevention },
            warning_signs: Object.entries(warningChecks).filter(([_, c]) => c).map(([sign]) => sign),
            follow_up: followUp, additional_notes: notes,
        };
        const prescriptionMeds = medications.filter(m => m.addToPrescription && m.name);
        const prescription = prescriptionMeds.length > 0 ? { medications: prescriptionMeds.map(m => ({ name: m.name, strength: m.strength, form: m.form, quantity: m.quantity, directions: m.directions, duration: m.duration })) } : undefined;

        submitReportMutation.mutate({ consultationId: consultationId!, report, prescription }, {
            onSuccess: () => { if (consultationId) clearDraft(consultationId); toast('Response submitted!', 'success'); navigate('/tabs', { replace: true }); },
            onError: (err) => toast(err.message || 'Failed to submit.', 'error'),
        });
    };

    const isSubmitting = submitReportMutation.isPending;

    return (
        <div style={s.container}>
            {/* Header */}
            <div style={s.header}>
                <BackButton />
                <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary }}>Medical Response</span>
                <button className="pressable" onClick={() => { haptic.light(); persistDraft(); toast('Draft saved locally.', 'success'); }}><span style={{ fontSize: 11, color: colors.warning, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Save size={12} color={colors.warning} /> Draft</span></button>
            </div>

            <div style={s.scroll} className="scrollable">
                <div style={s.scrollInner}>
                    {/* Request Additional Info toggle */}
                    <button style={s.inquiryToggle} className="pressable" onClick={() => { haptic.select(); setShowInquiryForm(!showInquiryForm); }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ fontSize: 14, color: colors.warning, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Search size={16} color={colors.warning} /> Request Additional Information</span>
                            <span style={{ fontSize: 16, color: colors.textTertiary }}>{showInquiryForm ? '▲' : '▼'}</span>
                        </div>
                        <span style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4, display: 'block', textAlign: 'left' }}>Ask the patient for more details</span>
                    </button>

                    {showInquiryForm && (
                        <div style={s.card}>
                            <span style={s.subLabel}>QUICK REQUESTS</span>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                {([['skin_photo', 'Skin Photo', Camera], ['medication_photo', 'Drug Label Photo', Pill], ['text', 'Text Question', MessageSquare]] as [string, string, (p: CliniqIconProps) => ReactNode][]).map(([type, label, Icon]) => (
                                    <button key={type} style={{ ...s.quickReqBtn, ...(inquiryRequestType === type ? s.quickReqBtnActive : {}) }} className="pressable" onClick={() => {
                                        haptic.select();
                                        setInquiryRequestType(type as any);
                                        if (type === 'skin_photo' && !inquiryText) setInquiryText('Please provide a clear photo of the affected skin area.');
                                        if (type === 'medication_photo' && !inquiryText) setInquiryText('Please take a photo of your medication labels.');
                                    }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: inquiryRequestType === type ? colors.warning : colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon size={14} /> {label}</span>
                                    </button>
                                ))}
                            </div>
                            <span style={s.subLabel}>YOUR QUESTION</span>
                            <textarea style={s.textarea} value={inquiryText} onChange={(e) => setInquiryText(e.target.value)} placeholder="e.g. Can you describe the rash in more detail?" rows={4} />
                            <button style={{ ...s.dashedBtn, marginTop: 8 }} className="pressable" onClick={() => { haptic.medium(); handleImproveWithAi(); }} disabled={isImprovingWithAi || !inquiryText.trim()}>
                                {isImprovingWithAi ? <div className="spinner" style={{ color: colors.accentTeal }} /> : <span style={{ fontSize: 14, color: colors.accentTeal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Sparkles size={14} /> Improve with AI</span>}
                            </button>
                            {aiImprovedText && (
                                <div style={{ marginTop: 12, backgroundColor: colors.bgTertiary, borderRadius: 12, padding: 12 }}>
                                    <span style={{ fontSize: 11, color: colors.accentTeal, fontWeight: 700, display: 'block', marginBottom: 4 }}>AI-IMPROVED VERSION</span>
                                    <p style={{ fontSize: 14, color: colors.textPrimary, lineHeight: '22px' }}>{aiImprovedText}</p>
                                    <button onClick={() => { haptic.light(); setInquiryText(aiImprovedText); setAiImprovedText(''); }} style={{ marginTop: 8 }}>
                                        <span style={{ fontSize: 11, color: colors.accentTeal }}>↑ Use this version</span>
                                    </button>
                                </div>
                            )}
                            <button style={{ ...s.submitBtn, marginTop: 12, backgroundColor: colors.warning }} className="pressable" onClick={() => { haptic.medium(); handleSendInquiry(); }} disabled={createInquiryMutation.isPending}>
                                {createInquiryMutation.isPending ? <div className="spinner" style={{ color: colors.bgPrimary }} /> : <span style={{ ...s.submitText, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Send size={14} color={colors.bgPrimary} /> Send Inquiry to Patient</span>}
                            </button>
                        </div>
                    )}

                    {/* Previous Inquiries */}
                    {inquiries.length > 0 && (
                        <div style={{ ...s.card, marginBottom: 20 }}>
                            <span style={s.subLabel}>PREVIOUS INQUIRIES</span>
                            {inquiries.map((inq: DoctorInquiry) => (
                                <div key={inq.id} style={{ backgroundColor: colors.bgTertiary, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 11, color: colors.textSecondary }}>{new Date(inq.created_at).toLocaleDateString()}</span>
                                        <span style={{ paddingInline: 8, paddingBlock: 2, borderRadius: 6, fontSize: 10, fontWeight: 700, backgroundColor: inq.status === 'answered' ? colors.successFaded : colors.warningFaded, color: inq.status === 'answered' ? colors.success : colors.warning, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{inq.status === 'answered' ? <><CheckCircle size={10} /> ANSWERED</> : <><Clock size={10} /> PENDING</>}</span>
                                    </div>
                                    <p style={{ fontSize: 14, color: colors.textPrimary }}>{inq.ai_improved_text || inq.question_text}</p>
                                    {inq.status === 'answered' && inq.response_summary && (
                                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
                                            <span style={{ fontSize: 11, color: colors.accentTeal, fontWeight: 700, display: 'block', marginBottom: 4 }}>PATIENT RESPONSE</span>
                                            <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: '20px' }}>
                                                {typeof inq.response_summary === 'object' && (inq.response_summary as any)?.summary ? (inq.response_summary as any).summary : JSON.stringify(inq.response_summary).slice(0, 300)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 1. Clinical Assessment */}
                    <SectionHeader title="1. Clinical Assessment" Icon={Microscope} />
                    <div style={s.card}>
                        <Label text="Primary Diagnosis *" />
                        <input style={s.input} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Contact Dermatitis" />
                        <Label text="ICD-10 Code" />
                        <input style={s.input} value={icd10} onChange={(e) => setIcd10(e.target.value)} placeholder="e.g. L25.1" />
                        <Label text="Differential Diagnoses" />
                        <textarea style={s.textarea} value={differentials} onChange={(e) => setDifferentials(e.target.value)} placeholder="List differential diagnoses" rows={3} />
                        <Label text="Clinical Reasoning" />
                        <textarea style={s.textarea} value={reasoning} onChange={(e) => setReasoning(e.target.value)} placeholder="Explain your reasoning" rows={4} />
                    </div>

                    {/* 2. Treatment Plan */}
                    <SectionHeader title="2. Treatment Plan" Icon={Pill} />
                    <div style={s.card}>
                        <span style={s.subLabel}>Pharmacologic</span>
                        {medications.map((med, i) => (
                            <div key={i} style={s.medForm}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 600 }}>Medication {i + 1}</span>
                                    {medications.length > 1 && <button className="pressable" onClick={() => { haptic.light(); removeMedication(i); }}><span style={{ fontSize: 11, color: colors.error, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Trash size={11} color={colors.error} /> Remove</span></button>}
                                </div>
                                <input style={s.inputSm} value={med.name} onChange={(e) => updateMed(i, 'name', e.target.value)} placeholder="Drug name" />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input style={{ ...s.inputSm, flex: 1 }} value={med.strength} onChange={(e) => updateMed(i, 'strength', e.target.value)} placeholder="Strength" />
                                    <input style={{ ...s.inputSm, flex: 1 }} value={med.form} onChange={(e) => updateMed(i, 'form', e.target.value)} placeholder="Form" />
                                </div>
                                <input style={s.inputSm} value={med.directions} onChange={(e) => updateMed(i, 'directions', e.target.value)} placeholder="Sig (directions)" />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input style={{ ...s.inputSm, flex: 1 }} value={med.quantity} onChange={(e) => updateMed(i, 'quantity', e.target.value)} placeholder="Qty" />
                                    <input style={{ ...s.inputSm, flex: 1 }} value={med.duration} onChange={(e) => updateMed(i, 'duration', e.target.value)} placeholder="Duration" />
                                </div>
                                <button style={{ ...s.prescToggle, ...(med.addToPrescription ? s.prescToggleActive : {}) }} className="pressable" onClick={() => { haptic.select(); updateMed(i, 'addToPrescription', !med.addToPrescription); }}>
                                    <span style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center' }}>{med.addToPrescription ? '✓ Add to Prescription' : '○ Not in Prescription'}</span>
                                </button>
                            </div>
                        ))}
                        <button style={s.dashedBtn} className="pressable" onClick={() => { haptic.light(); addMedication(); }}><span style={{ fontSize: 14, color: colors.accentTeal }}>+ Add Medication</span></button>
                        <span style={{ ...s.subLabel, marginTop: 16, display: 'block' }}>Non-Pharmacologic</span>
                        <textarea style={s.textarea} value={nonPharm} onChange={(e) => setNonPharm(e.target.value)} placeholder="e.g. Cool compresses, avoid irritants" rows={3} />
                    </div>

                    {/* 3. Patient Education */}
                    <SectionHeader title="3. Patient Education" Icon={BookOpen} />
                    <div style={s.card}>
                        <Label text="About Your Condition" /><textarea style={s.textarea} value={aboutCondition} onChange={(e) => setAboutCondition(e.target.value)} placeholder="Plain-language explanation" rows={4} />
                        <Label text="What to Expect" /><textarea style={s.textarea} value={expectations} onChange={(e) => setExpectations(e.target.value)} placeholder="Timeline and expected course" rows={3} />
                        <Label text="Prevention Tips" /><textarea style={s.textarea} value={prevention} onChange={(e) => setPrevention(e.target.value)} placeholder="Steps to prevent recurrence" rows={3} />
                    </div>

                    {/* 4. Warning Signs */}
                    <SectionHeader title="4. Warning Signs & Follow-Up" Icon={Siren} />
                    <div style={s.card}>
                        <span style={s.subLabel}>Red Flag Symptoms</span>
                        {Object.entries(warningChecks).map(([key, checked]) => (
                            <button key={key} style={s.checkRow} className="pressable" onClick={() => { haptic.select(); setWarningChecks({ ...warningChecks, [key]: !checked }); }}>
                                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? colors.accentTeal : colors.border}`, backgroundColor: checked ? colors.accentTealFaded : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                    {checked && <CheckCircle size={14} color={colors.accentTeal} />}
                                </div>
                                <span style={{ fontSize: 14, color: colors.textPrimary }}>{key}</span>
                            </button>
                        ))}
                        <Label text="Follow-Up Recommendation" /><textarea style={s.textarea} value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="e.g. Follow up in 1 week" rows={2} />
                    </div>

                    {/* 5. Additional Notes */}
                    <SectionHeader title="5. Additional Notes (Optional)" Icon={FileText} />
                    <div style={s.card}>
                        <textarea style={s.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes, allergy warnings, drug interactions" rows={4} />
                    </div>

                    {/* 6. Interventions */}
                    <SectionHeader title="6. Suggest Interventions" Icon={TestTube} />
                    <div style={s.card}>
                        <span style={s.subLabel}>Tests, Imaging & Referrals</span>
                        <span style={{ fontSize: 11, color: colors.textTertiary, display: 'block', marginBottom: 12 }}>Select interventions from the catalog. The patient will be notified.</span>
                        <button style={s.dashedBtn} className="pressable" onClick={() => { haptic.medium(); navigate(`/consultation/${consultationId}/intervention-order?specialty=${consultation?.specialty || 'dermatology'}`); }}><span style={{ fontSize: 14, color: colors.accentTeal, display: 'inline-flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} color={colors.accentTeal} /> Select from Catalog</span></button>
                    </div>

                    {/* Actions */}
                    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <button style={s.previewBtn} className="pressable" onClick={() => { haptic.light(); setShowPreview(true); }}><span style={{ fontSize: 14, color: colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Eye size={16} color={colors.textSecondary} /> Preview Patient View</span></button>
                        <button style={{ ...s.submitBtn, opacity: isSubmitting ? 0.6 : 1 }} className="pressable" onClick={() => { haptic.heavy(); handleSubmit(); }} disabled={isSubmitting}>
                            {isSubmitting ? <div className="spinner" style={{ color: colors.bgPrimary }} /> : <span style={{ ...s.submitText, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Edit size={16} color={colors.bgPrimary} /> Submit & Generate E-Prescription</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div style={s.overlay} onClick={() => setShowPreview(false)}>
                    <div style={s.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Eye size={18} color={colors.textPrimary} /> Patient View Preview</span>
                            <button onClick={() => setShowPreview(false)}><span style={{ fontSize: 18, color: colors.textTertiary }}>✕</span></button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                            <span style={s.prevSecTitle}>Diagnosis</span><p style={s.prevContent}>{diagnosis || '(not filled)'}</p>
                            {reasoning && <><span style={s.prevSecTitle}>Clinical Reasoning</span><p style={s.prevContent}>{reasoning}</p></>}
                            {medications.filter(m => m.name).length > 0 && (
                                <><span style={s.prevSecTitle}>Medications</span>{medications.filter(m => m.name).map((m, i) => (
                                    <div key={i} style={{ backgroundColor: colors.bgTertiary, borderRadius: 10, padding: 12, marginBottom: 8, border: `1px solid ${colors.border}` }}>
                                        <span style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 600, display: 'block' }}>{m.name} {m.strength}</span>
                                        <span style={{ fontSize: 11, color: colors.textSecondary, display: 'block' }}>{m.form} · Qty: {m.quantity || '—'} · {m.duration || '—'}</span>
                                        <span style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2, display: 'block' }}>{m.directions || '—'}</span>
                                    </div>
                                ))}</>
                            )}
                            {nonPharm && <><span style={s.prevSecTitle}>Non-Drug Treatment</span><p style={s.prevContent}>{nonPharm}</p></>}
                            {aboutCondition && <><span style={s.prevSecTitle}>About Your Condition</span><p style={s.prevContent}>{aboutCondition}</p></>}
                            {Object.entries(warningChecks).filter(([_, v]) => v).length > 0 && (
                                <><span style={s.prevSecTitle}>Warning Signs</span>{Object.entries(warningChecks).filter(([_, v]) => v).map(([sign]) => <p key={sign} style={s.prevContent}>• {sign}</p>)}</>
                            )}
                            {followUp && <><span style={s.prevSecTitle}>Follow-Up</span><p style={s.prevContent}>{followUp}</p></>}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                visible={showInquiryConfirm}
                title="Send Inquiry"
                message="This will notify the patient and request additional information. Continue?"
                confirmLabel="Send"
                cancelLabel="Cancel"
                onConfirm={confirmSendInquiry}
                onCancel={() => setShowInquiryConfirm(false)}
            />
            <ConfirmDialog
                visible={showSubmitConfirm}
                title="Submit Response"
                message="Submit your response and generate the e-prescription? This action cannot be undone."
                confirmLabel="Submit"
                cancelLabel="Review Again"
                onConfirm={confirmSubmit}
                onCancel={() => setShowSubmitConfirm(false)}
            />
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 20, paddingBlock: 12, borderBottom: `1px solid ${colors.border}` },
    scroll: { flex: 1 },
    scrollInner: { padding: 20, paddingBottom: 40 },
    sectionTitle: { display: 'block', fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary, marginTop: 20, marginBottom: 10 },
    card: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, border: `1px solid ${colors.border}`, marginBottom: 16 },
    label: { display: 'block', fontSize: 11, color: colors.textSecondary, marginTop: 12, marginBottom: 4, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
    subLabel: { fontSize: 11, color: colors.accentTeal, fontWeight: 700, textTransform: 'uppercase' as any, letterSpacing: 1, marginBottom: 8, display: 'block' },
    input: { display: 'block', width: '100%', backgroundColor: colors.bgTertiary, borderRadius: 10, paddingInline: 14, paddingBlock: 12, color: colors.textPrimary, fontSize: 14, border: `1px solid ${colors.border}` },
    inputSm: { display: 'block', width: '100%', backgroundColor: colors.bgTertiary, borderRadius: 8, paddingInline: 12, paddingBlock: 10, color: colors.textPrimary, fontSize: 11, border: `1px solid ${colors.border}`, marginBottom: 8 },
    textarea: { display: 'block', width: '100%', backgroundColor: colors.bgTertiary, borderRadius: 10, paddingInline: 14, paddingBlock: 12, color: colors.textPrimary, fontSize: 14, border: `1px solid ${colors.border}`, resize: 'vertical' as any, minHeight: 80, fontFamily: 'inherit' },
    medForm: { backgroundColor: colors.bgTertiary, borderRadius: 12, padding: 12, marginBottom: 10 },
    prescToggle: { paddingBlock: 8, paddingInline: 12, borderRadius: 8, backgroundColor: colors.bgSecondary, marginTop: 4, width: '100%' },
    prescToggleActive: { backgroundColor: colors.successFaded },
    dashedBtn: { paddingBlock: 12, borderRadius: 10, border: `1px dashed ${colors.accentTeal}`, width: '100%', marginTop: 4 },
    checkRow: { display: 'flex', alignItems: 'center', paddingBlock: 8, width: '100%', textAlign: 'left' as any },
    previewBtn: { width: '100%', backgroundColor: colors.bgSecondary, borderRadius: 16, paddingBlock: 16, border: `1px solid ${colors.border}` },
    submitBtn: { width: '100%', backgroundColor: colors.accentTeal, borderRadius: 16, paddingBlock: 18 },
    submitText: { fontSize: 15, fontWeight: 700, color: colors.bgPrimary },
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 100 },
    modal: { backgroundColor: colors.bgSecondary, borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '85%', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottom: `1px solid ${colors.border}` },
    prevSecTitle: { display: 'block', fontSize: 14, fontWeight: 600, color: colors.accentTeal, marginTop: 16, marginBottom: 6 },
    prevContent: { fontSize: 14, color: colors.textPrimary, lineHeight: '22px' },
    inquiryToggle: { display: 'block', width: '100%', backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, border: `1.5px solid ${colors.warning}`, marginBottom: 16, textAlign: 'left' as any },
    quickReqBtn: { paddingBlock: 8, paddingInline: 14, borderRadius: 20, border: `1.5px solid ${colors.border}`, backgroundColor: colors.bgTertiary },
    quickReqBtnActive: { borderColor: colors.warning, backgroundColor: colors.warningFaded },
};
