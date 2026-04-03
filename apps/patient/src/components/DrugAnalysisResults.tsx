import React from 'react';
import { Search, Pill } from '@cliniqone/ui';

interface DrugAnalysisResult {
    name: string;
    genericName?: string;
    dose?: string;
    unit?: string;
    frequency?: string;
    route?: string;
    indication?: string;
    confidence: number;
}

interface DrugAnalysisResultsProps {
    results: DrugAnalysisResult[];
    onConfirm: (results: DrugAnalysisResult[]) => void;
    onRetry: () => void;
    onDismiss: () => void;
}

/** Display AI-detected drug information from label analysis */
export function DrugAnalysisResults({ results, onConfirm, onRetry, onDismiss }: DrugAnalysisResultsProps) {
    if (results.length === 0) {
        return (
            <div style={{ padding: 20, textAlign: 'center' }}>
                <Search size={40} color="var(--text-tertiary)" style={{ display: 'block', marginBottom: 12 }} />
                <h3 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                    No medications detected
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
                    Please try again with a clearer photo of the medication label.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onRetry} style={btnSecondary}>Try Again</button>
                    <button onClick={onDismiss} style={btnPrimary}>Skip</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: 16 }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Pill size={18} color="#1A8A9E" /> Detected Medications
            </h3>
            {results.map((drug, idx) => (
                <div key={idx} style={{
                    backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 14,
                    marginBottom: 8, border: '1px solid var(--border)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{drug.name}</span>
                        <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                            backgroundColor: drug.confidence > 0.8 ? '#059669' + '30' : '#D97706' + '30',
                            color: drug.confidence > 0.8 ? '#059669' : '#D97706',
                        }}>
                            {Math.round(drug.confidence * 100)}%
                        </span>
                    </div>
                    {drug.genericName && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Generic: {drug.genericName}</p>}
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        {drug.dose && <InfoChip label="Dose" value={`${drug.dose}${drug.unit || ''}`} />}
                        {drug.frequency && <InfoChip label="Frequency" value={drug.frequency} />}
                        {drug.route && <InfoChip label="Route" value={drug.route} />}
                    </div>
                    {drug.indication && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>For: {drug.indication}</p>}
                </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button onClick={onRetry} style={btnSecondary}>Scan Another</button>
                <button onClick={() => onConfirm(results)} style={btnPrimary}>Confirm</button>
            </div>
        </div>
    );
}

function InfoChip({ label, value }: { label: string; value: string }) {
    return (
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#CBD5E1' }}>{label}:</strong> {value}
        </span>
    );
}

const btnPrimary: React.CSSProperties = {
    flex: 1, padding: '12px', borderRadius: 10, border: 'none',
    backgroundColor: '#1A8A9E', color: '#fff', cursor: 'pointer',
    fontSize: 14, fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
    flex: 1, padding: '12px', borderRadius: 10,
    border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)',
    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600,
};
