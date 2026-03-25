'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

export default function Safety() {
    const { t } = useI18n();
    const [expanded, setExpanded] = useState(false);

    const icons = ['🔬', '📝', '🎯', '💊', '⚠️', '🤧', '⚖️', '🚫', '🔄', '🚨', '👶', '🤰', '🧪', '💓', '📊', '📈', '📅', '✅', '📋'];
    const layers = Array.from({ length: 19 }, (_, i) => ({
        id: i + 1,
        icon: icons[i],
        nameKey: `safety.l${i + 1}_name`,
        descKey: `safety.l${i + 1}_desc`,
    }));

    const displayed = expanded ? layers : layers.slice(0, 6);
    const zeroItems = ['safety.z1', 'safety.z2', 'safety.z3', 'safety.z4', 'safety.z5', 'safety.z6'];

    return (
        <section id="safety" className="py-24 sm:py-32">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-success-faded text-success mb-4">{t('safety.tag')}</span>
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        <span className="gradient-text">{t('safety.h2_1')}</span> {t('safety.h2_2')}
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto">{t('safety.sub')}</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayed.map((layer) => (
                        <div key={layer.id} className="reveal glass rounded-xl p-5 hover:glass-strong hover:glow-teal transition-all duration-300 group">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">{layer.icon}</span>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-accent font-mono">#{layer.id}</span>
                                        <h4 className="text-sm font-bold">{t(layer.nameKey)}</h4>
                                    </div>
                                    <p className="text-text-muted text-xs leading-relaxed">{t(layer.descKey)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {!expanded && (
                    <div className="text-center mt-8">
                        <button onClick={() => setExpanded(true)} className="px-6 py-3 border border-accent/30 hover:border-accent text-accent rounded-full text-sm font-medium transition-all hover:bg-accent/5">
                            {t('safety.showAll')}
                        </button>
                    </div>
                )}

                <div className="reveal mt-16 glass-strong rounded-3xl p-8 sm:p-10 glow-teal">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="text-5xl">🔒</div>
                        <div>
                            <h3 className="text-2xl font-bold mb-3">{t('safety.zero_title')}</h3>
                            <p className="text-text-secondary leading-relaxed mb-4">{t('safety.zero_desc')}</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {zeroItems.map((key) => (
                                    <div key={key} className="flex items-center gap-2 text-sm text-text-secondary">
                                        <span className="text-accent">✓</span>
                                        {t(key)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
