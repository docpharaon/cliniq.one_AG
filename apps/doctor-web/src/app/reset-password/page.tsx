'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const supabase = createBrowserSupabase();
            const { error: updateError } = await supabase.auth.updateUser({ password });

            if (updateError) {
                setError(updateError.message);
                setLoading(false);
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch {
            setError('Something went wrong. Please try again.');
        }
        setLoading(false);
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

                {/* Card */}
                <div className="glass rounded-2xl p-8 border border-border">
                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-success-faded flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-success" />
                            </div>
                            <h2 className="text-lg font-bold text-text-primary">Password Updated!</h2>
                            <p className="text-sm text-text-muted">
                                Redirecting you to the login page…
                            </p>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-lg font-bold text-text-primary mb-1">Set New Password</h2>
                            <p className="text-sm text-text-muted mb-6">
                                Choose a strong password for your account.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="New password"
                                        required
                                        minLength={8}
                                        className="w-full pl-11 pr-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all text-sm"
                                    />
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        required
                                        minLength={8}
                                        className="w-full pl-11 pr-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all text-sm"
                                    />
                                </div>

                                <p className="text-xs text-text-muted">Minimum 8 characters</p>

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
                                            Updating…
                                        </>
                                    ) : (
                                        'Update Password'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p className="text-center text-text-muted text-xs mt-6">
                    © {new Date().getFullYear()} cliniq.one — Doctor Portal
                </p>
            </div>
        </div>
    );
}
