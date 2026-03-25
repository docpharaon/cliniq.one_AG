'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: '#0A0E1A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Inter, sans-serif',
                color: '#fff',
                textAlign: 'center',
                padding: '2rem',
            }}
        >
            <div>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#2DD4BF', margin: 0 }}>Something went wrong</h1>
                <p style={{ fontSize: '1rem', color: '#94A3B8', marginTop: '1rem' }}>An unexpected error occurred</p>
                <button
                    onClick={reset}
                    style={{
                        marginTop: '2rem',
                        padding: '0.75rem 2rem',
                        backgroundColor: '#2DD4BF',
                        color: '#0A0E1A',
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
