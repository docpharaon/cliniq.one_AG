'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Stethoscope, Mail, AlertCircle, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const supabase = createBrowserSupabase();
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
            });

            if (resetError) {
                setError(resetError.message);
                setLoading(false);
                return;
            }

            setSent(true);
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
                    {sent ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-success-faded flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-success" />
                            </div>
                            <h2 className="text-lg font-bold text-text-primary">Check Your Email</h2>
                            <p className="text-sm text-text-muted leading-relaxed">
                                We&apos;ve sent a password reset link to{' '}
                                <span className="text-accent font-semibold">{email}</span>.
                                Please check your inbox and follow the instructions.
                            </p>
                            <p className="text-xs text-text-muted">
                                Didn&apos;t receive it? Check your spam folder or{' '}
                                <button
                                    onClick={() => { setSent(false); setError(''); }}
                                    className="text-accent hover:underline"
                                >
                                    try again
                                </button>.
                            </p>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-lg font-bold text-text-primary mb-1">Reset Password</h2>
                            <p className="text-sm text-text-muted mb-6">
                                Enter your email address and we&apos;ll send you a reset link.
                            </p>

                            <form onSubmit={handleReset} className="space-y-5">
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
                                            Sending…
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>
                            </form>
                        </>
                    )}

                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>

                <p className="text-center text-text-muted text-xs mt-6">
                    © {new Date().getFullYear()} cliniq.one — Doctor Portal
                </p>
            </div>
        </div>
    );
}
