import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@cliniqone/i18n';
import { useIntakeStore } from '../../stores/intakeStore';
import { BackButton } from '../../components/BackButton';

export default function AllergiesPage() {
    const navigate = useNavigate();
    const { allergies, setAllergies } = useIntakeStore();
    const [input, setInput] = useState('');
    const [items, setItems] = useState<string[]>(allergies);

    function handleAdd() {
        if (!input.trim()) return;
        setItems([...items, input.trim()]);
        setInput('');
    }

    function handleRemove(index: number) {
        setItems(items.filter((_, i) => i !== index));
    }

    function handleContinue() {
        setAllergies(items);
        navigate('/intake/review');
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <div style={{ height: 4, backgroundColor: 'var(--bg-card)', borderRadius: 2, margin: '16px 0 24px' }}>
                    <div style={{ height: 4, width: '70%', backgroundColor: '#1A8A9E', borderRadius: 2 }} />
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{t('intake.allergies')}</h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' }}>{t('intake.allergiesHint')}</p>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder="Allergy name (e.g., Penicillin)…"
                        style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} />
                    <button onClick={handleAdd} style={{ padding: '12px 16px', borderRadius: 10, border: 'none', backgroundColor: '#DC2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+</button>
                </div>

                {items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-card)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>⚠️ {item}</span>
                        <button onClick={() => handleRemove(i)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                ))}

                <button onClick={handleContinue} style={{
                    width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                    backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 20,
                }}>{items.length === 0 ? t('intake.noAllergies') : t('common.continue')}</button>
            </div>
        </div>
    );
}
