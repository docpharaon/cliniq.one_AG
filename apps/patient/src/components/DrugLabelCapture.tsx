import React, { useRef, useState } from 'react';

interface DrugLabelCaptureProps {
    onCaptured: (dataUrl: string) => void;
    onCancel: () => void;
    analyzing?: boolean;
}

/**
 * Web-native drug label capture using file input.
 * Allows patients to photograph medication labels for AI analysis.
 */
export function DrugLabelCapture({ onCaptured, onCancel, analyzing }: DrugLabelCaptureProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setPreview(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }

    function handleConfirm() {
        if (preview) onCaptured(preview);
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
        }}>
            <div style={{
                backgroundColor: 'var(--bg-primary)', borderRadius: 16, padding: 24,
                maxWidth: 400, width: '100%', textAlign: 'center',
            }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                    💊 Scan Medication Label
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: '18px' }}>
                    Take a clear photo of the medication label. The AI will extract drug name, dose, and instructions.
                </p>

                {analyzing ? (
                    <div style={{ padding: 40 }}>
                        <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Analyzing medication label…</p>
                    </div>
                ) : preview ? (
                    <div style={{ marginBottom: 16 }}>
                        <img src={preview} alt="Drug label" style={{
                            width: '100%', maxHeight: 250, objectFit: 'contain',
                            borderRadius: 10, marginBottom: 12,
                        }} />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => { setPreview(null); inputRef.current?.click(); }}
                                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                                Retake
                            </button>
                            <button onClick={handleConfirm}
                                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                                    backgroundColor: '#1A8A9E', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                                Analyze
                            </button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => inputRef.current?.click()}
                        style={{
                            width: '100%', padding: '40px 20px', borderRadius: 12,
                            border: '2px dashed var(--border)', backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-tertiary)', fontSize: 15, cursor: 'pointer', marginBottom: 16,
                        }}>
                        📷 Tap to photograph label
                    </button>
                )}

                <input ref={inputRef} type="file" accept="image/*" capture="environment"
                    onChange={handleFileChange} style={{ display: 'none' }} />

                <button onClick={onCancel}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)',
                        fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
                    Cancel
                </button>
            </div>
        </div>
    );
}
