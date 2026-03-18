'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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

            // Verify this user is actually a doctor
            const { data: doctor } = await supabase
                .from('doctors')
                .select('id, status')
                .eq('user_id', data.user.id)
                .single();

            if (!doctor) {
                await supabase.auth.signOut();
                setError('This account is not registered as a doctor');
                setLoading(false);
                return;
            }

            if (doctor.status !== 'active') {
                await supabase.auth.signOut();
                setError('Your doctor account is not yet active. Please contact admin.');
                setLoading(false);
                return;
            }

            window.location.href = '/dashboard';
        } catch {
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-lg shadow-accent/20">
                        <Stethoscope className="w-10 h-10 text-white" />
                    </div>
                    <h1
                        className="text-3xl font-bold bg-gradient-to-r from-accent to-purple bg-clip-text"
                        style={{ WebkitTextFillColor: 'transparent' }}
                    >
                        cliniq.one
                    </h1>
                    <p className="text-text-muted mt-1 text-sm">Doctor Portal</p>
                </div>

                {/* Login Card */}
                <div className="glass rounded-2xl p-8 border border-border">
                    <h2 className="text-lg font-bold text-text-primary mb-1">Welcome, Doctor</h2>
                    <p className="text-sm text-text-muted mb-6">Sign in to access your consultation dashboard</p>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="doctor@cliniq.one"
                                required
                                className="w-full pl-11 pr-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all text-sm"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="w-full pl-11 pr-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all text-sm"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-error text-sm px-3 py-2 bg-error-faded rounded-xl border border-[rgba(239,68,68,0.3)]">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
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

                    <div className="mt-4 text-center">
                        <a href="/forgot-password" className="text-sm text-accent hover:underline">
                            Forgot password?
                        </a>
                    </div>
                </div>

                <p className="text-center text-text-muted text-xs mt-6">
                    © {new Date().getFullYear()} cliniq.one — Doctor Portal
                </p>
            </div>
        </div>
    );
}
