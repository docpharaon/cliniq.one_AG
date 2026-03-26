'use client';

import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { Shield, Globe, FileText, UserCheck } from 'lucide-react';

export default function Hero() {
    const { t } = useI18n();
    const [mounted, setMounted] = useState(false);
    const [showScrollHint, setShowScrollHint] = useState(true);
    useEffect(() => setMounted(true), []);

    // Auto-hide scroll indicator once user scrolls
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 100) {
                setShowScrollHint(false);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollDown = useCallback(() => {
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }, []);

    const stats = [
        { val: 'hero.stat1_val', label: 'hero.stat1_label' },
        { val: 'hero.stat2_val', label: 'hero.stat2_label' },
        { val: 'hero.stat3_val', label: 'hero.stat3_label' },
        { val: 'hero.stat4_val', label: 'hero.stat4_label' },
    ];

    const trustBadges = [
        { icon: UserCheck, label: 'hero.trust_doctors' },
        { icon: Globe, label: 'hero.trust_bilingual' },
        { icon: FileText, label: 'hero.trust_prescription' },
        { icon: Shield, label: 'hero.trust_privacy' },
    ];

    return (
        <section className="relative min-h-screen flex items-center bg-white overflow-hidden pt-24 pb-16">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/[0.03] rounded-full blur-3xl -translate-y-1/4 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-faded rounded-full blur-3xl translate-y-1/4 -translate-x-1/4" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Text Content */}
                    <div className="text-center lg:text-start">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-faded border border-accent/10 mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                            <span className="text-sm text-accent font-medium">{t('hero.badge')}</span>
                        </div>

                        <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            <span className="text-navy">{t('hero.h1_1')}</span><br />
                            <span className="gradient-text">{t('hero.h1_2')}</span><br />
                            <span className="text-navy">{t('hero.h1_3')}</span>
                        </h1>

                        <p className={`text-lg text-text-secondary max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            {t('hero.sub')}
                        </p>

                        <div className={`flex flex-col sm:flex-row items-center lg:items-start gap-4 mb-10 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            <a href="#tester-signup" className="px-8 py-4 bg-accent hover:bg-accent-dark text-white font-bold rounded-full text-lg transition-all hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2">
                                {t('hero.cta_primary')}
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </a>
                            <a href="#how-it-works" className="px-8 py-4 border border-border hover:border-accent/30 text-text-secondary hover:text-accent font-semibold rounded-full text-lg transition-all flex items-center gap-2">
                                {t('hero.cta_secondary')}
                            </a>
                        </div>

                        {/* Trust Badges */}
                        <div className={`flex flex-wrap justify-center lg:justify-start gap-3 mb-8 transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            {trustBadges.map((badge) => {
                                const Icon = badge.icon;
                                return (
                                    <div key={badge.label} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-secondary border border-border text-xs font-medium text-text-secondary">
                                        <Icon size={14} className="text-accent" />
                                        {t(badge.label)}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Healthcare Stats */}
                        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            {stats.map((s) => (
                                <div key={s.val} className="card-shadow rounded-xl p-3 text-center">
                                    <div className="text-xl font-bold text-accent">{t(s.val)}</div>
                                    <div className="text-[11px] text-text-muted mt-0.5">{t(s.label)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Doctor Images */}
                    <div className={`relative flex flex-col items-center justify-center gap-6 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
                        {/* Brand Logo */}
                        <img
                            src="/cliniq-logo-full.png"
                            alt="Cliniq.One — عيادتك الأولية"
                            className="w-64 sm:w-72 h-auto object-contain"
                        />

                        <div className="relative w-full max-w-lg mx-auto">
                            {/* Main doctor image */}
                            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-border/50">
                                <img
                                    src="/doctors-team.jpg"
                                    alt="Licensed doctors at cliniq.one"
                                    className="w-full h-[420px] sm:h-[480px] object-cover object-top"
                                />
                                {/* Overlay badge */}
                                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-border/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-accent-faded flex items-center justify-center">
                                            <UserCheck size={20} className="text-accent" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-navy">{t('hero.overlay_title')}</div>
                                            <div className="text-xs text-text-muted">{t('hero.overlay_sub')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Safety badge */}
                            <div className="absolute -top-3 -right-3 sm:top-4 sm:-right-6 bg-white rounded-2xl p-3 shadow-lg border border-border/50">
                                <div className="flex items-center gap-2">
                                    <Shield size={20} className="text-accent" />
                                    <div>
                                        <div className="text-xs font-bold text-navy">{t('hero.safety_title')}</div>
                                        <div className="text-[10px] text-text-muted">{t('hero.safety_sub')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile scroll-down nudge */}
            {showScrollHint && (
                <button
                    onClick={scrollDown}
                    aria-label="Scroll down for more"
                    className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 lg:hidden transition-all duration-700 delay-700 cursor-pointer ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                >
                    <span className="text-xs font-medium text-text-secondary tracking-wide animate-pulse">
                        {t('hero.scroll_hint')}
                    </span>
                    <svg
                        className="w-6 h-6 text-accent scroll-bounce"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                    >
                        <path d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            )}
        </section>
    );
}
