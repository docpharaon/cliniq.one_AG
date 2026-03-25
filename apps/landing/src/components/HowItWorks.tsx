'use client';

import { useI18n } from '@/lib/i18n';

export default function HowItWorks() {
    const { t } = useI18n();

    const steps = [
        {
            num: '01',
            emoji: '💬',
            title: 'how.s1_title',
            desc: 'how.s1_desc',
            detail: 'how.s1_detail',
            color: 'from-teal-500/20 to-teal-500/5',
            borderColor: 'border-teal-500/30',
            dotColor: 'bg-teal-400',
            illustration: (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-tertiary/50 border border-border text-sm">
                    <span className="text-accent">●</span>
                    <span className="text-text-muted">
                        &quot;I have a rash on my arm and headache since yesterday...&quot;
                    </span>
                </div>
            ),
        },
        {
            num: '02',
            emoji: '🤖',
            title: 'how.s2_title',
            desc: 'how.s2_desc',
            detail: 'how.s2_detail',
            color: 'from-blue-500/20 to-blue-500/5',
            borderColor: 'border-blue-500/30',
            dotColor: 'bg-blue-400',
            illustration: (
                <div className="space-y-2">
                    {['History of Present Illness', 'Review of Systems', 'Medications & Allergies'].map((label, i) => (
                        <div key={label} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${i < 2 ? 'border-accent text-accent bg-accent/10' : 'border-text-muted text-text-muted'}`}>
                                {i < 2 ? '✓' : ' '}
                            </div>
                            <span className={`text-xs ${i < 2 ? 'text-text-secondary' : 'text-text-muted'}`}>{label}</span>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            num: '03',
            emoji: '🔀',
            title: 'how.s3_title',
            desc: 'how.s3_desc',
            detail: 'how.s3_detail',
            color: 'from-purple-500/20 to-purple-500/5',
            borderColor: 'border-purple/30',
            dotColor: 'bg-purple',
            illustration: (
                <div className="flex items-center gap-2 flex-wrap">
                    {['Dermatology', 'Family Medicine'].map((spec) => (
                        <span key={spec} className="px-3 py-1.5 rounded-lg bg-purple-faded text-purple text-xs font-medium border border-purple/20">
                            {spec}
                        </span>
                    ))}
                    <span className="text-text-muted text-xs">→ routed</span>
                </div>
            ),
        },
        {
            num: '04',
            emoji: '👨‍⚕️',
            title: 'how.s4_title',
            desc: 'how.s4_desc',
            detail: 'how.s4_detail',
            color: 'from-emerald-500/20 to-emerald-500/5',
            borderColor: 'border-emerald-500/30',
            dotColor: 'bg-emerald-400',
            illustration: (
                <div className="space-y-1.5">
                    {['📋 Diagnosis', '💊 Treatment Plan', '📝 e-Prescription'].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-xs text-text-secondary">
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            ),
        },
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
                    {/* Vertical timeline line */}
                    <div className="absolute left-6 sm:left-1/2 sm:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-500/40 via-blue-500/40 via-50% to-emerald-500/40 hidden sm:block" />

                    <div className="space-y-8 sm:space-y-16">
                        {steps.map((step, i) => (
                            <div key={step.num} className={`reveal flex flex-col sm:flex-row items-start gap-6 sm:gap-10 ${i % 2 === 1 ? 'sm:flex-row-reverse' : ''}`}>
                                <div className="flex-1 sm:w-1/2">
                                    <div className={`glass-strong rounded-2xl p-7 sm:p-8 hover:glow-teal transition-all duration-500 relative overflow-hidden`}>
                                        {/* Gradient accent bar at top */}
                                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${step.color}`} />

                                        <div className="flex items-center gap-4 mb-4">
                                            <span className="text-3xl">{step.emoji}</span>
                                            <div>
                                                <span className="text-accent font-mono text-sm">{t('how.step')} {step.num}</span>
                                                <h3 className="text-xl font-bold">{t(step.title)}</h3>
                                            </div>
                                        </div>
                                        <p className="text-text-secondary mb-3 leading-relaxed">{t(step.desc)}</p>
                                        <p className="text-text-muted text-sm italic mb-5">{t(step.detail)}</p>

                                        {/* Visual illustration */}
                                        <div className={`mt-4 pt-4 border-t border-border/50`}>
                                            {step.illustration}
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline dot */}
                                <div className="hidden sm:flex flex-col items-center shrink-0 relative z-10">
                                    <div className={`w-12 h-12 rounded-full glass-strong flex items-center justify-center shadow-lg border ${step.borderColor}`}>
                                        <span className="text-accent font-bold text-sm">{step.num}</span>
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className="w-px h-8 bg-gradient-to-b from-accent/20 to-transparent mt-2 sm:hidden" />
                                    )}
                                </div>

                                {/* Spacer for alternating layout */}
                                <div className="hidden sm:block flex-1 sm:w-1/2" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
