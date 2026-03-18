'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
        }}>
            <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(45, 212, 191, 0.2)',
                borderRadius: '24px',
                padding: '40px',
                maxWidth: '420px',
                width: '100%',
                textAlign: 'center',
            }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: '#f1f5f9' }}>
                    Something went wrong
                </h2>
                <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 24px' }}>
                    {error.message || 'An unexpected error occurred.'}
                </p>
                <button
                    onClick={reset}
                    style={{
                        background: '#2DD4BF',
                        color: '#0A0F1C',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px 20px',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                    }}
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}
