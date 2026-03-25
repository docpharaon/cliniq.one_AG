'use client';

import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, Plus, X, Send,
    Stethoscope, Pill, BookOpen, CalendarCheck, AlertCircle,
    Eye, Leaf, ShieldAlert, CheckSquare, Languages, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchConsultationDetail, submitReportAction } from '@/lib/actions';
import IcdCodePicker from '@/components/IcdCodePicker';

type Medication = {
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    route: string;
    notes: string;
};

const EMPTY_MED: Medication = { name: '', dose: '', frequency: '', duration: '', route: 'Oral', notes: '' };

const ROUTES = ['Oral', 'Topical', 'Injectable', 'Inhaled', 'Sublingual', 'Rectal', 'Ophthalmic', 'Otic'];
const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed (PRN)', 'Weekly', 'Once'];

export default function RespondPage() {
    const params = useParams();
    const router = useRouter();
    const consultationId = params.id as string;

    const [consultation, setConsultation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Form fields
    const [diagnosis, setDiagnosis] = useState('');
    const [icd10, setIcd10] = useState('');
    const [treatmentPlan, setTreatmentPlan] = useState('');
    const [medications, setMedications] = useState<Medication[]>([{ ...EMPTY_MED }]);
    const [patientEducation, setPatientEducation] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [followUpTimeframe, setFollowUpTimeframe] = useState('');
    const [doctorNotes, setDoctorNotes] = useState('');
    const [nonPharm, setNonPharm] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [warningChecks, setWarningChecks] = useState<Record<string, boolean>>({
        'Fever above 38.5°C': false,
        'Rapid spread of symptoms': false,
        'Difficulty breathing': false,
        'Severe swelling': false,
        'Worsening despite treatment': false,
    });

    // Arabic translation state
    const [treatmentPlanAr, setTreatmentPlanAr] = useState('');
    const [patientEducationAr, setPatientEducationAr] = useState('');
    const [nonPharmAr, setNonPharmAr] = useState('');
    const [followUpAr, setFollowUpAr] = useState('');
    const [warningSignsAr, setWarningSignsAr] = useState('');
    const [translatingField, setTranslatingField] = useState<string | null>(null);
    const [translatingAll, setTranslatingAll] = useState(false);

    const patientLanguage = consultation?.patient?.language || '';
    const isArabicPatient = patientLanguage === 'ar' || patientLanguage === 'Arabic';

    async function translateField(text: string, field: string): Promise<string> {
        if (!text.trim()) return '';
        try {
            const res = await fetch('/api/ai-translate-arabic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim(), field }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Translation failed' }));
                alert(err.error || 'Translation failed');
                return '';
            }
            const { arabic } = await res.json();
            return arabic || '';
        } catch {
            alert('Failed to connect to translation service');
            return '';
        }
    }

    async function handleTranslateField(field: string) {
        setTranslatingField(field);
        let result = '';
        switch (field) {
            case 'treatment_plan':
                result = await translateField(treatmentPlan, field);
                if (result) setTreatmentPlanAr(result);
                break;
            case 'patient_education':
                result = await translateField(patientEducation, field);
                if (result) setPatientEducationAr(result);
                break;
            case 'non_pharmacologic':
                result = await translateField(nonPharm, field);
                if (result) setNonPharmAr(result);
                break;
            case 'follow_up':
                result = await translateField(followUp, field);
                if (result) setFollowUpAr(result);
                break;
            case 'warning_signs': {
                const signs = Object.entries(warningChecks).filter(([_, v]) => v).map(([s]) => s).join(', ');
                if (signs) {
                    result = await translateField(signs, field);
                    if (result) setWarningSignsAr(result);
                }
                break;
            }
        }
        setTranslatingField(null);
    }

    async function handleTranslateAll() {
        setTranslatingAll(true);
        const fields: { field: string; text: string; setter: (v: string) => void }[] = [];
        if (treatmentPlan.trim()) fields.push({ field: 'treatment_plan', text: treatmentPlan, setter: setTreatmentPlanAr });
        if (patientEducation.trim()) fields.push({ field: 'patient_education', text: patientEducation, setter: setPatientEducationAr });
        if (nonPharm.trim()) fields.push({ field: 'non_pharmacologic', text: nonPharm, setter: setNonPharmAr });
        if (followUp.trim()) fields.push({ field: 'follow_up', text: followUp, setter: setFollowUpAr });
        const signs = Object.entries(warningChecks).filter(([_, v]) => v).map(([s]) => s).join(', ');
        if (signs) fields.push({ field: 'warning_signs', text: signs, setter: setWarningSignsAr });

        for (const { field, text, setter } of fields) {
            const result = await translateField(text, field);
            if (result) setter(result);
        }
        setTranslatingAll(false);
    }

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchConsultationDetail(consultationId);
                setConsultation(data);

                // Pre-fill if report already exists
                if (data?.report) {
                    const r = data.report;
                    setDiagnosis(r.diagnosis || '');
                    setIcd10(r.icd10 || '');
                    setTreatmentPlan(r.treatment_plan || '');
                    setPatientEducation(r.patient_education || '');
                    setFollowUp(r.follow_up || '');
                    setFollowUpTimeframe(r.follow_up_timeframe || '');
                    setDoctorNotes(r.doctor_notes || '');
                    if (r.prescription?.medications?.length) {
                        setMedications(r.prescription.medications);
                    }
                }
            } catch (err) {
                console.error('Load error:', err);
            }
            setLoading(false);
        }
        load();
    }, [consultationId]);

    function addMedication() {
        setMedications(prev => [...prev, { ...EMPTY_MED }]);
    }

    function removeMedication(index: number) {
        setMedications(prev => prev.filter((_, i) => i !== index));
    }

    function updateMedication(index: number, field: keyof Medication, value: string) {
        setMedications(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
    }

    async function handleSubmit() {
        setError('');

        if (!diagnosis.trim()) {
            setError('Please enter a primary diagnosis.');
            return;
        }
        if (!treatmentPlan.trim()) {
            setError('Please enter a treatment plan.');
            return;
        }

        setSubmitting(true);
        try {
            const validMeds = medications.filter(m => m.name.trim());

            const report: Record<string, unknown> = {
                diagnosis: diagnosis.trim(),
                icd10: icd10.trim(),
                treatment_plan: treatmentPlan.trim(),
                non_pharmacologic: nonPharm.trim(),
                patient_education: patientEducation.trim(),
                follow_up: followUp.trim(),
                follow_up_timeframe: followUpTimeframe.trim(),
                doctor_notes: doctorNotes.trim(),
                warning_signs: Object.entries(warningChecks)
                    .filter(([_, checked]) => checked)
                    .map(([sign]) => sign),
                submitted_at: new Date().toISOString(),
            };

            // Include Arabic translations if available
            if (treatmentPlanAr) report.treatment_plan_ar = treatmentPlanAr;
            if (patientEducationAr) report.patient_education_ar = patientEducationAr;
            if (nonPharmAr) report.non_pharmacologic_ar = nonPharmAr;
            if (followUpAr) report.follow_up_ar = followUpAr;
            if (warningSignsAr) report.warning_signs_ar = warningSignsAr;

            const prescription = validMeds.length > 0
                ? { medications: validMeds, prescribed_at: new Date().toISOString() }
                : undefined;

            const result = await submitReportAction(consultationId, report, prescription);

            if (result.error) {
                setError(result.error);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push(`/dashboard/consultation/${consultationId}`);
                }, 1500);
            }
        } catch {
            setError('Failed to submit report. Please try again.');
        }
        setSubmitting(false);
    }

    if (loading) {
        return (
            <>
                <Header title="Compose Response" subtitle="Loading..." />
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
            </>
        );
    }

    if (success) {
        return (
            <>
                <Header title="Response Submitted" subtitle="Redirecting..." />
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <div className="w-20 h-20 rounded-2xl bg-success-faded flex items-center justify-center mb-4">
                        <Send className="w-10 h-10 text-success" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-2">Report Submitted!</h2>
                    <p className="text-text-muted text-sm">Your medical response has been saved and sent to the patient.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title="Compose Response"
                subtitle={consultation?.chief_complaint || 'Medical Response'}
            />

            <div className="p-4 md:p-8 max-w-[900px] mx-auto space-y-4 md:space-y-6 pb-28 md:pb-32">
                {/* Back */}
                <Link
                    href={`/dashboard/consultation/${consultationId}`}
                    className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Case
                </Link>

                {/* Arabic Patient Banner */}
                {isArabicPatient && (
                    <div className="glass rounded-2xl p-4 border-l-4 border-emerald-400 bg-emerald-400/5 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <Languages className="w-5 h-5 text-emerald-400" />
                            <div>
                                <p className="text-sm font-bold text-text-primary">🌍 This patient speaks Arabic</p>
                                <p className="text-xs text-text-muted">Translate your response before submitting for better patient understanding</p>
                            </div>
                        </div>
                        <button
                            onClick={handleTranslateAll}
                            disabled={translatingAll}
                            className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50"
                        >
                            {translatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                            Translate All to Arabic
                        </button>
                    </div>
                )}

                {/* AI Summary Preview */}
                {consultation?.ai_summary?.summary && (
                    <div className="glass rounded-2xl p-5 border-l-4 border-purple">
                        <p className="text-xs text-purple font-semibold uppercase tracking-wider mb-2">AI Summary (reference)</p>
                        <p className="text-sm text-text-secondary leading-relaxed">{consultation.ai_summary.summary}</p>
                    </div>
                )}

                {/* Diagnosis Section */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-faded flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Clinical Assessment</h3>
                            <p className="text-xs text-text-muted">Primary diagnosis and classification</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
                                Primary Diagnosis *
                            </label>
                            <input
                                type="text"
                                value={diagnosis}
                                onChange={e => setDiagnosis(e.target.value)}
                                placeholder="e.g. Acne Vulgaris, Mild"
                                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                            />
                        </div>
                        <div>
                            <IcdCodePicker
                                value={icd10}
                                onChange={(code, desc) => {
                                    setIcd10(code);
                                    if (desc && !diagnosis) setDiagnosis(desc);
                                }}
                                specialty={consultation?.specialty}
                                consultationId={consultationId}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
                            Treatment Plan *
                        </label>
                        <textarea
                            value={treatmentPlan}
                            onChange={e => setTreatmentPlan(e.target.value)}
                            placeholder="Describe the recommended treatment approach..."
                            rows={4}
                            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm resize-none"
                        />
                        {treatmentPlan.trim() && (
                            <div className="mt-2">
                                <button
                                    onClick={() => handleTranslateField('treatment_plan')}
                                    disabled={translatingField === 'treatment_plan'}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 transition-all font-medium disabled:opacity-40"
                                >
                                    {translatingField === 'treatment_plan' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Translate to Arabic
                                </button>
                                {treatmentPlanAr && (
                                    <div dir="rtl" className="mt-2 p-3 bg-emerald-400/5 border border-emerald-400/20 rounded-xl">
                                        <p className="text-[10px] text-emerald-400 font-semibold mb-1 text-right">الترجمة العربية</p>
                                        <textarea
                                            value={treatmentPlanAr}
                                            onChange={e => setTreatmentPlanAr(e.target.value)}
                                            rows={3}
                                            className="w-full bg-transparent text-sm text-text-primary focus:outline-none resize-none"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Prescription Section */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-info-faded flex items-center justify-center">
                                <Pill className="w-5 h-5 text-info" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary">Prescription</h3>
                                <p className="text-xs text-text-muted">{medications.length} medication{medications.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <button
                            onClick={addMedication}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent text-bg-primary font-semibold hover:shadow-[0_2px_8px_rgba(45,212,191,0.3)] transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                    </div>

                    <div className="space-y-3">
                        {medications.map((med, index) => (
                            <div key={index} className="bg-bg-elevated rounded-xl p-4 border border-border space-y-3 relative group">
                                {medications.length > 1 && (
                                    <button
                                        onClick={() => removeMedication(index)}
                                        className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-error-faded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/20"
                                    >
                                        <X className="w-3.5 h-3.5 text-error" />
                                    </button>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={med.name}
                                        onChange={e => updateMedication(index, 'name', e.target.value)}
                                        placeholder="Medication name"
                                        className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={med.dose}
                                        onChange={e => updateMedication(index, 'dose', e.target.value)}
                                        placeholder="Dose (e.g. 500mg)"
                                        className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <select
                                        value={med.frequency}
                                        onChange={e => updateMedication(index, 'frequency', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                    >
                                        <option value="">Frequency</option>
                                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        value={med.duration}
                                        onChange={e => updateMedication(index, 'duration', e.target.value)}
                                        placeholder="Duration (e.g. 7 days)"
                                        className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                    />
                                    <select
                                        value={med.route}
                                        onChange={e => updateMedication(index, 'route', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                    >
                                        {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                <input
                                    type="text"
                                    value={med.notes}
                                    onChange={e => updateMedication(index, 'notes', e.target.value)}
                                    placeholder="Notes (e.g. Take with food)"
                                    className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Patient Education */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-faded flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-purple" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Patient Education</h3>
                            <p className="text-xs text-text-muted">Instructions and advice for the patient</p>
                        </div>
                    </div>

                    <textarea
                        value={patientEducation}
                        onChange={e => setPatientEducation(e.target.value)}
                        placeholder="Provide clear instructions, lifestyle recommendations, warning signs to watch for..."
                        rows={4}
                        className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm resize-none"
                    />
                    {patientEducation.trim() && (
                        <div className="mt-2">
                            <button
                                onClick={() => handleTranslateField('patient_education')}
                                disabled={translatingField === 'patient_education'}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 transition-all font-medium disabled:opacity-40"
                            >
                                {translatingField === 'patient_education' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Translate to Arabic
                            </button>
                            {patientEducationAr && (
                                <div dir="rtl" className="mt-2 p-3 bg-emerald-400/5 border border-emerald-400/20 rounded-xl">
                                    <p className="text-[10px] text-emerald-400 font-semibold mb-1 text-right">الترجمة العربية</p>
                                    <textarea
                                        value={patientEducationAr}
                                        onChange={e => setPatientEducationAr(e.target.value)}
                                        rows={3}
                                        className="w-full bg-transparent text-sm text-text-primary focus:outline-none resize-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Follow-up */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning-faded flex items-center justify-center">
                            <CalendarCheck className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Follow-up</h3>
                            <p className="text-xs text-text-muted">Recommendations for next steps</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={followUp}
                            onChange={e => setFollowUp(e.target.value)}
                            placeholder="Follow-up recommendation"
                            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                        />
                        <input
                            type="text"
                            value={followUpTimeframe}
                            onChange={e => setFollowUpTimeframe(e.target.value)}
                            placeholder="Timeframe (e.g. 2 weeks)"
                            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                        />
                    </div>

                    {followUp.trim() && (
                        <div className="mt-2">
                            <button
                                onClick={() => handleTranslateField('follow_up')}
                                disabled={translatingField === 'follow_up'}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 transition-all font-medium disabled:opacity-40"
                            >
                                {translatingField === 'follow_up' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Translate to Arabic
                            </button>
                            {followUpAr && (
                                <div dir="rtl" className="mt-2 p-3 bg-emerald-400/5 border border-emerald-400/20 rounded-xl">
                                    <p className="text-[10px] text-emerald-400 font-semibold mb-1 text-right">الترجمة العربية</p>
                                    <textarea
                                        value={followUpAr}
                                        onChange={e => setFollowUpAr(e.target.value)}
                                        rows={2}
                                        className="w-full bg-transparent text-sm text-text-primary focus:outline-none resize-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <textarea
                        value={doctorNotes}
                        onChange={e => setDoctorNotes(e.target.value)}
                        placeholder="Internal notes (not visible to patient)"
                        rows={2}
                        className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm resize-none"
                    />
                </div>

                {/* Non-Pharmacologic Treatment */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-success-faded flex items-center justify-center">
                            <Leaf className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Non-Pharmacologic Treatment</h3>
                            <p className="text-xs text-text-muted">Lifestyle, home remedies, and behavioral recommendations</p>
                        </div>
                    </div>
                    <textarea
                        value={nonPharm}
                        onChange={e => setNonPharm(e.target.value)}
                        placeholder="e.g. Cool compresses, avoid irritants, use hypoallergenic detergent, rest..."
                        rows={3}
                        className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm resize-none"
                    />
                    {nonPharm.trim() && (
                        <div className="mt-2">
                            <button
                                onClick={() => handleTranslateField('non_pharmacologic')}
                                disabled={translatingField === 'non_pharmacologic'}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 transition-all font-medium disabled:opacity-40"
                            >
                                {translatingField === 'non_pharmacologic' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Translate to Arabic
                            </button>
                            {nonPharmAr && (
                                <div dir="rtl" className="mt-2 p-3 bg-emerald-400/5 border border-emerald-400/20 rounded-xl">
                                    <p className="text-[10px] text-emerald-400 font-semibold mb-1 text-right">الترجمة العربية</p>
                                    <textarea
                                        value={nonPharmAr}
                                        onChange={e => setNonPharmAr(e.target.value)}
                                        rows={2}
                                        className="w-full bg-transparent text-sm text-text-primary focus:outline-none resize-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Warning Signs */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-error-faded flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-error" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Warning Signs</h3>
                            <p className="text-xs text-text-muted">Red-flag symptoms — patient will be alerted</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(warningChecks).map(([sign, checked]) => (
                            <button
                                key={sign}
                                type="button"
                                onClick={() => setWarningChecks(prev => ({ ...prev, [sign]: !prev[sign] }))}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left ${
                                    checked
                                        ? 'bg-error/5 border-error/30 text-text-primary'
                                        : 'bg-bg-elevated border-border text-text-secondary hover:border-border/80'
                                }`}
                            >
                                <CheckSquare className={`w-4 h-4 flex-shrink-0 ${checked ? 'text-error' : 'text-text-muted'}`} />
                                <span className="text-sm">{sign}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 text-error text-sm px-4 py-3 bg-error-faded rounded-xl border border-[rgba(239,68,68,0.3)]">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Submit Bar */}
                <div className="fixed bottom-0 left-0 right-0 bg-bg-primary/90 backdrop-blur-xl border-t border-border px-4 md:px-8 py-3 md:py-4 safe-area-bottom">
                    <div className="max-w-[900px] mx-auto flex items-center justify-between">
                        <p className="text-xs text-text-muted">
                            Fields marked with * are required
                        </p>
                        <button
                            onClick={() => setShowPreview(true)}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-bg-elevated border border-border text-text-secondary font-medium text-sm hover:border-accent/30 transition-all"
                        >
                            <Eye className="w-4 h-4" />
                            Preview
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-accent to-purple text-white font-bold text-sm hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(45,212,191,0.4)] transition-all disabled:opacity-60 disabled:pointer-events-none"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting…
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Report
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview Modal */}
                {showPreview && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
                        <div className="bg-bg-card rounded-2xl border border-border max-w-[600px] w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-accent" />
                                    Patient View Preview
                                </h3>
                                <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-lg hover:bg-bg-elevated flex items-center justify-center transition-colors">
                                    <X className="w-4 h-4 text-text-muted" />
                                </button>
                            </div>
                            <div className="overflow-y-auto p-6 space-y-4" style={{ maxHeight: 'calc(85vh - 72px)' }}>
                                <div>
                                    <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">🩺 Diagnosis</p>
                                    <p className="text-sm text-text-primary">{diagnosis || '(not filled)'}</p>
                                </div>
                                {treatmentPlan && (
                                    <div>
                                        <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">📋 Treatment Plan</p>
                                        <p className="text-sm text-text-secondary">{treatmentPlan}</p>
                                    </div>
                                )}
                                {medications.filter(m => m.name).length > 0 && (
                                    <div>
                                        <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-2">💊 Medications</p>
                                        {medications.filter(m => m.name).map((m, i) => (
                                            <div key={i} className="bg-bg-elevated rounded-xl p-3 border border-border mb-2">
                                                <p className="text-sm font-semibold text-text-primary">{m.name} {m.dose}</p>
                                                <p className="text-xs text-text-muted">{m.route} · {m.frequency || '—'} · {m.duration || '—'}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {nonPharm && (
                                    <div>
                                        <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">🌿 Non-Drug Treatment</p>
                                        <p className="text-sm text-text-secondary">{nonPharm}</p>
                                    </div>
                                )}
                                {patientEducation && (
                                    <div>
                                        <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">📖 Patient Education</p>
                                        <p className="text-sm text-text-secondary">{patientEducation}</p>
                                    </div>
                                )}
                                {Object.entries(warningChecks).filter(([_, v]) => v).length > 0 && (
                                    <div>
                                        <p className="text-xs text-error font-semibold uppercase tracking-wider mb-1">🚨 Warning Signs</p>
                                        {Object.entries(warningChecks).filter(([_, v]) => v).map(([sign]) => (
                                            <p key={sign} className="text-sm text-text-secondary">• {sign}</p>
                                        ))}
                                    </div>
                                )}
                                {followUp && (
                                    <div>
                                        <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">📅 Follow-Up</p>
                                        <p className="text-sm text-text-secondary">{followUp} {followUpTimeframe && `(${followUpTimeframe})`}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
