'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingOAuth, setCheckingOAuth] = useState(false);
    const router = useRouter();

    // Handle OAuth callback (hash tokens)
    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            setCheckingOAuth(true);
            handleOAuthCallback();
        }
    }, []);

    async function handleOAuthCallback() {
        try {
            const supabase = createBrowserSupabase();
            // Supabase auto-detects hash and sets session
            await new Promise(r => setTimeout(r, 500));
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setError('OAuth session could not be established');
                setCheckingOAuth(false);
                return;
            }

            // Validate role
            const roleOk = await validateAdminRole(supabase, session.user.id, session.user.email || undefined);
            if (!roleOk) {
                await supabase.auth.signOut();
                setError('Unauthorized: Your account does not have admin access.');
                setCheckingOAuth(false);
                // Clean hash from URL
                window.history.replaceState(null, '', '/login');
                return;
            }

            // Clean hash and redirect
            window.location.href = '/dashboard';
        } catch (err: any) {
            setError(err?.message || 'OAuth callback failed');
            setCheckingOAuth(false);
        }
    }

    async function validateAdminRole(supabase: ReturnType<typeof createBrowserSupabase>, userId: string, userEmail?: string): Promise<boolean> {
        const { data, error: fetchError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        // If user exists, check their role
        if (data) {
            return data.role === 'admin' || data.role === 'superadmin';
        }

        // Bootstrap: initial superadmin account
        const INITIAL_SUPERADMIN = 'momen@momencrafts.com';
        if (userEmail === INITIAL_SUPERADMIN) {
            try {
                await supabase.from('users').insert({
                    id: userId,
                    email: userEmail,
                    nickname: 'Superadmin',
                    role: 'superadmin',
                    status: 'active',
                    tokens_balance: 0,
                    language: 'en',
                    onboarding_completed: true,
                });
                return true;
            } catch (err) {
                console.error('Failed to bootstrap superadmin:', err);
                return false;
            }
        }

        return false;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const supabase = createBrowserSupabase();
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError('Invalid email or password');
                setLoading(false);
                return;
            }

            // Validate role
            if (data.session) {
                const roleOk = await validateAdminRole(supabase, data.session.user.id, data.session.user.email || undefined);
                if (!roleOk) {
                    await supabase.auth.signOut();
                    setError('Unauthorized: Your account does not have admin access.');
                    setLoading(false);
                    return;
                }
            }

            // Full redirect to let middleware pick up the session cookie
            window.location.href = '/dashboard';
        } catch {
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: 'google' | 'apple') => {
        setError('');
        setLoading(true);
        try {
            const supabase = createBrowserSupabase();
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.origin + '/login',
                    queryParams: provider === 'google'
                        ? { prompt: 'select_account' }
                        : { prompt: 'consent' },
                },
            });
            if (oauthError) throw oauthError;
        } catch (err: any) {
            setError(err?.message || `${provider} sign-in failed`);
            setLoading(false);
        }
    };

    const isDisabled = loading || checkingOAuth;

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-lg shadow-accent/20">
                        <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                    <h1
                        className="text-3xl font-bold bg-gradient-to-r from-accent to-purple bg-clip-text"
                        style={{ WebkitTextFillColor: 'transparent' }}
                    >
                        cliniq.one
                    </h1>
                    <p className="text-text-muted mt-1 text-sm">Admin Panel</p>
                </div>

                {/* OAuth checking state */}
                {checkingOAuth ? (
                    <div className="glass rounded-2xl p-8 border border-border text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
                        <p className="text-text-primary font-semibold">Verifying credentials...</p>
                        <p className="text-text-muted text-sm mt-1">Checking admin access</p>
                        {error && (
                            <div className="flex items-center gap-2 text-error text-sm px-3 py-2 bg-error-faded rounded-xl border border-[rgba(239,68,68,0.3)] mt-4">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Login Card */
                    <div className="glass rounded-2xl p-8 border border-border">
                        <h2 className="text-lg font-bold text-text-primary mb-1">Welcome Back</h2>
                        <p className="text-sm text-text-muted mb-6">Sign in to continue to the admin dashboard</p>

                        <form onSubmit={handleLogin} className="space-y-5">
                            {/* Email */}
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@cliniq.one"
                                    required
                                    disabled={isDisabled}
                                    className="w-full pl-11 pr-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all text-sm disabled:opacity-60"
                                />
                            </div>

                            {/* Password */}
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    disabled={isDisabled}
                                    className="w-full pl-11 pr-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all text-sm disabled:opacity-60"
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 text-error text-sm px-3 py-2 bg-error-faded rounded-xl border border-[rgba(239,68,68,0.3)]">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isDisabled}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-purple text-white font-bold text-sm hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(45,212,191,0.4)] transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Signing in…
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>

                        {/* Social Login Divider */}
                        <div className="flex items-center gap-3 mt-6 mb-4">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-text-muted">or continue with</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* OAuth Buttons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                disabled={isDisabled}
                                onClick={() => handleOAuth('google')}
                                className="flex-1 py-3 rounded-xl bg-bg-elevated border border-border text-text-primary text-sm font-semibold hover:bg-bg-elevated/80 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                <span className="text-base font-bold" style={{ color: '#4285F4' }}>G</span>
                                Google
                            </button>
                            <button
                                type="button"
                                disabled={isDisabled}
                                onClick={() => handleOAuth('apple')}
                                className="flex-1 py-3 rounded-xl bg-bg-elevated border border-border text-text-primary text-sm font-semibold hover:bg-bg-elevated/80 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                <span className="text-base">🍎</span>
                                Apple
                            </button>
                        </div>
                    </div>
                )}

                <p className="text-center text-text-muted text-xs mt-6">
                    © {new Date().getFullYear()} cliniq.one — Admin access only
                </p>
            </div>
        </div>
    );
}
