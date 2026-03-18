export default function NotFound() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#0A0F1C',
            color: '#f1f5f9',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
        }}>
            <h1 style={{ fontSize: 72, fontWeight: 900, color: '#2DD4BF', margin: 0 }}>404</h1>
            <p style={{ fontSize: 18, color: '#94a3b8', marginTop: 12 }}>Page not found</p>
            <a
                href="/dashboard"
                style={{
                    marginTop: 24,
                    padding: '10px 24px',
                    borderRadius: 12,
                    background: 'rgba(45,212,191,0.15)',
                    border: '1px solid rgba(45,212,191,0.3)',
                    color: '#2DD4BF',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                }}
            >
                Go to Dashboard
            </a>
        </div>
    );
}
