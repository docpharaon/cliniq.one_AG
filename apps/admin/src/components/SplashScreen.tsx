'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const SPLASH_DURATION = 10000; // 10 seconds — matches video duration

interface SplashScreenProps {
    onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
    const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const dismiss = useCallback(() => {
        if (phase === 'exit') return;
        if (timerRef.current) clearTimeout(timerRef.current);
        setPhase('exit');
        setTimeout(onComplete, 500); // match fade-out duration
    }, [phase, onComplete]);

    useEffect(() => {
        // Entrance animation
        const enterTimer = setTimeout(() => setPhase('visible'), 100);

        // Auto-dismiss
        timerRef.current = setTimeout(dismiss, SPLASH_DURATION);

        return () => {
            clearTimeout(enterTimer);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <div
            className="splash-overlay"
            onClick={dismiss}
            style={{
                opacity: phase === 'exit' ? 0 : 1,
                transition: 'opacity 0.5s ease',
            }}
        >
            {/* Background Video */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="splash-video"
            >
                <source src="/splash-bg.mp4" type="video/mp4" />
            </video>

            {/* Dark overlay */}
            <div className="splash-dark-overlay" />

            {/* Logo */}
            <div
                className="splash-logo-container"
                style={{
                    opacity: phase !== 'enter' ? 1 : 0,
                    transform: phase !== 'enter' ? 'scale(1)' : 'scale(0.8)',
                    transition: 'opacity 0.8s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
            >
                <img
                    src="/cliniq-logo.png"
                    alt="cliniq.one"
                    className="splash-logo"
                />
            </div>

            {/* ADMIN PORTAL badge */}
            <div
                className="splash-badge"
                style={{
                    opacity: phase === 'visible' ? 1 : 0,
                    transform: phase === 'visible' ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'opacity 0.6s ease 0.8s, transform 0.6s ease 0.8s',
                }}
            >
                <span className="splash-badge-dot" />
                <span className="splash-badge-text">ADMIN PORTAL</span>
                <span className="splash-badge-dot" />
            </div>

            {/* Crafted by */}
            <div
                className="splash-crafted"
                style={{
                    opacity: phase !== 'enter' ? 1 : 0,
                    transition: 'opacity 0.8s ease 0.4s',
                }}
            >
                <div className="splash-crafted-line" />
                <span className="splash-crafted-label">Crafted by</span>
                <span className="splash-crafted-name">momen pharaon</span>
            </div>

            {/* Skip hint */}
            <div
                className="splash-skip"
                style={{
                    opacity: phase !== 'enter' ? 0.5 : 0,
                    transition: 'opacity 0.8s ease 1s',
                }}
            >
                Click to skip
            </div>

            <style jsx>{`
                .splash-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: var(--color-bg-primary);
                    cursor: pointer;
                }

                .splash-video {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .splash-dark-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(10, 14, 26, 0.45);
                }

                .splash-logo-container {
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .splash-logo {
                    width: 200px;
                    height: 200px;
                    object-fit: contain;
                }

                .splash-badge {
                    z-index: 2;
                    margin-top: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 20px;
                    border-radius: 20px;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    background: rgba(239, 68, 68, 0.08);
                }

                .splash-badge-dot {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: #EF4444;
                    opacity: 0.6;
                }

                .splash-badge-text {
                    font-size: 13px;
                    font-weight: 600;
                    color: rgba(239, 68, 68, 0.85);
                    letter-spacing: 4px;
                }

                .splash-crafted {
                    position: absolute;
                    bottom: 100px;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .splash-crafted-line {
                    width: 30px;
                    height: 1px;
                    background: rgba(239, 68, 68, 0.25);
                    margin-bottom: 10px;
                }

                .splash-crafted-label {
                    font-size: 10px;
                    color: rgba(255, 255, 255, 0.3);
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    font-weight: 300;
                    margin-bottom: 2px;
                }

                .splash-crafted-name {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.45);
                    letter-spacing: 3px;
                    text-transform: uppercase;
                    font-weight: 500;
                }

                .splash-skip {
                    position: absolute;
                    bottom: 60px;
                    z-index: 2;
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.5);
                    letter-spacing: 1px;
                }
            `}</style>
        </div>
    );
}
