'use client';

import { useI18n } from '@/lib/i18n';
import { Award, BookOpen, Lightbulb, Heart } from 'lucide-react';

export default function Story() {
    const { t } = useI18n();

    return (
        <section id="doctors" className="py-24 sm:py-32 section-alt">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-16 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent border border-accent/10 mb-4">
                        {t('story.tag')}
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-navy mb-4">
                        {t('story.h2_1')} <span className="gradient-text">{t('story.h2_2')}</span>
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto">{t('story.intro')}</p>
                </div>

                {/* Dr. Momen */}
                <div className="reveal card-shadow-hover rounded-3xl p-8 sm:p-12 mb-8">
                    <div className="flex flex-col sm:flex-row gap-8 items-start">
                        <div className="shrink-0">
                            <img src="/dr-momen.jpg" alt="Dr. Momen Pharaon" className="w-32 h-32 rounded-2xl object-cover shadow-md" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-navy mb-1">Dr. Momen Pharaon</h3>
                            <p className="text-accent text-sm font-medium mb-4">{t('story.m_title')}</p>
                            <div className="space-y-3 text-text-secondary leading-relaxed">
                                <p>{t('story.m_bio1')}</p>
                                <p>{t('story.m_bio2')}</p>
                                <p>{t('story.m_bio3')}</p>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-2">
                                {['story.m_tag1', 'story.m_tag2', 'story.m_tag3', 'story.m_tag4'].map((k) => (
                                    <span key={k} className="px-3 py-1 rounded-full text-xs bg-accent-faded text-accent font-medium border border-accent/10">{t(k)}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dr. Mohammad */}
                <div className="reveal card-shadow-hover rounded-3xl p-8 sm:p-12 mb-8">
                    <div className="flex flex-col sm:flex-row gap-8 items-start">
                        <div className="shrink-0">
                            <img src="/dr-mohammad.jpg" alt="Dr. Mohammad Pharaon" className="w-32 h-32 rounded-2xl object-cover shadow-md" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-navy mb-1">Dr. Mohammad Pharaon</h3>
                            <p className="text-blue text-sm font-medium mb-4">{t('story.mo_title')}</p>
                            <div className="space-y-3 text-text-secondary leading-relaxed">
                                <p>{t('story.mo_bio1')}</p>
                                <p>{t('story.mo_bio2')}</p>
                                <p>{t('story.mo_bio3')}</p>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-2">
                                {['story.mo_tag1', 'story.mo_tag2', 'story.mo_tag3', 'story.mo_tag4'].map((k) => (
                                    <span key={k} className="px-3 py-1 rounded-full text-xs bg-blue-faded text-blue font-medium border border-blue/10">{t(k)}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* IP */}
                <div className="reveal card-shadow rounded-2xl p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-accent-faded flex items-center justify-center shrink-0">
                            <Award size={20} className="text-accent" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-navy mb-2">{t('story.ip_title')}</h4>
                            <p className="text-text-secondary text-sm leading-relaxed">{t('story.ip_desc')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
