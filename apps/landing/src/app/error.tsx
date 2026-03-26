'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Inter, sans-serif',
                color: '#1E293B',
                textAlign: 'center',
                padding: '2rem',
            }}
        >
            <div>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#1A8A9E', margin: 0 }}>Something went wrong</h1>
                <p style={{ fontSize: '1rem', color: '#64748B', marginTop: '1rem' }}>An unexpected error occurred</p>
                <button
                    onClick={reset}
                    style={{
                        marginTop: '2rem',
                        padding: '0.75rem 2rem',
                        backgroundColor: '#1A8A9E',
                        color: '#FFFFFF',
                        borderRadius: '9999px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}
