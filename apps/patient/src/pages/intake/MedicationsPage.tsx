import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t, getLocale } from '@cliniqone/i18n';
import { useIntakeStore } from '../../stores/intakeStore';
import { BackButton } from '../../components/BackButton';
import { DrugLabelCapture } from '../../components/DrugLabelCapture';
import { MedicationVerificationCard } from '../../components/MedicationVerificationCard';
import { analyzeDrugLabel } from '../../services/aiService';

export default function MedicationsPage() {
    const navigate = useNavigate();
    const lang = getLocale() as 'en' | 'ar';
    const { medications, setMedications } = useIntakeStore();
    const [input, setInput] = useState('');
    const [showCapture, setShowCapture] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [meds, setMeds] = useState<{ name: string; dose?: string; frequency?: string; verified: boolean }[]>(
        medications.map(m => ({ name: m, verified: true })),
    );

    function handleAdd() {
        if (!input.trim()) return;
        setMeds([...meds, { name: input.trim(), verified: false }]);
        setInput('');
    }

    function handleContinue() {
        setMedications(meds.map(m => m.name));
        navigate('/intake/allergies');
    }

    function handleRemove(index: number) {
        setMeds(meds.filter((_, i) => i !== index));
    }

    function handleVerify(index: number) {
        const updated = [...meds];
        updated[index].verified = true;
        setMeds(updated);
    }

    async function handleDrugLabelCaptured(imageBase64: string) {
        setShowCapture(false);
        setAnalyzing(true);
        try {
            const result = await analyzeDrugLabel(imageBase64, '', '', lang);
            if (result.extracted?.drugName) {
                setMeds(prev => [...prev, {
                    name: result.extracted.drugName,
                    dose: result.extracted.dosage || undefined,
                    verified: result.crossValidation?.overallMatch === 'match',
                }]);
            }
        } catch (err) {
            console.error('[MedicationsPage] Drug label analysis failed:', err);
        } finally {
            setAnalyzing(false);
        }
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <div style={{ height: 4, backgroundColor: 'var(--bg-card)', borderRadius: 2, margin: '16px 0 24px' }}>
                    <div style={{ height: 4, width: '55%', backgroundColor: '#1A8A9E', borderRadius: 2 }} />
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{t('intake.medications')}</h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' }}>{t('intake.medicationsHint')}</p>

                {/* Add manually */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder="Medication name…"
                        style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} />
                    <button onClick={handleAdd} style={{ padding: '12px 16px', borderRadius: 10, border: 'none', backgroundColor: '#1A8A9E', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+</button>
                </div>

                {/* Scan label */}
                <button onClick={() => setShowCapture(true)} disabled={analyzing} style={{
                    width: '100%', padding: '12px', borderRadius: 10, border: '1px dashed var(--border)',
                    backgroundColor: 'var(--bg-card)', color: analyzing ? '#1A8A9E' : 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', marginBottom: 16,
                }}>{analyzing ? '⏳ Analyzing label…' : '📷 Scan medication label'}</button>

                {/* Medication list */}
                {meds.map((med, i) => (
                    <MedicationVerificationCard key={i} medication={med} onVerify={() => handleVerify(i)} onRemove={() => handleRemove(i)} />
                ))}

                <button onClick={handleContinue} style={{
                    width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                    backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 20,
                }}>{meds.length === 0 ? t('intake.noMedications') : t('common.continue')}</button>
            </div>

            {showCapture && <DrugLabelCapture onCaptured={handleDrugLabelCaptured} onCancel={() => setShowCapture(false)} />}
        </div>
    );
}
