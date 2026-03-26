'use client';

import { useI18n } from '@/lib/i18n';
import { MessageSquare, ClipboardCheck, ArrowRightLeft, UserCheck } from 'lucide-react';

export default function HowItWorks() {
    const { t } = useI18n();

    const steps = [
        {
            num: '01',
            icon: MessageSquare,
            title: 'how.s1_title',
            desc: 'how.s1_desc',
            detail: 'how.s1_detail',
            illustration: (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-tertiary border border-border text-sm">
                    <span className="text-accent">●</span>
                    <span className="text-text-muted italic text-xs">
                        &quot;I have a rash on my arm and headache since yesterday...&quot;
                    </span>
                </div>
            ),
        },
        {
            num: '02',
            icon: ClipboardCheck,
            title: 'how.s2_title',
            desc: 'how.s2_desc',
            detail: 'how.s2_detail',
            illustration: (
                <div className="space-y-2">
                    {['History of Present Illness', 'Review of Systems', 'Medications & Allergies'].map((label, i) => (
                        <div key={label} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${i < 2 ? 'border-accent text-accent bg-accent-faded' : 'border-text-muted text-text-muted'}`}>
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
            icon: ArrowRightLeft,
            title: 'how.s3_title',
            desc: 'how.s3_desc',
            detail: 'how.s3_detail',
            illustration: (
                <div className="flex items-center gap-2 flex-wrap">
                    {['Dermatology', 'Family Medicine'].map((spec) => (
                        <span key={spec} className="px-3 py-1.5 rounded-lg bg-accent-faded text-accent text-xs font-medium border border-accent/10">
                            {spec}
                        </span>
                    ))}
                    <span className="text-text-muted text-xs">→ routed</span>
                </div>
            ),
        },
        {
            num: '04',
            icon: UserCheck,
            title: 'how.s4_title',
            desc: 'how.s4_desc',
            detail: 'how.s4_detail',
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
        <section id="how-it-works" className="py-24 sm:py-32 section-alt">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-20 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-blue-faded text-blue border border-blue/10 mb-4">{t('how.tag')}</span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-navy mb-4">
                        {t('how.h2_1')} <span className="gradient-text">cliniq.one</span> {t('how.h2_2')}
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto">{t('how.sub')}</p>
                </div>

                {/* Steps grid */}
                <div className="grid sm:grid-cols-2 gap-6">
                    {steps.map((step) => {
                        const Icon = step.icon;
                        return (
                            <div key={step.num} className="reveal card-shadow-hover rounded-2xl p-7 sm:p-8 relative overflow-hidden">
                                {/* Step number watermark */}
                                <div className="absolute top-4 right-6 text-6xl font-black text-accent/[0.06] select-none">{step.num}</div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-accent-faded flex items-center justify-center">
                                            <Icon size={22} className="text-accent" />
                                        </div>
                                        <div>
                                            <span className="text-accent font-semibold text-sm">{t('how.step')} {step.num}</span>
                                            <h3 className="text-lg font-bold text-navy">{t(step.title)}</h3>
                                        </div>
                                    </div>
                                    <p className="text-text-secondary mb-3 leading-relaxed text-sm">{t(step.desc)}</p>
                                    <p className="text-text-muted text-xs italic mb-5">{t(step.detail)}</p>

                                    <div className="pt-4 border-t border-border">
                                        {step.illustration}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
