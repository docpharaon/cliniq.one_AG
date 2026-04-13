'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccessPage() {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        setLoading(true);
        // Navigate with password param — middleware will validate, set cookie, and redirect
        router.push(`/?_pw=${encodeURIComponent(input.trim())}`);
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6" dir="ltr"
            style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0d1321 100%)' }}>
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2.5 mb-6">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #00D4AA, #00B894)' }}>
                            <span className="font-black text-lg" style={{ color: '#0a0f1a' }}>C</span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight" style={{ color: '#f1f5f9' }}>
                            cliniq<span style={{ color: '#00D4AA' }}>.one</span>
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                        style={{ background: 'rgba(0, 212, 170, 0.08)', border: '1px solid rgba(0, 212, 170, 0.15)' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00D4AA' }} />
                        <span className="text-xs font-medium" style={{ color: '#00D4AA' }}>Early Access</span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
                        This platform is currently in private preview.<br />
                        Enter the access code to continue.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            id="access-password"
                            type="password"
                            value={input}
                            onChange={(e) => { setInput(e.target.value); setError(false); }}
                            placeholder="Access code"
                            autoFocus
                            autoComplete="off"
                            className="w-full px-5 py-4 rounded-2xl text-center text-lg tracking-widest focus:outline-none transition-all"
                            style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: error ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#f1f5f9',
                                boxShadow: 'none',
                            }}
                            onFocus={(e) => {
                                if (!error) e.target.style.border = '1px solid rgba(0, 212, 170, 0.4)';
                                e.target.style.boxShadow = error
                                    ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
                                    : '0 0 0 3px rgba(0, 212, 170, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.border = error ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-center" style={{ color: '#ef4444' }}>
                            Incorrect access code. Please try again.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="w-full py-4 rounded-2xl font-bold text-sm transition-all"
                        style={{
                            background: !input.trim() ? 'rgba(0, 212, 170, 0.3)' : 'linear-gradient(135deg, #00D4AA, #00B894)',
                            color: '#0a0f1a',
                            cursor: !input.trim() ? 'not-allowed' : 'pointer',
                            opacity: !input.trim() ? 0.5 : 1,
                        }}
                    >
                        {loading ? (
                            <span className="inline-flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Verifying...
                            </span>
                        ) : (
                            'Enter'
                        )}
                    </button>
                </form>

                <p className="text-center text-xs mt-10" style={{ color: '#475569' }}>
                    © 2026 cliniq.one · A Momencraft venture
                </p>
            </div>
        </div>
    );
}
