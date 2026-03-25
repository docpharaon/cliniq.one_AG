'use client';

import { useI18n } from '@/lib/i18n';

export default function HowItWorks() {
    const { t } = useI18n();

    const steps = [
        { num: '01', emoji: '💬', title: 'how.s1_title', desc: 'how.s1_desc', detail: 'how.s1_detail' },
        { num: '02', emoji: '🤖', title: 'how.s2_title', desc: 'how.s2_desc', detail: 'how.s2_detail' },
        { num: '03', emoji: '🔀', title: 'how.s3_title', desc: 'how.s3_desc', detail: 'how.s3_detail' },
        { num: '04', emoji: '👨‍⚕️', title: 'how.s4_title', desc: 'how.s4_desc', detail: 'how.s4_detail' },
    ];

    return (
        <section id="how-it-works" className="py-24 sm:py-32 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" />
            <div className="max-w-6xl mx-auto px-6 relative z-10">
                <div className="text-center mb-20 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-blue-faded text-blue mb-4">{t('how.tag')}</span>
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        {t('how.h2_1')} <span className="gradient-text">cliniq.one</span> {t('how.h2_2')}
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto">{t('how.sub')}</p>
                </div>

                <div className="relative">
                    <div className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-accent/30 via-blue/30 to-purple/30 hidden sm:block" />
                    <div className="space-y-12 sm:space-y-20">
                        {steps.map((step, i) => (
                            <div key={step.num} className={`reveal flex flex-col sm:flex-row items-start gap-8 ${i % 2 === 1 ? 'sm:flex-row-reverse' : ''}`}>
                                <div className="flex-1 sm:w-1/2">
                                    <div className="glass-strong rounded-2xl p-8 hover:glow-teal transition-all duration-500">
                                        <div className="flex items-center gap-4 mb-4">
                                            <span className="text-3xl">{step.emoji}</span>
                                            <div>
                                                <span className="text-accent font-mono text-sm">{t('how.step')} {step.num}</span>
                                                <h3 className="text-xl font-bold">{t(step.title)}</h3>
                                            </div>
                                        </div>
                                        <p className="text-text-secondary mb-3 leading-relaxed">{t(step.desc)}</p>
                                        <p className="text-text-muted text-sm italic">{t(step.detail)}</p>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full glass-strong glow-teal shrink-0 relative z-10">
                                    <span className="text-accent font-bold">{step.num}</span>
                                </div>
                                <div className="hidden sm:block flex-1 sm:w-1/2" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
