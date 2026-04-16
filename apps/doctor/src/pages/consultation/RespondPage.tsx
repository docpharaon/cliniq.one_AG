import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { colors, typography, Save, Search, Camera, Pill, MessageSquare, Sparkles, Send, Microscope, BookOpen, Siren, FileText, TestTube, Eye, Stethoscope, Leaf, Calendar, ClipboardList, Trash, CheckCircle, Clock, Edit, VoiceInputBar, useVoiceInput } from '@cliniqone/ui';
import { useI18n } from '@cliniqone/i18n';
import type { CliniqIconProps } from '@cliniqone/ui';
import { useSubmitReport, useCreateInquiry, useDoctorInquiries, useConsultationDetail } from '../../hooks/useDoctorData';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '@cliniqone/api';
import { BackButton } from '../../components/BackButton';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';
import { haptic } from '../../hooks/useHaptics';
import { 
    saveDoctorDraft, getDoctorDraft, deleteDoctorDraft 
} from '@cliniqone/api';
import type { DoctorInquiry } from '@cliniqone/types';
import type { CSSProperties, ReactNode } from 'react';

interface Medication {
    name: string; strength: string; form: string; quantity: string; directions: string; duration: string; addToPrescription: boolean;
}
const emptyMed: Medication = { name: '', strength: '', form: 'Cream', quantity: '', directions: '', duration: '', addToPrescription: true };



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

    // Inquiry state
    const [inquiryText, setInquiryText] = useState('');
    const [aiImprovedText, setAiImprovedText] = useState('');
    const [isImprovingWithAi, setIsImprovingWithAi] = useState(false);
    const [showInquiryForm, setShowInquiryForm] = useState(false);
    const [inquiryRequestType, setInquiryRequestType] = useState<'text' | 'skin_photo' | 'medication_photo' | 'document_photo'>('text');

    const { t, isRTL, locale } = useI18n();

    // Clinical Assessment
    const [diagnosis, setDiagnosis] = useState('');
    const [icd10, setIcd10] = useState('');
    const [differentials, setDifferentials] = useState('');
    const [reasoning, setReasoning] = useState('');
    // Treatment Plan
    const [medications, setMedications] = useState<Medication[]>([{ ...emptyMed }]);
    const [nonPharm, setNonPharm] = useState('');
    // Patient Education
    const [aboutCondition, setAboutCondition] = useState('');
    const [expectations, setExpectations] = useState('');
    const [prevention, setPrevention] = useState('');
    // Warning Signs
    const [warningChecks, setWarningChecks] = useState<Record<string, boolean>>({
        'fever': false, 'rapidSpread': false, 'breathing': false, 'swelling': false, 'worsening': false,
    });
    const [followUp, setFollowUp] = useState('');
    // Notes
    const [notes, setNotes] = useState('');

    const [isDraftLoaded, setIsDraftLoaded] = useState(false);
    // Preview
    const [showPreview, setShowPreview] = useState(false);
    const [showInquiryConfirm, setShowInquiryConfirm] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [lastFocusedField, setLastFocusedField] = useState<string | null>(null);
    const [showVoiceBar, setShowVoiceBar] = useState(true);
    const toast = useToast((s) => s.show);

    // Fetch draft from cloud on mount
    useEffect(() => {
        if (!consultationId || !doctorId) return;
        
        getDoctorDraft(doctorId, consultationId).then(draftRow => {
            if (draftRow?.content) {
                try {
                    const d = JSON.parse(draftRow.content);
                    if (d.diagnosis) setDiagnosis(d.diagnosis);
                    if (d.icd10) setIcd10(d.icd10);
                    if (d.differentials) setDifferentials(d.differentials);
                    if (d.reasoning) setReasoning(d.reasoning);
                    if (d.medications) setMedications(d.medications);
                    if (d.nonPharm) setNonPharm(d.nonPharm);
                    if (d.aboutCondition) setAboutCondition(d.aboutCondition);
                    if (d.expectations) setExpectations(d.expectations);
                    if (d.prevention) setPrevention(d.prevention);
                    if (d.warningChecks) setWarningChecks(d.warningChecks);
                    if (d.followUp) setFollowUp(d.followUp);
                    if (d.notes) setNotes(d.notes);
                } catch (e) {
                    console.error('Failed to parse cloud draft', e);
                }
            }
            setIsDraftLoaded(true);
        }).catch(e => {
            console.error('Failed to fetch cloud draft', e);
            setIsDraftLoaded(true);
        });
    }, [consultationId, doctorId]);

    // Auto-save draft whenever form fields change
    const persistDraft = useCallback(() => {
        if (!consultationId || !doctorId || !isDraftLoaded) return;
        const draftContent = JSON.stringify({ diagnosis, icd10, differentials, reasoning, medications, nonPharm, aboutCondition, expectations, prevention, warningChecks, followUp, notes });
        saveDoctorDraft(doctorId, consultationId, draftContent).catch(e => console.warn('Draft save failed', e));
    }, [consultationId, doctorId, isDraftLoaded, diagnosis, icd10, differentials, reasoning, medications, nonPharm, aboutCondition, expectations, prevention, warningChecks, followUp, notes]);

    useEffect(() => {
        const timer = setTimeout(persistDraft, 2000); // 2s debounce for cloud
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
            const { data: fnData } = await supabase.functions.invoke('ai-intake', { body: { action: 'improve-inquiry', questionText: inquiryText, language: locale } });
            if (fnData?.improvedText) setAiImprovedText(fnData.improvedText);
        } catch { toast(t('common.error'), 'error'); }
        finally { setIsImprovingWithAi(false); }
    };

    const handleSendInquiry = () => {
        const textToSend = aiImprovedText || inquiryText;
        if (!textToSend.trim()) { toast(t('doctor.questionPlaceholder'), 'warning'); return; }
        if (!consultationId || !doctorId) { toast(t('common.error'), 'error'); return; }
        setShowInquiryConfirm(true);
    };

    const confirmSendInquiry = () => {
        setShowInquiryConfirm(false);
        createInquiryMutation.mutate(
            { consultationId: consultationId!, doctorId, questionText: inquiryText, aiImprovedText: aiImprovedText || undefined, requestType: inquiryRequestType },
            { onSuccess: () => { toast(t('doctor.sendInquiry'), 'success'); setInquiryText(''); setAiImprovedText(''); setShowInquiryForm(false); }, onError: (err) => toast(err.message || t('common.error'), 'error') },
        );
    };

    const handleSubmit = () => {
        if (!diagnosis) { toast(t('doctor.primaryDiagnosis'), 'warning'); return; }
        if (!consultationId) { toast(t('common.error'), 'error'); return; }
        setShowSubmitConfirm(true);
    };

    const confirmSubmit = () => {
        setShowSubmitConfirm(false);
        const report: Record<string, unknown> = {
            diagnosis, icd10_code: icd10, differentials, clinical_reasoning: reasoning, non_pharmacologic: nonPharm,
            patient_education: { about_condition: aboutCondition, expectations, prevention },
            warning_signs: Object.entries(warningChecks).filter(([_, c]) => c).map(([key]) => t(`doctor.warningSigns.${key}`)),
            follow_up: followUp, additional_notes: notes,
        };
        const prescriptionMeds = medications.filter(m => m.addToPrescription && m.name);
        const prescription = prescriptionMeds.length > 0 ? { medications: prescriptionMeds.map(m => ({ name: m.name, strength: m.strength, form: m.form, quantity: m.quantity, directions: m.directions, duration: m.duration })) } : undefined;

        submitReportMutation.mutate({ consultationId: consultationId!, report, prescription }, {
            onSuccess: () => { if (consultationId && doctorId) deleteDoctorDraft(doctorId, consultationId).catch(() => {}); toast(t('doctor.submittedSuccess'), 'success'); navigate('/tabs', { replace: true }); },
            onError: (err) => toast(err.message || t('common.error'), 'error'),
        });
    };

    const isSubmitting = submitReportMutation.isPending;

    // ── Voice Input Integration ─────────────────
    const handleVoiceTranscript = (text: string) => {
        if (!text) return;
        haptic.medium();
        
        // Map focused field to setter
        const fieldMap: Record<string, (v: string) => void> = {
            diagnosis: d => setDiagnosis(prev => prev ? `${prev} ${d}` : d),
            icd10: v => setIcd10(v),
            differentials: v => setDifferentials(prev => prev ? `${prev}\n${v}` : v),
            reasoning: v => setReasoning(prev => prev ? `${prev}\n${v}` : v),
            nonPharm: v => setNonPharm(prev => prev ? `${prev}\n${v}` : v),
            aboutCondition: v => setAboutCondition(prev => prev ? `${prev}\n${v}` : v),
            expectations: v => setExpectations(prev => prev ? `${prev}\n${v}` : v),
            prevention: v => setPrevention(prev => prev ? `${prev}\n${v}` : v),
            followUp: v => setFollowUp(prev => prev ? `${prev}\n${v}` : v),
            notes: v => setNotes(prev => prev ? `${prev}\n${v}` : v),
            inquiry: v => setInquiryText(prev => prev ? `${prev} ${v}` : v),
        };

        const targetField = lastFocusedField || 'diagnosis';
        const setter = fieldMap[targetField];
        if (setter) {
            setter(text);
            toast(t('doctor.addedTo', { field: t(`doctor.${targetField}`) }), 'success');
        }
    };

    const voice = useVoiceInput({
        onTranscriptReady: handleVoiceTranscript,
        language: locale,
        enabled: true,
    });

    return (
        <div style={s.container}>
            {/* Header */}
            <div style={s.header}>
                <BackButton />
                <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary }}>{t('doctor.medicalResponse')}</span>
                <button className="pressable" onClick={() => { haptic.light(); persistDraft(); toast(t('doctor.draftSaved'), 'success'); }}><span style={{ fontSize: 11, color: colors.warning, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Save size={12} color={colors.warning} /> {t('doctor.saveDraft')}</span></button>
            </div>

            <div style={s.scroll} className="scrollable">
                <div style={s.scrollInner}>
                    {/* Request Additional Info toggle */}
                    <button style={s.inquiryToggle} className="pressable" onClick={() => { haptic.select(); setShowInquiryForm(!showInquiryForm); }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ fontSize: 14, color: colors.warning, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Search size={16} color={colors.warning} /> {t('doctor.requestInfo')}</span>
                            <span style={{ fontSize: 16, color: colors.textTertiary }}>{showInquiryForm ? '▲' : '▼'}</span>
                        </div>
                        <span style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4, display: 'block', textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.requestInfoDesc')}</span>
                    </button>

                    {showInquiryForm && (
                        <div style={s.card}>
                            <span style={s.subLabel}>{t('doctor.quickRequests')}</span>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                {([['skin_photo', t('doctor.skinPhoto'), Camera], ['medication_photo', t('doctor.drugLabel'), Pill], ['text', t('doctor.textQuestion'), MessageSquare]] as [string, string, (p: CliniqIconProps) => ReactNode][]).map(([type, label, Icon]) => (
                                    <button key={type} style={{ ...s.quickReqBtn, ...(inquiryRequestType === type ? s.quickReqBtnActive : {}) }} className="pressable" onClick={() => {
                                        haptic.select();
                                        setInquiryRequestType(type as any);
                                        if (type === 'skin_photo' && !inquiryText) setInquiryText(t('doctor.skinPhoto'));
                                        if (type === 'medication_photo' && !inquiryText) setInquiryText(t('doctor.drugLabel'));
                                    }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: inquiryRequestType === type ? colors.warning : colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon size={14} /> {label}</span>
                                    </button>
                                ))}
                            </div>
                            <span style={s.subLabel}>{t('doctor.yourQuestion')}</span>
                            <textarea
                                style={s.textarea}
                                value={inquiryText}
                                onChange={(e) => setInquiryText(e.target.value)}
                                onFocus={() => setLastFocusedField('inquiry')}
                                placeholder={t('doctor.questionPlaceholder')}
                                rows={4}
                            />
                            <button style={{ ...s.dashedBtn, marginTop: 8 }} className="pressable" onClick={() => { haptic.medium(); handleImproveWithAi(); }} disabled={isImprovingWithAi || !inquiryText.trim()}>
                                {isImprovingWithAi ? <div className="spinner" style={{ color: colors.accentTeal }} /> : <span style={{ fontSize: 14, color: colors.accentTeal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Sparkles size={14} /> {t('doctor.improveWithAi')}</span>}
                            </button>
                            {aiImprovedText && (
                                <div style={{ marginTop: 12, backgroundColor: colors.bgTertiary, borderRadius: 12, padding: 12 }}>
                                    <span style={{ fontSize: 11, color: colors.accentTeal, fontWeight: 700, display: 'block', marginBottom: 4 }}>{t('doctor.aiImprovedVersion')}</span>
                                    <p style={{ fontSize: 14, color: colors.textPrimary, lineHeight: '22px' }}>{aiImprovedText}</p>
                                    <button onClick={() => { haptic.light(); setInquiryText(aiImprovedText); setAiImprovedText(''); }} style={{ marginTop: 8 }}>
                                        <span style={{ fontSize: 11, color: colors.accentTeal }}>↑ {t('doctor.useThisVersion')}</span>
                                    </button>
                                </div>
                            )}
                            <button style={{ ...s.submitBtn, marginTop: 12, backgroundColor: colors.warning }} className="pressable" onClick={() => { haptic.medium(); handleSendInquiry(); }} disabled={createInquiryMutation.isPending}>
                                {createInquiryMutation.isPending ? <div className="spinner" style={{ color: colors.bgPrimary }} /> : <span style={{ ...s.submitText, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Send size={14} color={colors.bgPrimary} /> {t('doctor.sendInquiry')}</span>}
                            </button>
                        </div>
                    )}

                    {/* Previous Inquiries */}
                    {inquiries.length > 0 && (
                        <div style={{ ...s.card, marginBottom: 20 }}>
                            <span style={s.subLabel}>{t('doctor.previousInquiries')}</span>
                            {inquiries.map((inq: DoctorInquiry) => (
                                <div key={inq.id} style={{ backgroundColor: colors.bgTertiary, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 11, color: colors.textSecondary }}>{new Date(inq.created_at).toLocaleDateString()}</span>
                                        <span style={{ paddingInline: 8, paddingBlock: 2, borderRadius: 6, fontSize: 10, fontWeight: 700, backgroundColor: inq.status === 'answered' ? colors.successFaded : colors.warningFaded, color: inq.status === 'answered' ? colors.success : colors.warning, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{inq.status === 'answered' ? <><CheckCircle size={10} /> {t('common.done')}</> : <><Clock size={10} /> {t('consultations.statusPending')}</>}</span>
                                    </div>
                                    <p style={{ fontSize: 14, color: colors.textPrimary }}>{inq.ai_improved_text || inq.question_text}</p>
                                    {inq.status === 'answered' && inq.response_summary && (
                                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
                                            <span style={{ fontSize: 11, color: colors.accentTeal, fontWeight: 700, display: 'block', marginBottom: 4 }}>{t('doctor.patientResponse')}</span>
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
                    <SectionHeader title={t('doctor.clinicalAssessmentTitle')} Icon={Microscope} />
                    <div style={s.card}>
                        <Label text={t('doctor.primaryDiagnosis')} />
                        <input
                            style={s.input}
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            onFocus={() => setLastFocusedField('diagnosis')}
                            placeholder={t('doctor.diagnosisPlaceholder')}
                        />
                        <Label text={t('doctor.icd10Code')} />
                        <input
                            style={s.input}
                            value={icd10}
                            onChange={(e) => setIcd10(e.target.value)}
                            onFocus={() => setLastFocusedField('icd10')}
                            placeholder="e.g. L25.1"
                        />
                        <Label text={t('doctor.differentialDiagnoses')} />
                        <textarea
                            style={s.textarea}
                            value={differentials}
                            onChange={(e) => setDifferentials(e.target.value)}
                            onFocus={() => setLastFocusedField('differentials')}
                            placeholder={t('doctor.diffPlaceholder')}
                            rows={3}
                        />
                        <Label text={t('doctor.clinicalReasoning')} />
                        <textarea
                            style={s.textarea}
                            value={reasoning}
                            onChange={(e) => setReasoning(e.target.value)}
                            onFocus={() => setLastFocusedField('reasoning')}
                            placeholder={t('doctor.reasoningPlaceholder')}
                            rows={4}
                        />
                    </div>

                    {/* 2. Treatment Plan */}
                    <SectionHeader title={t('doctor.treatmentPlanTitle')} Icon={Pill} />
                    <div style={s.card}>
                        <span style={s.subLabel}>{t('doctor.pharmacologic')}</span>
                        {medications.map((med, i) => (
                            <div key={i} style={s.medForm}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 600 }}>{t('intake.consultation')} {i + 1}</span>
                                    {medications.length > 1 && <button className="pressable" onClick={() => { haptic.light(); removeMedication(i); }}><span style={{ fontSize: 11, color: colors.error, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Trash size={11} color={colors.error} /> {t('common.delete')}</span></button>}
                                </div>
                                <input style={s.inputSm} value={med.name} onChange={(e) => updateMed(i, 'name', e.target.value)} placeholder={t('kyc.processStep2')} />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input style={{ ...s.inputSm, flex: 1 }} value={med.strength} onChange={(e) => updateMed(i, 'strength', e.target.value)} placeholder={t('doctor.dosage')} />
                                    <input style={{ ...s.inputSm, flex: 1 }} value={med.form} onChange={(e) => updateMed(i, 'form', e.target.value)} placeholder={t('kyc.statusResubmission')} />
                                </div>
                                <input style={s.inputSm} value={med.directions} onChange={(e) => updateMed(i, 'directions', e.target.value)} placeholder={t('consultations.statusReportReady')} />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input style={{ ...s.inputSm, flex: 1 }} value={med.quantity} onChange={(e) => updateMed(i, 'quantity', e.target.value)} placeholder={t('consultDetail.dosage')} />
                                    <input style={{ ...s.inputSm, flex: 1 }} value={med.duration} onChange={(e) => updateMed(i, 'duration', e.target.value)} placeholder={t('doctor.duration')} />
                                </div>
                                <button style={{ ...s.prescToggle, ...(med.addToPrescription ? s.prescToggleActive : {}) }} className="pressable" onClick={() => { haptic.select(); updateMed(i, 'addToPrescription', !med.addToPrescription); }}>
                                    <span style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center' }}>{med.addToPrescription ? `✓ ${t('doctor.prescriptions')}` : `○ ${t('doctor.internalNotes')}`}</span>
                                </button>
                            </div>
                        ))}
                        <button style={s.dashedBtn} className="pressable" onClick={() => { haptic.light(); addMedication(); }}><span style={{ fontSize: 14, color: colors.accentTeal }}>+ {t('doctor.addMedication')}</span></button>
                        <span style={{ ...s.subLabel, marginTop: 16, display: 'block' }}>{t('doctor.nonPharmacologic')}</span>
                        <textarea
                            style={s.textarea}
                            value={nonPharm}
                            onChange={(e) => setNonPharm(e.target.value)}
                            onFocus={() => setLastFocusedField('nonPharm')}
                            placeholder={t('doctor.nonPharmPlaceholder')}
                            rows={3}
                        />
                    </div>

                    {/* 3. Patient Education */}
                    <SectionHeader title={t('doctor.patientEducationTitle')} Icon={BookOpen} />
                    <div style={s.card}>
                        <Label text={t('doctor.aboutCondition')} />
                        <textarea
                            style={s.textarea}
                            value={aboutCondition}
                            onChange={(e) => setAboutCondition(e.target.value)}
                            onFocus={() => setLastFocusedField('aboutCondition')}
                            placeholder={t('consultDetail.patientEducation')}
                            rows={4}
                        />
                        <Label text={t('doctor.whatToExpect')} />
                        <textarea
                            style={s.textarea}
                            value={expectations}
                            onChange={(e) => setExpectations(e.target.value)}
                            onFocus={() => setLastFocusedField('expectations')}
                            placeholder={t('doctor.whatToExpect')}
                            rows={3}
                        />
                        <Label text={t('doctor.preventionTips')} />
                        <textarea
                            style={s.textarea}
                            value={prevention}
                            onChange={(e) => setPrevention(e.target.value)}
                            onFocus={() => setLastFocusedField('prevention')}
                            placeholder={t('doctor.preventionTips')}
                            rows={3}
                        />
                    </div>

                    {/* 4. Warning Signs */}
                    <SectionHeader title={t('doctor.warningSignsTitle')} Icon={Siren} />
                    <div style={s.card}>
                        <span style={s.subLabel}>{t('doctor.redFlags')}</span>
                        {Object.entries(warningChecks).map(([key, checked]) => (
                            <button key={key} style={{ ...s.checkRow, flexDirection: isRTL ? 'row-reverse' : 'row' }} className="pressable" onClick={() => { haptic.select(); setWarningChecks({ ...warningChecks, [key]: !checked }); }}>
                                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? colors.accentTeal : colors.border}`, backgroundColor: checked ? colors.accentTealFaded : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', [isRTL ? 'marginLeft' : 'marginRight']: 10 }}>
                                    {checked && <CheckCircle size={14} color={colors.accentTeal} />}
                                </div>
                                <span style={{ fontSize: 14, color: colors.textPrimary }}>{t(`doctor.warningSigns.${key}`)}</span>
                            </button>
                        ))}
                        <Label text={t('doctor.followUpRec')} />
                        <textarea
                            style={s.textarea}
                            value={followUp}
                            onChange={(e) => setFollowUp(e.target.value)}
                            onFocus={() => setLastFocusedField('followUp')}
                            placeholder={t('consultDetail.followUp')}
                            rows={2}
                        />
                    </div>

                    {/* 5. Additional Notes */}
                    <SectionHeader title={t('doctor.additionalNotesTitle')} Icon={FileText} />
                    <div style={s.card}>
                        <textarea
                            style={s.textarea}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            onFocus={() => setLastFocusedField('notes')}
                            placeholder={t('doctor.notesPlaceholder')}
                            rows={4}
                        />
                    </div>

                    {/* 6. Interventions */}
                    <SectionHeader title={t('doctor.interventionsTitle')} Icon={TestTube} />
                    <div style={s.card}>
                        <span style={s.subLabel}>{t('doctor.interventionsTitle')}</span>
                        <span style={{ fontSize: 11, color: colors.textTertiary, display: 'block', marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.interventionsDesc')}</span>
                        <button style={s.dashedBtn} className="pressable" onClick={() => { haptic.medium(); navigate(`/consultation/${consultationId}/intervention-order?specialty=${consultation?.specialty || 'dermatology'}`); }}><span style={{ fontSize: 14, color: colors.accentTeal, display: 'inline-flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} color={colors.accentTeal} /> {t('doctor.selectFromCatalog')}</span></button>
                    </div>

                    {/* Actions */}
                    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <button style={s.previewBtn} className="pressable" onClick={() => { haptic.light(); setShowPreview(true); }}><span style={{ fontSize: 14, color: colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Eye size={16} color={colors.textSecondary} /> {t('doctor.previewPatientView')}</span></button>
                        <button style={{ ...s.submitBtn, opacity: isSubmitting ? 0.6 : 1 }} className="pressable" onClick={() => { haptic.heavy(); handleSubmit(); }} disabled={isSubmitting}>
                            {isSubmitting ? <div className="spinner" style={{ color: colors.bgPrimary }} /> : <span style={{ ...s.submitText, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Edit size={16} color={colors.bgPrimary} /> {t('doctor.submitAndGenerate')}</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Voice Input Bar */}
            {showVoiceBar && (
                <div style={s.voiceContainer}>
                    <VoiceInputBar
                        voiceState={voice.voiceState}
                        audioLevel={voice.audioLevel}
                        error={voice.error}
                        voiceMode={voice.voiceMode}
                        recordingDuration={voice.recordingDuration}
                        isSupported={voice.isSupported}
                        isRTL={isRTL}
                        enabled={true}
                        onStartListening={voice.startListening}
                        onStopListening={voice.stopListening}
                        onCancel={voice.cancelRecording}
                        onSetVoiceMode={voice.setVoiceMode}
                        onLockContinuous={voice.lockContinuous}
                        onSwitchToText={() => setShowVoiceBar(false)}
                        onDismissError={voice.cancelRecording}
                    />
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div style={s.overlay} onClick={() => setShowPreview(false)}>
                    <div style={s.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Eye size={18} color={colors.textPrimary} /> {t('doctor.patientViewPreview')}</span>
                            <button onClick={() => setShowPreview(false)}><span style={{ fontSize: 18, color: colors.textTertiary }}>✕</span></button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                            <span style={s.prevSecTitle}>{t('doctor.diagnosis')}</span><p style={s.prevContent}>{diagnosis || '(not filled)'}</p>
                            {reasoning && <><span style={s.prevSecTitle}>{t('doctor.clinicalReasoning')}</span><p style={s.prevContent}>{reasoning}</p></>}
                            {medications.filter(m => m.name).length > 0 && (
                                <><span style={s.prevSecTitle}>{t('doctor.prescriptions')}</span>{medications.filter(m => m.name).map((m, i) => (
                                    <div key={i} style={{ backgroundColor: colors.bgTertiary, borderRadius: 10, padding: 12, marginBottom: 8, border: `1px solid ${colors.border}`, textAlign: isRTL ? 'right' : 'left' }}>
                                        <span style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 600, display: 'block' }}>{m.name} {m.strength}</span>
                                        <span style={{ fontSize: 11, color: colors.textSecondary, display: 'block' }}>{m.form} · {t('consultDetail.dosage')}: {m.quantity || '—'} · {m.duration || '—'}</span>
                                        <span style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2, display: 'block' }}>{m.directions || '—'}</span>
                                    </div>
                                ))}</>
                            )}
                            {nonPharm && <><span style={s.prevSecTitle}>{t('doctor.nonPharmacologic')}</span><p style={s.prevContent}>{nonPharm}</p></>}
                            {aboutCondition && <><span style={s.prevSecTitle}>{t('doctor.aboutCondition')}</span><p style={s.prevContent}>{aboutCondition}</p></>}
                            {Object.entries(warningChecks).filter(([_, v]) => v).length > 0 && (
                                <><span style={s.prevSecTitle}>{t('doctor.warningSignsTitle')}</span>{Object.entries(warningChecks).filter(([_, v]) => v).map(([key]) => <p key={key} style={s.prevContent}>• {t(`doctor.warningSigns.${key}`)}</p>)}</>
                            )}
                            {followUp && <><span style={s.prevSecTitle}>{t('doctor.followUpRec')}</span><p style={s.prevContent}>{followUp}</p></>}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                visible={showInquiryConfirm}
                title={t('doctor.confirmSendInquiryTitle')}
                message={t('doctor.confirmSendInquiryMsg')}
                confirmLabel={t('common.continue')}
                cancelLabel={t('common.cancel')}
                onConfirm={confirmSendInquiry}
                onCancel={() => setShowInquiryConfirm(false)}
            />
            <ConfirmDialog
                visible={showSubmitConfirm}
                title={t('doctor.confirmSubmitTitle')}
                message={t('doctor.confirmSubmitMsg')}
                confirmLabel={t('common.continue')}
                cancelLabel={t('common.cancel')}
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
    voiceContainer: {
        padding: 16,
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgPrimary,
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
    },
};
