'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

function Particle() {
    const style = {
        left: `${Math.random() * 100}%`,
        animationDuration: `${8 + Math.random() * 12}s`,
        animationDelay: `${Math.random() * 8}s`,
        width: `${2 + Math.random() * 3}px`,
        height: `${2 + Math.random() * 3}px`,
    };
    return <div className="particle" style={style} />;
}

export default function Hero() {
    const { t } = useI18n();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const stats = [
        { val: 'hero.stat1_val', label: 'hero.stat1_label' },
        { val: 'hero.stat2_val', label: 'hero.stat2_label' },
        { val: 'hero.stat3_val', label: 'hero.stat3_label' },
        { val: 'hero.stat4_val', label: 'hero.stat4_label' },
    ];

    return (
        <section className="relative min-h-screen flex items-center hero-gradient overflow-hidden pt-24 pb-16">
            <div className="absolute inset-0 pointer-events-none">
                {mounted && Array.from({ length: 20 }).map((_, i) => <Particle key={i} />)}
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-accent/5 rounded-full animate-spin-slow" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-accent/[0.03] rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }} />

            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                    <div className="text-center lg:text-start">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                            <span className="text-sm text-text-secondary">{t('hero.badge')}</span>
                        </div>

                        <h1 className={`text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            <span className="text-text-primary">{t('hero.h1_1')}</span><br />
                            <span className="gradient-text">{t('hero.h1_2')}</span><br />
                            <span className="text-text-primary">{t('hero.h1_3')}</span>
                        </h1>

                        <p className={`text-lg text-text-secondary max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            {t('hero.sub')}
                        </p>

                        <div className={`flex flex-col sm:flex-row items-center lg:items-start gap-4 mb-10 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            <a href="#download" className="px-8 py-4 bg-accent hover:bg-accent-dark text-bg-primary font-bold rounded-full text-lg transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(45,212,191,0.3)] flex items-center gap-2">
                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z"/></svg>
                                {t('hero.download')}
                            </a>
                            <a href="#tester-signup" className="px-8 py-4 border border-accent/30 hover:border-accent text-accent font-semibold rounded-full text-lg transition-all hover:bg-accent/5 flex items-center gap-2">
                                {t('hero.tester')}
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </a>
                        </div>

                        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            {stats.map((s) => (
                                <div key={s.val} className="glass rounded-xl p-3 text-center">
                                    <div className="text-xl font-bold gradient-text">{t(s.val)}</div>
                                    <div className="text-[11px] text-text-muted mt-0.5">{t(s.label)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`relative flex items-center justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-blue/10 to-purple/10 rounded-full blur-3xl scale-75" />
                        <div className="relative animate-float">
                            <img src="/hero-mockup.png" alt="cliniq.one AI Medical Consultation" className="w-full max-w-md mx-auto drop-shadow-2xl" />
                            <div className="absolute -top-4 -right-4 sm:top-2 sm:right-0 glass-strong rounded-2xl p-3 animate-pulse-glow">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🤖</span>
                                    <div>
                                        <div className="text-xs font-bold text-accent">{t('hero.gpt_title')}</div>
                                        <div className="text-[10px] text-text-muted">{t('hero.gpt_sub')}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -left-4 sm:bottom-8 sm:left-0 glass-strong rounded-2xl p-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🛡️</span>
                                    <div>
                                        <div className="text-xs font-bold text-text-primary">{t('hero.safety_title')}</div>
                                        <div className="text-[10px] text-text-muted">{t('hero.safety_sub')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-primary to-transparent" />
        </section>
    );
}
