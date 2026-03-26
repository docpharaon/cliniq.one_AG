export default function NotFound() {
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
                <h1 style={{ fontSize: '6rem', fontWeight: 800, color: '#1A8A9E', margin: 0 }}>404</h1>
                <p style={{ fontSize: '1.25rem', color: '#64748B', marginTop: '1rem' }}>Page not found</p>
                <a
                    href="/"
                    style={{
                        display: 'inline-block',
                        marginTop: '2rem',
                        padding: '0.75rem 2rem',
                        backgroundColor: '#1A8A9E',
                        color: '#FFFFFF',
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
