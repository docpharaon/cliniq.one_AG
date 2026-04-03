import React from 'react';
import { CheckCircle, Pill } from '@cliniqone/ui';

interface MedicationVerificationCardProps {
    medication: {
        name: string;
        dose?: string;
        frequency?: string;
        verified: boolean;
    };
    onVerify: () => void;
    onRemove: () => void;
}

/** Card displaying a detected medication with verify/remove actions */
export function MedicationVerificationCard({ medication, onVerify, onRemove }: MedicationVerificationCardProps) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: '12px 14px',
            marginBottom: 8, border: `1px solid ${medication.verified ? '#059669' : '#334155'}`,
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {medication.verified ? <CheckCircle size={16} color="#059669" /> : <Pill size={16} color="var(--text-secondary)" />}
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{medication.name}</span>
                </div>
                {(medication.dose || medication.frequency) && (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, marginLeft: 28 }}>
                        {[medication.dose, medication.frequency].filter(Boolean).join(' • ')}
                    </p>
                )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
                {!medication.verified && (
                    <button onClick={onVerify} style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none',
                        backgroundColor: '#059669', color: '#fff', fontSize: 12,
                        fontWeight: 600, cursor: 'pointer',
                    }}>
                        ✓ Verify
                    </button>
                )}
                <button onClick={onRemove} style={{
                    padding: '6px 10px', borderRadius: 8,
                    border: '1px solid var(--border)', backgroundColor: 'transparent',
                    color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
                }}>
                    ✕
                </button>
            </div>
        </div>
    );
}
