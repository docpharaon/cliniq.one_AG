'use client';

import { useI18n } from '@/lib/i18n';
import { Smartphone, MessageCircle, Link2, Check } from 'lucide-react';

export default function Channels() {
    const { t } = useI18n();

    const channels = [
        {
            icon: Smartphone,
            title: 'channels.app_title',
            desc: 'channels.app_desc',
            badge: 'channels.app_badge',
            features: ['channels.app_f1', 'channels.app_f2', 'channels.app_f3', 'channels.app_f4'],
            color: 'text-accent',
            bg: 'bg-accent-faded',
            badgeBg: 'bg-accent-faded',
            badgeText: 'text-accent',
            borderColor: 'border-accent/20',
            gradient: 'from-accent/5 to-transparent',
        },
        {
            icon: MessageCircle,
            title: 'channels.wa_title',
            desc: 'channels.wa_desc',
            badge: 'channels.wa_badge',
            features: ['channels.wa_f1', 'channels.wa_f2', 'channels.wa_f3', 'channels.wa_f4'],
            color: 'text-[#25D366]',
            bg: 'bg-[#25D366]/10',
            badgeBg: 'bg-[#25D366]/10',
            badgeText: 'text-[#25D366]',
            borderColor: 'border-[#25D366]/20',
            gradient: 'from-[#25D366]/5 to-transparent',
        },
        {
            icon: Link2,
            title: 'channels.web_title',
            desc: 'channels.web_desc',
            badge: 'channels.web_badge',
            features: ['channels.web_f1', 'channels.web_f2', 'channels.web_f3', 'channels.web_f4'],
            color: 'text-blue',
            bg: 'bg-blue-faded',
            badgeBg: 'bg-blue-faded',
            badgeText: 'text-blue',
            borderColor: 'border-blue/20',
            gradient: 'from-blue/5 to-transparent',
        },
    ];

    return (
        <section id="channels" className="py-24 sm:py-32 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-accent/[0.03] rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-[#25D366]/[0.03] rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent border border-accent/10 mb-4">
                        {t('channels.tag')}
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-navy mb-4">
                        {t('channels.h2_1')} <span className="gradient-text">{t('channels.h2_2')}</span>
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto text-lg leading-relaxed">
                        {t('channels.sub')}
                    </p>
                </div>

                {/* Channel Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    {channels.map((ch) => {
                        const Icon = ch.icon;
                        return (
                            <div
                                key={ch.title}
                                className={`reveal card-shadow-hover rounded-3xl p-8 relative overflow-hidden border ${ch.borderColor} group`}
                            >
                                {/* Gradient top */}
                                <div className={`absolute inset-0 bg-gradient-to-b ${ch.gradient} pointer-events-none`} />

                                <div className="relative z-10">
                                    {/* Icon + Badge */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className={`w-14 h-14 rounded-2xl ${ch.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <Icon size={28} className={ch.color} />
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${ch.badgeBg} ${ch.badgeText} border ${ch.borderColor}`}>
                                            {t(ch.badge)}
                                        </span>
                                    </div>

                                    {/* Title + Desc */}
                                    <h3 className="text-xl font-bold text-navy mb-3">{t(ch.title)}</h3>
                                    <p className="text-text-secondary text-sm leading-relaxed mb-6">{t(ch.desc)}</p>

                                    {/* Features */}
                                    <div className="space-y-2.5">
                                        {ch.features.map((fKey) => (
                                            <div key={fKey} className="flex items-center gap-2.5">
                                                <Check size={14} className={`${ch.color} shrink-0`} />
                                                <span className="text-sm text-text-secondary">{t(fKey)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom note */}
                <div className="reveal mt-12 text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-accent-faded border border-accent/10">
                        <span className="text-lg">🔗</span>
                        <p className="text-sm text-accent font-medium">{t('channels.note')}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
