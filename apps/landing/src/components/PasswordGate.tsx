'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const STORAGE_KEY = 'cliniq_mvp_unlocked';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
    const [unlocked, setUnlocked] = useState(false);
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [checking, setChecking] = useState(true);
    const [verifying, setVerifying] = useState(false);
    // Animation states
    const [ribbonCut, setRibbonCut] = useState(false);
    const [overlayFading, setOverlayFading] = useState(false);
    const [fullyRevealed, setFullyRevealed] = useState(false);
    const { t, dir } = useI18n();

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'true') {
            setUnlocked(true);
            setFullyRevealed(true);
        }
        setChecking(false);
    }, []);

    const handleUnlock = useCallback(async () => {
        if (!input.trim() || verifying) return;
        setVerifying(true);
        setError(false);

        try {
            const res = await fetch('/api/verify-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: input.trim() }),
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem(STORAGE_KEY, 'true');
                // Phase 1: Cut the ribbon
                setRibbonCut(true);
                // Phase 2: Fade overlay
                setTimeout(() => setOverlayFading(true), 900);
                // Phase 3: Fully reveal
                setTimeout(() => {
                    setFullyRevealed(true);
                    setUnlocked(true);
                }, 1700);
            } else {
                setError(true);
                setInput('');
            }
        } catch {
            setError(true);
        } finally {
            setVerifying(false);
        }
    }, [input, verifying]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleUnlock();
    };

    if (checking) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (unlocked && fullyRevealed) {
        return <>{children}</>;
    }

    return (
        <div className="relative">
            {/* ═══ Page content underneath (blurred) ═══ */}
            <div
                className="transition-all duration-1000 ease-out"
                style={{
                    filter: overlayFading ? 'blur(0px)' : 'blur(6px)',
                    transform: overlayFading ? 'scale(1)' : 'scale(1.01)',
                    pointerEvents: fullyRevealed ? 'auto' : 'none',
                }}
            >
                {children}
            </div>

            {/* ═══ Light glassmorphism overlay ═══ */}
            {!fullyRevealed && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
                    style={{
                        opacity: overlayFading ? 0 : 1,
                        transition: 'opacity 0.8s ease',
                        pointerEvents: overlayFading ? 'none' : 'auto',
                    }}
                >
                    {/* Backdrop — frosted white glass */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'radial-gradient(ellipse at center, rgba(245,248,250,0.92) 0%, rgba(255,255,255,0.96) 100%)',
                            backdropFilter: 'blur(24px) saturate(1.2)',
                            WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
                        }}
                    />

                    {/* Subtle ambient orbs (teal + blue from design system) */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(26,138,158,0.06) 0%, transparent 70%)', animation: 'gate-float1 12s ease-in-out infinite' }} />
                        <div className="absolute -bottom-32 -left-20 w-[400px] h-[400px] rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(59,122,141,0.05) 0%, transparent 70%)', animation: 'gate-float2 15s ease-in-out infinite' }} />
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(27,58,92,0.03) 0%, transparent 60%)', animation: 'gate-float1 18s ease-in-out infinite reverse' }} />
                    </div>

                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none z-10 h-[100px]">
                        {/* Left half */}
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: '50%',
                                height: '100%',
                                background: 'linear-gradient(to bottom, #991b1b 0%, #ef4444 50%, #991b1b 100%)',
                                boxShadow: '0 8px 32px rgba(185, 28, 28, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.3)',
                                transformOrigin: 'left center',
                                transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease',
                                transform: ribbonCut ? 'translateX(-110%) rotate(-2deg)' : 'translateX(0) rotate(0deg)',
                                opacity: ribbonCut ? 0 : 1,
                            }}
                        />
                        {/* Right half */}
                        <div
                            style={{
                                position: 'absolute',
                                left: '50%',
                                right: 0,
                                height: '100%',
                                background: 'linear-gradient(to bottom, #991b1b 0%, #ef4444 50%, #991b1b 100%)',
                                boxShadow: '0 8px 32px rgba(185, 28, 28, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.3)',
                                transformOrigin: 'right center',
                                transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease',
                                transform: ribbonCut ? 'translateX(110%) rotate(2deg)' : 'translateX(0) rotate(0deg)',
                                opacity: ribbonCut ? 0 : 1,
                            }}
                        />
                    </div>

                    {/* ═══ Access Card ═══ */}
                    <div
                        className="relative z-20 w-full max-w-[420px]"
                        style={{
                            transition: 'transform 0.9s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.7s ease',
                            transform: ribbonCut ? 'scale(0.96) translateY(-8px)' : 'scale(1)',
                            opacity: ribbonCut ? 0 : 1,
                        }}
                    >
                        <div
                            style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '24px',
                                padding: '40px 36px',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(24px)',
                                position: 'relative',
                                overflow: 'hidden',
                                direction: dir,
                            }}
                        >
                            {/* Subtle top gradient accent */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                                background: 'linear-gradient(90deg, #DC2626, #EF4444, #DC2626)',
                            }} />

                            {/* Lock icon */}
                            <div className="flex justify-center mb-6">
                                <div
                                    style={{
                                        width: '52px', height: '52px', borderRadius: '16px',
                                        background: 'rgba(239,68,68,0.1)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    <Lock size={22} color="#EF4444" />
                                </div>
                            </div>

                            {/* Title */}
                            <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                                {t('gate.title')}
                            </h2>
                            <p style={{ textAlign: 'center', fontSize: '15px', color: 'rgba(255,255,255,0.7)', marginBottom: '28px', lineHeight: 1.6 }}>
                                {t('gate.sub')}
                            </p>

                            {/* Form */}
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="mvp-access-code"
                                        type={showPassword ? 'text' : 'password'}
                                        value={input}
                                        onChange={(e) => { setInput(e.target.value); setError(false); }}
                                        placeholder={t('gate.placeholder')}
                                        autoFocus
                                        autoComplete="off"
                                        style={{
                                            width: '100%',
                                            padding: dir === 'rtl' ? '14px 18px 14px 48px' : '14px 48px 14px 18px',
                                            borderRadius: '14px',
                                            fontSize: '14px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: error ? '1.5px solid #DC2626' : '1.5px solid rgba(255,255,255,0.1)',
                                            color: '#FFFFFF',
                                            outline: 'none',
                                            transition: 'border-color 0.2s, box-shadow 0.2s',
                                            textAlign: dir === 'rtl' ? 'right' : 'left',
                                        }}
                                        onFocus={(e) => {
                                            if (!error) {
                                                e.target.style.borderColor = '#EF4444';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.1)';
                                            }
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = error ? '#DC2626' : 'rgba(255,255,255,0.1)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute', 
                                            right: dir === 'rtl' ? 'auto' : '14px',
                                            left: dir === 'rtl' ? '14px' : 'auto',
                                            top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px',
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>

                                {error && (
                                    <p style={{ fontSize: '13px', textAlign: 'center', color: '#F87171', margin: 0 }}>
                                        {t('gate.error')}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={!input.trim() || verifying}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '14px',
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        border: 'none',
                                        cursor: !input.trim() ? 'not-allowed' : 'pointer',
                                        background: !input.trim()
                                            ? 'rgba(239,68,68,0.15)'
                                            : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                                        color: !input.trim() ? 'rgba(239,68,68,0.4)' : '#FFFFFF',
                                        boxShadow: input.trim() ? '0 8px 16px rgba(185, 28, 28, 0.25)' : 'none',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {verifying ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                width: '16px', height: '16px', border: '2px solid currentColor',
                                                borderTopColor: 'transparent', borderRadius: '50%',
                                                animation: 'spin 0.6s linear infinite', display: 'inline-block',
                                            }} />
                                            {t('gate.verifying')}
                                        </span>
                                    ) : (
                                        t('gate.submit')
                                    )}
                                </button>
                            </form>

                            {/* Tags */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                                {[t('gate.tag1'), t('gate.tag2'), t('gate.tag3')].map((tag) => (
                                    <span
                                        key={tag}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: '9999px',
                                            fontSize: '10px',
                                            fontWeight: 500,
                                            letterSpacing: '0.5px',
                                            textTransform: 'uppercase',
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#F87171',
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <p style={{ textAlign: 'center', fontSize: '11px', marginTop: '20px', color: 'rgba(255,255,255,0.4)' }}>
                            {t('gate.copyright')}
                        </p>
                    </div>
                </div>
            )}

            {/* ═══ Keyframe animations ═══ */}
            <style jsx>{`
                @keyframes gate-float1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(20px, -15px) scale(1.05); }
                }
                @keyframes gate-float2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-15px, 20px) scale(1.03); }
                }
                @keyframes gate-pulse {
                    0%, 100% { opacity: 0.6; box-shadow: 0 8px 32px rgba(185, 28, 28, 0.4); }
                    50% { opacity: 1; box-shadow: 0 12px 48px rgba(185, 28, 28, 0.6); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
