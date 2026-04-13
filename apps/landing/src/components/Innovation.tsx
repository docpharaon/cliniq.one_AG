'use client';

import { useI18n } from '@/lib/i18n';
import { MessageSquare, ArrowRightLeft, ClipboardList, UserCheck, Zap, Shield, Camera, HeartHandshake, Radio, Mic } from 'lucide-react';

export default function Innovation() {
    const { t } = useI18n();

    return (
        <section className="py-24 sm:py-32 relative overflow-hidden">
            {/* Subtle background accent */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/[0.02] rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-20 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent border border-accent/10 mb-4">
                        {t('innov.tag')}
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-navy mb-4">
                        {t('innov.h2_1')} <span className="gradient-text">{t('innov.h2_2')}</span>
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto text-lg leading-relaxed">
                        {t('innov.sub')}
                    </p>
                </div>

                {/* The Problem → Solution Flow */}
                <div className="reveal mb-16">
                    <div className="grid md:grid-cols-2 gap-8 items-stretch">
                        {/* Traditional Way */}
                        <div className="card-shadow rounded-3xl p-8 sm:p-10 border-l-4 border-l-error/30 relative overflow-hidden">
                            <div className="absolute top-4 right-4 text-7xl font-black text-error/[0.04] select-none">✗</div>
                            <h3 className="text-xl font-bold text-navy mb-2">{t('innov.old_title')}</h3>
                            <p className="text-text-muted text-sm mb-6">{t('innov.old_sub')}</p>
                            <div className="space-y-4">
                                {['innov.old_1', 'innov.old_2', 'innov.old_3', 'innov.old_4'].map((key) => (
                                    <div key={key} className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-error/10 flex items-center justify-center shrink-0 mt-0.5 text-error text-[10px] font-bold">✗</span>
                                        <p className="text-text-secondary text-sm">{t(key)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* cliniq.one Way */}
                        <div className="card-shadow rounded-3xl p-8 sm:p-10 border-l-4 border-l-accent relative overflow-hidden">
                            <div className="absolute top-4 right-4 text-7xl font-black text-accent/[0.04] select-none">✓</div>
                            <h3 className="text-xl font-bold text-navy mb-2">{t('innov.new_title')}</h3>
                            <p className="text-accent text-sm font-medium mb-6">{t('innov.new_sub')}</p>
                            <div className="space-y-4">
                                {['innov.new_1', 'innov.new_2', 'innov.new_3', 'innov.new_4'].map((key) => (
                                    <div key={key} className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-accent-faded flex items-center justify-center shrink-0 mt-0.5 text-accent text-[10px] font-bold">✓</span>
                                        <p className="text-text-secondary text-sm">{t(key)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Core Innovation Pillars */}
                <div className="reveal">
                    <h3 className="text-center text-2xl font-bold text-navy mb-3">{t('innov.pillars_title')}</h3>
                    <p className="text-center text-text-muted mb-10 max-w-xl mx-auto">{t('innov.pillars_sub')}</p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
                        {[
                            { icon: MessageSquare, key: 'innov.p1', desc: 'innov.p1_desc', color: 'text-accent', bg: 'bg-accent-faded' },
                            { icon: ArrowRightLeft, key: 'innov.p2', desc: 'innov.p2_desc', color: 'text-blue', bg: 'bg-blue-faded' },
                            { icon: ClipboardList, key: 'innov.p3', desc: 'innov.p3_desc', color: 'text-accent', bg: 'bg-accent-faded' },
                            { icon: Shield, key: 'innov.p4', desc: 'innov.p4_desc', color: 'text-accent', bg: 'bg-accent-faded' },
                            { icon: Zap, key: 'innov.p5', desc: 'innov.p5_desc', color: 'text-blue', bg: 'bg-blue-faded' },
                            { icon: UserCheck, key: 'innov.p6', desc: 'innov.p6_desc', color: 'text-accent', bg: 'bg-accent-faded' },
                            { icon: Camera, key: 'innov.p7', desc: 'innov.p7_desc', color: 'text-blue', bg: 'bg-blue-faded' },
                            { icon: HeartHandshake, key: 'innov.p8', desc: 'innov.p8_desc', color: 'text-accent', bg: 'bg-accent-faded' },
                            { icon: Radio, key: 'innov.p9', desc: 'innov.p9_desc', color: 'text-[#25D366]', bg: 'bg-[#25D366]/10' },
                            { icon: Mic, key: 'innov.p10', desc: 'innov.p10_desc', color: 'text-blue', bg: 'bg-blue-faded' },
                        ].map((pillar) => {
                            const Icon = pillar.icon;
                            return (
                                <div key={pillar.key} className="card-shadow-hover rounded-2xl p-6 group">
                                    <div className={`w-11 h-11 rounded-xl ${pillar.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <Icon size={22} className={pillar.color} />
                                    </div>
                                    <h4 className="text-base font-bold text-navy mb-2">{t(pillar.key)}</h4>
                                    <p className="text-text-muted text-sm leading-relaxed">{t(pillar.desc)}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Patent Notice */}
                <div className="reveal mt-12 text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-accent-faded border border-accent/10">
                        <span className="text-lg">🔬</span>
                        <p className="text-sm text-accent font-medium">{t('innov.patent')}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
