'use client';

import { useI18n } from '@/lib/i18n';

export default function About() {
    const { t } = useI18n();

    const features = [
        { emoji: '🤖', titleKey: 'about.f1_title', descKey: 'about.f1_desc' },
        { emoji: '🔀', titleKey: 'about.f2_title', descKey: 'about.f2_desc' },
        { emoji: '📋', titleKey: 'about.f3_title', descKey: 'about.f3_desc' },
        { emoji: '🌐', titleKey: 'about.f4_title', descKey: 'about.f4_desc' },
        { emoji: '🛡️', titleKey: 'about.f5_title', descKey: 'about.f5_desc' },
        { emoji: '🔒', titleKey: 'about.f6_title', descKey: 'about.f6_desc' },
    ];

    return (
        <section id="about" className="py-24 sm:py-32 relative">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent mb-4">
                        {t('about.tag')}
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        {t('about.h2_1')} <span className="gradient-text">{t('about.h2_2')}</span>
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto text-lg">{t('about.sub')}</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <div key={f.titleKey} className="reveal glass-strong rounded-2xl p-8 hover:glow-teal transition-all duration-500 group">
                            <div className="text-4xl mb-5 group-hover:scale-110 transition-transform">{f.emoji}</div>
                            <h3 className="text-xl font-bold mb-3 text-text-primary">{t(f.titleKey)}</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">{t(f.descKey)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
