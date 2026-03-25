export default function NotFound() {
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
                <h1 style={{ fontSize: '6rem', fontWeight: 800, color: '#2DD4BF', margin: 0 }}>404</h1>
                <p style={{ fontSize: '1.25rem', color: '#94A3B8', marginTop: '1rem' }}>Page not found</p>
                <a
                    href="/"
                    style={{
                        display: 'inline-block',
                        marginTop: '2rem',
                        padding: '0.75rem 2rem',
                        backgroundColor: '#2DD4BF',
                        color: '#0A0E1A',
                        borderRadius: '9999px',
                        fontWeight: 600,
                        textDecoration: 'none',
                    }}
                >
                    Back to Home
                </a>
            </div>
        </div>
    );
}
