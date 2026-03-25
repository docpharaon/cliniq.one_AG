'use client';

import { useI18n } from '@/lib/i18n';

export default function Story() {
    const { t } = useI18n();

    return (
        <section id="story" className="py-24 sm:py-32 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" />
            <div className="max-w-6xl mx-auto px-6 relative z-10">
                <div className="text-center mb-20 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent mb-4">{t('story.tag')}</span>
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        {t('story.h2_1')} <span className="gradient-text">{t('story.h2_2')}</span>
                    </h2>
                </div>

                {/* Dr. Momen */}
                <div className="reveal glass-strong rounded-3xl p-8 sm:p-12 mb-10">
                    <div className="flex flex-col sm:flex-row gap-8 items-start">
                        <div className="shrink-0">
                            <img src="/dr-momen.jpg" alt="Dr. Momen Pharaon" className="w-28 h-28 rounded-2xl object-cover shadow-lg border-2 border-accent/20" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-1">Dr. Momen Pharaon</h3>
                            <p className="text-accent text-sm mb-4">{t('story.m_title')}</p>
                            <div className="space-y-4 text-text-secondary leading-relaxed">
                                <p>{t('story.m_bio1')}</p>
                                <p>{t('story.m_bio2')}</p>
                                <p>{t('story.m_bio3')}</p>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-3">
                                {['story.m_tag1', 'story.m_tag2', 'story.m_tag3', 'story.m_tag4'].map((k) => (
                                    <span key={k} className="px-3 py-1 rounded-full text-xs bg-accent-faded text-accent">{t(k)}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dr. Mohammad */}
                <div className="reveal glass-strong rounded-3xl p-8 sm:p-12 mb-10">
                    <div className="flex flex-col sm:flex-row gap-8 items-start">
                        <div className="shrink-0">
                            <img src="/dr-mohammad.jpg" alt="Dr. Mohammad Pharaon" className="w-28 h-28 rounded-2xl object-cover shadow-lg border-2 border-blue/20" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-1">Dr. Mohammad Pharaon</h3>
                            <p className="text-blue text-sm mb-4">{t('story.mo_title')}</p>
                            <div className="space-y-4 text-text-secondary leading-relaxed">
                                <p>{t('story.mo_bio1')}</p>
                                <p>{t('story.mo_bio2')}</p>
                                <p>{t('story.mo_bio3')}</p>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-3">
                                {['story.mo_tag1', 'story.mo_tag2', 'story.mo_tag3', 'story.mo_tag4'].map((k) => (
                                    <span key={k} className="px-3 py-1 rounded-full text-xs bg-blue-faded text-blue">{t(k)}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* IP */}
                <div className="reveal glass rounded-2xl p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                        <span className="text-3xl">🛡️</span>
                        <div>
                            <h4 className="text-lg font-bold mb-2">{t('story.ip_title')}</h4>
                            <p className="text-text-secondary text-sm leading-relaxed">{t('story.ip_desc')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
