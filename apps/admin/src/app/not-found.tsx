import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
            <div className="glass rounded-2xl p-10 max-w-md w-full text-center space-y-6">
                <div className="text-6xl font-bold text-accent">404</div>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Page not found</h1>
                    <p className="text-sm text-text-muted mt-2">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    </p>
                </div>
                <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg-primary font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all"
                >
                    🏠 Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
