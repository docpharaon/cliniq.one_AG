'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body style={{ background: '#0A0F1C', color: '#F1F5F9', fontFamily: 'Inter, system-ui, sans-serif', margin: 0 }}>
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(45, 212, 191, 0.2)',
                        borderRadius: '24px',
                        padding: '40px',
                        maxWidth: '420px',
                        width: '100%',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: '64px', height: '64px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            borderRadius: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px',
                            fontSize: '28px',
                        }}>
                            ⚠️
                        </div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>Something went wrong</h1>
                        <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 24px' }}>
                            An unexpected error occurred. Please try again.
                        </p>
                        {error.digest && (
                            <p style={{ color: '#64748B', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 24px' }}>
                                Error ID: {error.digest}
                            </p>
                        )}
                        <button
                            onClick={reset}
                            style={{
                                background: '#2DD4BF',
                                color: '#0A0F1C',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '12px 24px',
                                fontWeight: 600,
                                fontSize: '14px',
                                cursor: 'pointer',
                            }}
                        >
                            🔄 Try Again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
