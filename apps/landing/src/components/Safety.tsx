'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Search, FileText, Target, Pill, AlertTriangle, Heart, Scale, Ban, RefreshCw, Siren, Baby, HeartPulse, FlaskConical, Activity, ClipboardList, TrendingUp, CalendarCheck, CheckCircle, BookOpen, ShieldCheck, Lock } from 'lucide-react';

export default function Safety() {
    const { t } = useI18n();
    const [expanded, setExpanded] = useState(false);

    const icons = [Search, FileText, Target, Pill, AlertTriangle, Heart, Scale, Ban, RefreshCw, Siren, Baby, HeartPulse, FlaskConical, Activity, ClipboardList, TrendingUp, CalendarCheck, CheckCircle, BookOpen];
    const layers = Array.from({ length: 19 }, (_, i) => ({
        id: i + 1,
        Icon: icons[i],
        nameKey: `safety.l${i + 1}_name`,
        descKey: `safety.l${i + 1}_desc`,
    }));

    const displayed = expanded ? layers : layers.slice(0, 6);
    const zeroItems = ['safety.z1', 'safety.z2', 'safety.z3', 'safety.z4', 'safety.z5', 'safety.z6'];

    return (
        <section id="safety" className="py-24 sm:py-32">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-success-faded text-success border border-success/10 mb-4">{t('safety.tag')}</span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-navy mb-4">
                        <span className="gradient-text">{t('safety.h2_1')}</span> {t('safety.h2_2')}
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto">{t('safety.sub')}</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayed.map((layer) => {
                        const Icon = layer.Icon;
                        return (
                            <div key={layer.id} className="reveal card-shadow-hover rounded-xl p-5 group">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-accent-faded flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Icon size={18} className="text-accent" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-accent font-semibold">#{layer.id}</span>
                                            <h4 className="text-sm font-bold text-navy">{t(layer.nameKey)}</h4>
                                        </div>
                                        <p className="text-text-muted text-xs leading-relaxed">{t(layer.descKey)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!expanded && (
                    <div className="text-center mt-8">
                        <button onClick={() => setExpanded(true)} className="px-6 py-3 border border-accent/20 hover:border-accent text-accent rounded-full text-sm font-medium transition-all hover:bg-accent-faded">
                            {t('safety.showAll')}
                        </button>
                    </div>
                )}

                <div className="reveal mt-16 card-shadow rounded-3xl p-8 sm:p-10 border-l-4 border-l-accent">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="w-14 h-14 rounded-2xl bg-accent-faded flex items-center justify-center shrink-0">
                            <Lock size={28} className="text-accent" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-navy mb-3">{t('safety.zero_title')}</h3>
                            <p className="text-text-secondary leading-relaxed mb-4">{t('safety.zero_desc')}</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {zeroItems.map((key) => (
                                    <div key={key} className="flex items-center gap-2 text-sm text-text-secondary">
                                        <ShieldCheck size={16} className="text-accent shrink-0" />
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
