'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
    MentalStatusExam,
    RiskAssessment,
    PsychiatricDiagnosis,
    MedicationPlan,
    ScreeningScore,
    RiskLevel,
} from '@cliniqone/types';
import {
    fetchMentalStatusExam,
    saveMentalStatusExam,
    fetchRiskAssessment,
    saveRiskAssessment,
    fetchPsychiatricDiagnosis,
    savePsychiatricDiagnosis,
    fetchMedicationPlans,
    saveMedicationPlan,
    fetchScreeningScores,
} from '@/lib/actions';

// ── Styles ──────────────────────────────────────

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '24px',
        padding: '0',
    },
    sectionCard: {
        background: '#1a1a2e',
        borderRadius: '12px',
        border: '1px solid #2a2a4a',
        padding: '20px',
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 600,
        color: '#e0e0ff',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px',
    },
    label: {
        fontSize: '12px',
        fontWeight: 500,
        color: '#8888aa',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
    },
    input: {
        background: '#12122a',
        border: '1px solid #2a2a4a',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#e0e0ff',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    textarea: {
        background: '#12122a',
        border: '1px solid #2a2a4a',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#e0e0ff',
        fontSize: '14px',
        outline: 'none',
        resize: 'vertical' as const,
        minHeight: '60px',
        fontFamily: 'inherit',
    },
    select: {
        background: '#12122a',
        border: '1px solid #2a2a4a',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#e0e0ff',
        fontSize: '14px',
        outline: 'none',
        cursor: 'pointer',
    },
    btnPrimary: {
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.2s',
    },
    btnSecondary: {
        background: '#2a2a4a',
        color: '#e0e0ff',
        border: '1px solid #3a3a5a',
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
    },
    checkbox: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
    },
    checkboxInput: {
        width: '16px',
        height: '16px',
        accentColor: '#6366f1',
    },
    riskBanner: (level: RiskLevel) => ({
        padding: '12px 16px',
        borderRadius: '10px',
        fontWeight: 600,
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        ...(level === 'imminent' ? {
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            color: '#fff',
            border: '1px solid #ef4444',
            animation: 'pulse 2s infinite',
        } : level === 'high' ? {
            background: '#7f1d1d',
            color: '#fca5a5',
            border: '1px solid #dc2626',
        } : level === 'moderate' ? {
            background: '#78350f',
            color: '#fbbf24',
            border: '1px solid #d97706',
        } : {
            background: '#14532d',
            color: '#86efac',
            border: '1px solid #22c55e',
        }),
    }),
    scoreBar: (score: number, maxScore: number) => {
        const pct = Math.round((score / maxScore) * 100);
        const color = pct < 20 ? '#22c55e' : pct < 40 ? '#84cc16' : pct < 60 ? '#eab308' : pct < 80 ? '#f97316' : '#ef4444';
        return {
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: '#2a2a4a',
            overflow: 'hidden' as const,
            position: 'relative' as const,
            inner: {
                width: `${pct}%`,
                height: '100%',
                borderRadius: '4px',
                background: color,
                transition: 'width 0.5s ease',
            },
        };
    },
    pill: (active: boolean) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        border: '1px solid',
        ...(active ? {
            background: '#6366f1',
            color: '#fff',
            borderColor: '#6366f1',
        } : {
            background: 'transparent',
            color: '#8888aa',
            borderColor: '#3a3a5a',
        }),
    }),
    medRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#12122a',
        borderRadius: '8px',
        border: '1px solid #2a2a4a',
    },
    toast: {
        position: 'fixed' as const,
        bottom: '20px',
        right: '20px',
        background: '#22c55e',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    },
};

// ── Props ────────────────────────────────────────

interface Props {
    consultationId: string;
    doctorId: string;
    patientId: string;
}

// ── Sub-tabs ─────────────────────────────────────

type SubTab = 'mse' | 'risk' | 'screening' | 'diagnosis' | 'medications';

// ── Component ────────────────────────────────────

export default function PsychAssessmentTab({ consultationId, doctorId, patientId }: Props) {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('mse');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    // ── MSE State
    const [mse, setMse] = useState<Partial<MentalStatusExam>>({});

    // ── Risk State
    const [risk, setRisk] = useState<Partial<RiskAssessment>>({
        suicidal_ideation: false,
        suicidal_plan: false,
        suicidal_intent: false,
        prior_attempts: 0,
        self_harm: false,
        homicidal_ideation: false,
        psychosis_active: false,
        risk_level: 'low',
    });

    // ── Diagnosis State
    const [diagnosis, setDiagnosis] = useState<Partial<PsychiatricDiagnosis>>({});

    // ── Medication State
    const [medications, setMedications] = useState<MedicationPlan[]>([]);
    const [newMed, setNewMed] = useState({
        medication_name: '', dose: '', frequency: 'daily', route: 'oral', indication: '',
    });

    // ── Screening Scores State
    const [scores, setScores] = useState<ScreeningScore[]>([]);

    // Utility
    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }, []);

    // ── Data Loading
    useEffect(() => {
        const load = async () => {
            const [mseData, riskData, diagData, medData, scoreData] = await Promise.all([
                fetchMentalStatusExam(consultationId),
                fetchRiskAssessment(consultationId),
                fetchPsychiatricDiagnosis(consultationId),
                fetchMedicationPlans(consultationId),
                fetchScreeningScores(patientId),
            ]);
            if (mseData) setMse(mseData);
            if (riskData) setRisk(riskData);
            if (diagData) setDiagnosis(diagData);
            if (medData) setMedications(medData);
            if (scoreData) setScores(scoreData);
        };
        load();
    }, [consultationId, patientId]);

    // ── Compute risk level from flags
    const computeRiskLevel = (r: Partial<RiskAssessment>): RiskLevel => {
        if (r.suicidal_intent || (r.suicidal_plan && r.suicidal_ideation)) return 'imminent';
        if (r.suicidal_plan || r.homicidal_ideation || (r.prior_attempts && r.prior_attempts > 0)) return 'high';
        if (r.suicidal_ideation || r.self_harm || r.psychosis_active) return 'moderate';
        return 'low';
    };

    // ── Save handlers
    const handleSaveMSE = async () => {
        setSaving(true);
        const result = await saveMentalStatusExam({
            consultation_id: consultationId,
            doctor_id: doctorId,
            appearance: mse.appearance ?? undefined,
            behavior: mse.behavior ?? undefined,
            speech: mse.speech ?? undefined,
            mood: mse.mood ?? undefined,
            affect: mse.affect ?? undefined,
            thought_process: mse.thought_process ?? undefined,
            thought_content: mse.thought_content ?? undefined,
            perceptions: mse.perceptions ?? undefined,
            cognition: mse.cognition ?? undefined,
            insight: mse.insight ?? undefined,
            judgment: mse.judgment ?? undefined,
            risk_level: mse.risk_level ?? undefined,
            notes: mse.notes ?? undefined,
        });
        setSaving(false);
        if ('error' in result) showToast('❌ Error saving MSE');
        else showToast('✅ Mental Status Exam saved');
    };

    const handleSaveRisk = async () => {
        setSaving(true);
        const level = computeRiskLevel(risk);
        const result = await saveRiskAssessment({
            consultation_id: consultationId,
            patient_id: patientId,
            assessed_by: doctorId,
            risk_level: level,
            suicidal_ideation: risk.suicidal_ideation ?? undefined,
            suicidal_plan: risk.suicidal_plan ?? undefined,
            suicidal_intent: risk.suicidal_intent ?? undefined,
            prior_attempts: risk.prior_attempts ?? undefined,
            self_harm: risk.self_harm ?? undefined,
            homicidal_ideation: risk.homicidal_ideation ?? undefined,
            psychosis_active: risk.psychosis_active ?? undefined,
            protective_factors: risk.protective_factors ?? undefined,
            safety_plan: risk.safety_plan ?? undefined,
            emergency_contact_name: risk.emergency_contact_name ?? undefined,
            emergency_contact_phone: risk.emergency_contact_phone ?? undefined,
            disposition: risk.disposition ?? undefined,
            notes: risk.notes ?? undefined,
        });
        setSaving(false);
        if ('error' in result) showToast('❌ Error saving risk assessment');
        else {
            setRisk((prev: Partial<RiskAssessment>) => ({ ...prev, risk_level: level }));
            showToast('✅ Risk assessment saved');
        }
    };

    const handleSaveDiagnosis = async () => {
        if (!diagnosis.primary_diagnosis) {
            showToast('⚠️ Primary diagnosis is required');
            return;
        }
        setSaving(true);
        const result = await savePsychiatricDiagnosis({
            consultation_id: consultationId,
            doctor_id: doctorId,
            primary_diagnosis: diagnosis.primary_diagnosis!,
            icd10_code: diagnosis.icd10_code ?? undefined,
            secondary_diagnoses: diagnosis.secondary_diagnoses ?? undefined,
            differential: diagnosis.differential ?? undefined,
            clinical_reasoning: diagnosis.clinical_reasoning ?? undefined,
        });
        setSaving(false);
        if ('error' in result) showToast('❌ Error saving diagnosis');
        else showToast('✅ Diagnosis saved');
    };

    const handleAddMedication = async () => {
        if (!newMed.medication_name || !newMed.dose) {
            showToast('⚠️ Medication name and dose are required');
            return;
        }
        setSaving(true);
        const result = await saveMedicationPlan({
            consultation_id: consultationId,
            patient_id: patientId,
            doctor_id: doctorId,
            ...newMed,
        });
        setSaving(false);
        if ('error' in result) showToast('❌ Error adding medication');
        else {
            showToast('✅ Medication added');
            setNewMed({ medication_name: '', dose: '', frequency: 'daily', route: 'oral', indication: '' });
            // Reload
            const updated = await fetchMedicationPlans(consultationId);
            setMedications(updated);
        }
    };

    // ── Risk level display
    const currentRiskLevel = (risk.risk_level as RiskLevel) || computeRiskLevel(risk);

    return (
        <div style={styles.container}>
            {/* Risk Banner — always visible */}
            {(currentRiskLevel === 'high' || currentRiskLevel === 'imminent') && (
                <div style={styles.riskBanner(currentRiskLevel)}>
                    {currentRiskLevel === 'imminent' ? '🚨' : '⚠️'}
                    {currentRiskLevel === 'imminent'
                        ? 'IMMINENT RISK — Immediate clinical action required'
                        : 'HIGH-RISK PATIENT — Review safety plan before proceeding'}
                </div>
            )}

            {/* Sub-tab navigation */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {([
                    { id: 'mse', label: '🧠 Mental Status Exam' },
                    { id: 'risk', label: '⚠️ Risk Assessment' },
                    { id: 'screening', label: '📊 Screening Scores' },
                    { id: 'diagnosis', label: '📋 Diagnosis' },
                    { id: 'medications', label: '💊 Medications' },
                ] as { id: SubTab; label: string }[]).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        style={styles.pill(activeSubTab === tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── MSE Tab ── */}
            {activeSubTab === 'mse' && (
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <span style={styles.sectionTitle}>🧠 Mental Status Exam</span>
                        <button onClick={handleSaveMSE} disabled={saving} style={styles.btnPrimary}>
                            {saving ? 'Saving...' : 'Save MSE'}
                        </button>
                    </div>
                    <div style={styles.grid}>
                        {[
                            { key: 'appearance', label: 'Appearance', placeholder: 'e.g., well-groomed, disheveled' },
                            { key: 'behavior', label: 'Behavior', placeholder: 'e.g., cooperative, guarded, agitated' },
                            { key: 'speech', label: 'Speech', placeholder: 'e.g., normal rate/volume, pressured' },
                            { key: 'mood', label: 'Mood', placeholder: 'e.g., depressed, anxious, euthymic' },
                            { key: 'affect', label: 'Affect', placeholder: 'e.g., flat, constricted, labile' },
                            { key: 'thought_process', label: 'Thought Process', placeholder: 'e.g., linear, tangential' },
                            { key: 'thought_content', label: 'Thought Content', placeholder: 'e.g., no SI/HI, delusions' },
                            { key: 'perceptions', label: 'Perceptions', placeholder: 'e.g., no AH/VH, intact' },
                            { key: 'cognition', label: 'Cognition', placeholder: 'e.g., A&O x4, intact memory' },
                            { key: 'insight', label: 'Insight', placeholder: 'e.g., good, fair, poor' },
                            { key: 'judgment', label: 'Judgment', placeholder: 'e.g., good, impaired' },
                        ].map(field => (
                            <div key={field.key} style={styles.fieldGroup}>
                                <label style={styles.label}>{field.label}</label>
                                <input
                                    style={styles.input}
                                    placeholder={field.placeholder}
                                    value={(mse as Record<string, string>)[field.key] || ''}
                                    onChange={e => setMse(prev => ({ ...prev, [field.key]: e.target.value }))}
                                />
                            </div>
                        ))}
                    </div>
                    <div style={{ ...styles.fieldGroup, marginTop: '12px' }}>
                        <label style={styles.label}>Risk Level</label>
                        <select
                            style={styles.select}
                            value={mse.risk_level || ''}
                            onChange={e => setMse(prev => ({ ...prev, risk_level: e.target.value as RiskLevel }))}
                        >
                            <option value="">Select...</option>
                            <option value="low">🟢 Low</option>
                            <option value="moderate">🟡 Moderate</option>
                            <option value="high">🟠 High</option>
                            <option value="imminent">🔴 Imminent</option>
                        </select>
                    </div>
                    <div style={{ ...styles.fieldGroup, marginTop: '12px' }}>
                        <label style={styles.label}>Notes</label>
                        <textarea
                            style={styles.textarea}
                            placeholder="Additional clinical notes..."
                            value={mse.notes || ''}
                            onChange={e => setMse(prev => ({ ...prev, notes: e.target.value }))}
                        />
                    </div>
                </div>
            )}

            {/* ── Risk Assessment Tab ── */}
            {activeSubTab === 'risk' && (
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <span style={styles.sectionTitle}>⚠️ Risk Assessment</span>
                        <button onClick={handleSaveRisk} disabled={saving} style={styles.btnPrimary}>
                            {saving ? 'Saving...' : 'Save Assessment'}
                        </button>
                    </div>

                    {/* Auto-computed risk level banner */}
                    <div style={{ ...styles.riskBanner(computeRiskLevel(risk)), marginBottom: '16px' }}>
                        Risk Level: {computeRiskLevel(risk).toUpperCase()}
                        <span style={{ fontSize: '12px', opacity: 0.8, marginLeft: '8px' }}>
                            (auto-computed from flags below)
                        </span>
                    </div>

                    {/* Boolean flags */}
                    <div style={{ ...styles.grid, marginBottom: '16px' }}>
                        {[
                            { key: 'suicidal_ideation', label: 'Suicidal Ideation' },
                            { key: 'suicidal_plan', label: 'Suicidal Plan' },
                            { key: 'suicidal_intent', label: 'Suicidal Intent' },
                            { key: 'self_harm', label: 'Self-Harm' },
                            { key: 'homicidal_ideation', label: 'Homicidal Ideation' },
                            { key: 'psychosis_active', label: 'Active Psychosis' },
                        ].map(flag => (
                            <label key={flag.key} style={styles.checkbox}>
                                <input
                                    type="checkbox"
                                    style={styles.checkboxInput}
                                    checked={(risk as Record<string, boolean>)[flag.key] || false}
                                    onChange={e => setRisk(prev => ({ ...prev, [flag.key]: e.target.checked }))}
                                />
                                <span style={{ color: '#e0e0ff', fontSize: '14px' }}>{flag.label}</span>
                            </label>
                        ))}
                    </div>

                    <div style={styles.grid}>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Prior Attempts</label>
                            <input
                                type="number"
                                min={0}
                                style={styles.input}
                                value={risk.prior_attempts || 0}
                                onChange={e => setRisk(prev => ({ ...prev, prior_attempts: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Disposition</label>
                            <select
                                style={styles.select}
                                value={risk.disposition || ''}
                                onChange={e => setRisk(prev => ({ ...prev, disposition: e.target.value }))}
                            >
                                <option value="">Select...</option>
                                <option value="outpatient">Outpatient Follow-up</option>
                                <option value="er_referral">ER Referral</option>
                                <option value="hospitalization">Hospitalization</option>
                                <option value="crisis_line">Crisis Line Referral</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ ...styles.grid, marginTop: '12px' }}>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Emergency Contact Name</label>
                            <input
                                style={styles.input}
                                placeholder="Name"
                                value={risk.emergency_contact_name || ''}
                                onChange={e => setRisk(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                            />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Emergency Contact Phone</label>
                            <input
                                style={styles.input}
                                placeholder="+966 5XX XXX XXXX"
                                value={risk.emergency_contact_phone || ''}
                                onChange={e => setRisk(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div style={{ ...styles.fieldGroup, marginTop: '12px' }}>
                        <label style={styles.label}>Protective Factors</label>
                        <textarea
                            style={styles.textarea}
                            placeholder="e.g., strong family support, religious beliefs, future plans..."
                            value={risk.protective_factors || ''}
                            onChange={e => setRisk(prev => ({ ...prev, protective_factors: e.target.value }))}
                        />
                    </div>
                    <div style={{ ...styles.fieldGroup, marginTop: '12px' }}>
                        <label style={styles.label}>Safety Plan</label>
                        <textarea
                            style={styles.textarea}
                            placeholder="Document safety plan steps..."
                            value={risk.safety_plan || ''}
                            onChange={e => setRisk(prev => ({ ...prev, safety_plan: e.target.value }))}
                        />
                    </div>
                    <div style={{ ...styles.fieldGroup, marginTop: '12px' }}>
                        <label style={styles.label}>Notes</label>
                        <textarea
                            style={styles.textarea}
                            placeholder="Additional notes..."
                            value={risk.notes || ''}
                            onChange={e => setRisk(prev => ({ ...prev, notes: e.target.value }))}
                        />
                    </div>
                </div>
            )}

            {/* ── Screening Scores Tab ── */}
            {activeSubTab === 'screening' && (
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <span style={styles.sectionTitle}>📊 Screening Score History</span>
                    </div>
                    {scores.length === 0 ? (
                        <p style={{ color: '#8888aa', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                            No screening scores recorded yet. Patients complete PHQ-9 and GAD-7 during intake.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {scores.map(score => {
                                const maxScore = score.instrument === 'PHQ-9' ? 27 : 21;
                                const bar = styles.scoreBar(score.total_score, maxScore);
                                return (
                                    <div key={score.id} style={{
                                        background: '#12122a',
                                        borderRadius: '8px',
                                        padding: '12px 16px',
                                        border: '1px solid #2a2a4a',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ color: '#e0e0ff', fontWeight: 600, fontSize: '14px' }}>
                                                {score.instrument}
                                            </span>
                                            <span style={{ color: '#8888aa', fontSize: '12px' }}>
                                                {new Date(score.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '100%' }}>
                                                <div style={bar}>
                                                    <div style={bar.inner} />
                                                </div>
                                            </div>
                                            <span style={{
                                                color: '#e0e0ff',
                                                fontWeight: 700,
                                                fontSize: '18px',
                                                minWidth: '40px',
                                                textAlign: 'right',
                                            }}>
                                                {score.total_score}
                                            </span>
                                        </div>
                                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#8888aa' }}>
                                            {score.severity && (
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    background: score.severity === 'severe' ? '#7f1d1d' : score.severity === 'moderately_severe' ? '#78350f' : score.severity === 'moderate' ? '#713f12' : score.severity === 'mild' ? '#14532d' : '#1e293b',
                                                    color: score.severity === 'severe' ? '#fca5a5' : score.severity === 'moderately_severe' ? '#fbbf24' : score.severity === 'moderate' ? '#fde047' : score.severity === 'mild' ? '#86efac' : '#94a3b8',
                                                }}>
                                                    {score.severity.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Diagnosis Tab ── */}
            {activeSubTab === 'diagnosis' && (
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <span style={styles.sectionTitle}>📋 Psychiatric Diagnosis</span>
                        <button onClick={handleSaveDiagnosis} disabled={saving} style={styles.btnPrimary}>
                            {saving ? 'Saving...' : 'Save Diagnosis'}
                        </button>
                    </div>
                    <div style={styles.grid}>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Primary Diagnosis *</label>
                            <input
                                style={styles.input}
                                placeholder="e.g., Major Depressive Disorder"
                                value={diagnosis.primary_diagnosis || ''}
                                onChange={e => setDiagnosis(prev => ({ ...prev, primary_diagnosis: e.target.value }))}
                            />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>ICD-10 Code</label>
                            <input
                                style={styles.input}
                                placeholder="e.g., F32.1"
                                value={diagnosis.icd10_code || ''}
                                onChange={e => setDiagnosis(prev => ({ ...prev, icd10_code: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div style={{ ...styles.fieldGroup, marginTop: '12px' }}>
                        <label style={styles.label}>Differential Diagnosis</label>
                        <textarea
                            style={styles.textarea}
                            placeholder="e.g., Bipolar II, Adjustment Disorder, Dysthymia..."
                            value={diagnosis.differential || ''}
                            onChange={e => setDiagnosis(prev => ({ ...prev, differential: e.target.value }))}
                        />
                    </div>
                    <div style={{ ...styles.fieldGroup, marginTop: '12px' }}>
                        <label style={styles.label}>Clinical Reasoning</label>
                        <textarea
                            style={styles.textarea}
                            placeholder="Document clinical reasoning for diagnosis..."
                            value={diagnosis.clinical_reasoning || ''}
                            onChange={e => setDiagnosis(prev => ({ ...prev, clinical_reasoning: e.target.value }))}
                        />
                    </div>
                </div>
            )}

            {/* ── Medications Tab ── */}
            {activeSubTab === 'medications' && (
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <span style={styles.sectionTitle}>💊 Medication Plan</span>
                    </div>

                    {/* Existing medications */}
                    {medications.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            {medications.map(med => (
                                <div key={med.id} style={styles.medRow}>
                                    <div>
                                        <div style={{ color: '#e0e0ff', fontWeight: 600, fontSize: '14px' }}>
                                            {med.medication_name}
                                            {med.generic_name && (
                                                <span style={{ color: '#8888aa', fontWeight: 400, marginLeft: '8px' }}>
                                                    ({med.generic_name})
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ color: '#8888aa', fontSize: '13px', marginTop: '2px' }}>
                                            {med.dose} • {med.frequency} • {med.route}
                                            {med.indication && ` • ${med.indication}`}
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        background: med.status === 'active' ? '#14532d' : med.status === 'discontinued' ? '#7f1d1d' : '#78350f',
                                        color: med.status === 'active' ? '#86efac' : med.status === 'discontinued' ? '#fca5a5' : '#fbbf24',
                                    }}>
                                        {med.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add new medication */}
                    <div style={{ background: '#12122a', borderRadius: '8px', padding: '16px', border: '1px dashed #3a3a5a' }}>
                        <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '12px', fontWeight: 500 }}>
                            Add New Medication
                        </p>
                        <div style={styles.grid}>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Medication Name *</label>
                                <input
                                    style={styles.input}
                                    placeholder="e.g., Sertraline"
                                    value={newMed.medication_name}
                                    onChange={e => setNewMed(prev => ({ ...prev, medication_name: e.target.value }))}
                                />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Dose *</label>
                                <input
                                    style={styles.input}
                                    placeholder="e.g., 50mg"
                                    value={newMed.dose}
                                    onChange={e => setNewMed(prev => ({ ...prev, dose: e.target.value }))}
                                />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Frequency</label>
                                <select
                                    style={styles.select}
                                    value={newMed.frequency}
                                    onChange={e => setNewMed(prev => ({ ...prev, frequency: e.target.value }))}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="twice_daily">Twice Daily</option>
                                    <option value="three_daily">Three Times Daily</option>
                                    <option value="at_bedtime">At Bedtime</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="as_needed">As Needed (PRN)</option>
                                </select>
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Route</label>
                                <select
                                    style={styles.select}
                                    value={newMed.route}
                                    onChange={e => setNewMed(prev => ({ ...prev, route: e.target.value }))}
                                >
                                    <option value="oral">Oral</option>
                                    <option value="sublingual">Sublingual</option>
                                    <option value="intramuscular">Intramuscular</option>
                                    <option value="transdermal">Transdermal</option>
                                </select>
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Indication</label>
                                <input
                                    style={styles.input}
                                    placeholder="e.g., Depression, Anxiety"
                                    value={newMed.indication}
                                    onChange={e => setNewMed(prev => ({ ...prev, indication: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '12px' }}>
                            <button onClick={handleAddMedication} disabled={saving} style={styles.btnPrimary}>
                                {saving ? 'Adding...' : '+ Add Medication'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast notification */}
            {toast && <div style={styles.toast}>{toast}</div>}
        </div>
    );
}
