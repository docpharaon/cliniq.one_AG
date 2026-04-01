import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function UnauthorizedPage() {
    const handleLogout = async () => {
        const supabase = createBrowserSupabase();
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
            <div className="w-full max-w-md text-center">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-error-faded flex items-center justify-center">
                    <ShieldAlert className="w-10 h-10 text-error" />
                </div>

                {/* Title */}
                <h1
                    className="text-3xl font-bold mb-2 bg-gradient-to-r from-error to-orange-500 bg-clip-text"
                    style={{ WebkitTextFillColor: 'transparent' }}
                >
                    Access Denied
                </h1>
                <p className="text-text-muted text-sm mb-8 leading-relaxed">
                    Your account does not have administrator privileges.
                    <br />
                    Contact a superadmin to request access.
                </p>

                {/* Info Card */}
                <div className="glass rounded-2xl p-6 border border-border mb-6 text-left">
                    <h3 className="text-sm font-bold text-text-primary mb-3">Who can access this panel?</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-sm">
                            <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                            <span className="text-text-secondary">
                                <strong className="text-accent">Admins</strong> — manage doctors, patients, consultations
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="w-2 h-2 rounded-full bg-purple flex-shrink-0" />
                            <span className="text-text-secondary">
                                <strong className="text-purple">Superadmins</strong> — full platform control, settings, AI config
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-bg-elevated transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-error text-white text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(239,68,68,0.4)] transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>

                <p className="text-center text-text-muted text-xs mt-8">
                    © {new Date().getFullYear()} cliniq.one — Admin access only
                </p>
            </div>
        </div>
    );
}
