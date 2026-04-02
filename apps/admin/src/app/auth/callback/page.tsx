import { useEffect, useState, useRef } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

// Guard against React StrictMode double-mount
let _exchangeInProgress = false;

export default function AuthCallbackPage() {
    const [error, setError] = useState('');
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current || _exchangeInProgress) return;
        hasRun.current = true;
        _exchangeInProgress = true;
        handleCallback().finally(() => {
            _exchangeInProgress = false;
        });
    }, []);

    async function handleCallback() {
        try {
            const supabase = createBrowserSupabase();
            const url = new URL(window.location.href);
            const code = url.searchParams.get('code');

            if (!code) {
                setError('No authorization code found.');
                return;
            }

            console.log('[AuthCallback] Exchanging code for session...');

            // Exchange code for session (PKCE flow)
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
                console.error('[AuthCallback] Code exchange error:', exchangeError);
                setError(exchangeError.message || 'Failed to exchange authorization code.');
                return;
            }

            if (!data.session) {
                setError('No session established after code exchange.');
                return;
            }

            console.log('[AuthCallback] Session established for:', data.session.user.email);

            // Validate admin role
            const userId = data.session.user.id;
            const userEmail = data.session.user.email;

            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single() as { data: { role: string } | null };

            console.log('[AuthCallback] DB role:', userData?.role, 'Email:', userEmail);

            if (userData && (userData.role === 'admin' || userData.role === 'superadmin')) {
                // User exists with admin role — redirect to dashboard
                console.log('[AuthCallback] Admin access granted, redirecting...');
                window.location.href = '/dashboard';
                return;
            }

            // Bootstrap: initial superadmin account
            const INITIAL_SUPERADMIN = import.meta.env.VITE_INITIAL_SUPERADMIN || 'momen@momencrafts.com';
            if (userEmail === INITIAL_SUPERADMIN) {
                console.log('[AuthCallback] Bootstrap superadmin for:', userEmail);
                try {
                    if (userData) {
                        // User exists but has wrong role — upgrade to superadmin
                        await (supabase.from('users') as any).update({ role: 'superadmin' }).eq('id', userId);
                    } else {
                        // User doesn't exist — create as superadmin
                        await (supabase.from('users') as any).insert({
                            id: userId,
                            email: userEmail,
                            nickname: 'Superadmin',
                            role: 'superadmin',
                            status: 'active',
                            tokens_balance: 0,
                            language: 'en',
                            onboarding_completed: true,
                        });
                    }
                    // H3 Fix: Only redirect if DB write succeeded
                    window.location.href = '/dashboard';
                    return;
                } catch (err) {
                    console.error('[AuthCallback] Failed to bootstrap superadmin:', err);
                    setError('Failed to initialize superadmin account. Please try again.');
                    return;
                }
            }

            // Not authorized
            await supabase.auth.signOut();
            setError('Unauthorized: Your account does not have admin access.');
        } catch (err: any) {
            console.error('[AuthCallback] Error:', err);
            // Ignore abort errors from StrictMode
            if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
                console.log('[AuthCallback] Ignoring abort error (StrictMode)');
                return;
            }
            setError(err?.message || 'Authentication failed.');
        }
    }

    if (error) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
                <div className="glass rounded-2xl p-8 border border-border max-w-md w-full text-center">
                    <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-text-primary mb-2">Authentication Failed</h2>
                    <p className="text-sm text-text-muted mb-6">{error}</p>
                    <a
                        href="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:-translate-y-0.5 transition-all"
                    >
                        Back to Login
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
            <div className="glass rounded-2xl p-8 border border-border max-w-md w-full text-center">
                <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto mb-4" />
                <h2 className="text-lg font-bold text-text-primary mb-1">Verifying credentials…</h2>
                <p className="text-sm text-text-muted">Completing sign-in</p>
            </div>
        </div>
    );
}
