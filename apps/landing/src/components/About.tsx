'use client';

import { useI18n } from '@/lib/i18n';
import { Stethoscope, ArrowRightLeft, ClipboardList, Globe, ShieldCheck, Lock } from 'lucide-react';

export default function About() {
    const { t } = useI18n();

    const features = [
        { icon: Stethoscope, titleKey: 'about.f1_title', descKey: 'about.f1_desc', color: 'text-accent' },
        { icon: ArrowRightLeft, titleKey: 'about.f2_title', descKey: 'about.f2_desc', color: 'text-accent' },
        { icon: ClipboardList, titleKey: 'about.f3_title', descKey: 'about.f3_desc', color: 'text-accent' },
        { icon: Globe, titleKey: 'about.f4_title', descKey: 'about.f4_desc', color: 'text-blue' },
        { icon: ShieldCheck, titleKey: 'about.f5_title', descKey: 'about.f5_desc', color: 'text-accent' },
        { icon: Lock, titleKey: 'about.f6_title', descKey: 'about.f6_desc', color: 'text-accent' },
    ];

    return (
        <section id="about" className="py-24 sm:py-32">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent border border-accent/10 mb-4">
                        {t('about.tag')}
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-navy mb-4">
                        {t('about.h2_1')} <span className="gradient-text">{t('about.h2_2')}</span>
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto text-lg">{t('about.sub')}</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f) => {
                        const Icon = f.icon;
                        return (
                            <div key={f.titleKey} className="reveal card-shadow-hover rounded-2xl p-8 group">
                                <div className="w-12 h-12 rounded-xl bg-accent-faded flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                    <Icon size={24} className={f.color} />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-navy">{t(f.titleKey)}</h3>
                                <p className="text-text-secondary text-sm leading-relaxed">{t(f.descKey)}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
