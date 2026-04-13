'use client';

import { useI18n } from '@/lib/i18n';
import { Smartphone, Stethoscope, Settings, ExternalLink, Globe } from 'lucide-react';

export default function AppShowcase() {
    const { t } = useI18n();

    const apps = [
        {
            key: 'patient',
            icon: Smartphone,
            title: 'showcase.patient_title',
            desc: 'showcase.patient_desc',
            preview: '/mockups/patient-preview.png',
            link: '/mockups/patient-mockup.html',
            color: 'text-accent',
            bg: 'bg-accent-faded',
            borderColor: 'border-accent/20',
            device: 'iPhone',
        },
        {
            key: 'wa-intake',
            icon: Globe,
            title: 'showcase.wa_intake_title',
            desc: 'showcase.wa_intake_desc',
            preview: '/mockups/patient-preview.png',
            link: '#channels',
            color: 'text-[#25D366]',
            bg: 'bg-[#25D366]/10',
            borderColor: 'border-[#25D366]/20',
            device: 'Web / WhatsApp',
        },
        {
            key: 'doctor',
            icon: Stethoscope,
            title: 'showcase.doctor_title',
            desc: 'showcase.doctor_desc',
            preview: '/mockups/doctor-preview.png',
            link: '/mockups/doctor-mockup.html',
            color: 'text-blue',
            bg: 'bg-blue-faded',
            borderColor: 'border-blue/20',
            device: 'iPhone',
        },
        {
            key: 'admin',
            icon: Settings,
            title: 'showcase.admin_title',
            desc: 'showcase.admin_desc',
            preview: '/mockups/admin-preview.png',
            link: '/mockups/admin-mockup.html',
            color: 'text-accent',
            bg: 'bg-accent-faded',
            borderColor: 'border-accent/20',
            device: 'iPad',
        },
    ];

    return (
        <section id="app-showcase" className="py-24 sm:py-32 section-alt relative overflow-hidden">
            {/* Background accents */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent/[0.03] rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue/[0.03] rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-20 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent border border-accent/10 mb-4">
                        {t('showcase.tag')}
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-navy mb-4">
                        {t('showcase.h2_1')} <span className="gradient-text">{t('showcase.h2_2')}</span>
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto text-lg leading-relaxed">
                        {t('showcase.sub')}
                    </p>
                </div>

                {/* App Cards */}
                <div className="grid sm:grid-cols-2 gap-8 items-start">
                    {apps.map((app, index) => {
                        const Icon = app.icon;
                        return (
                            <div
                                key={app.key}
                                className="reveal group"
                                style={{ animationDelay: `${index * 0.15}s` }}
                            >
                                {/* Preview Card */}
                                <a
                                    href={app.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                >
                                    {/* Device Frame */}
                                    <div className={`relative rounded-3xl overflow-hidden border-2 ${app.borderColor} bg-bg-elevated shadow-lg group-hover:shadow-xl transition-all duration-500 group-hover:-translate-y-2`}>
                                        {/* Device bar */}
                                        <div className="flex items-center justify-between px-4 py-2.5 bg-bg-tertiary border-b border-border">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg ${app.bg} flex items-center justify-center`}>
                                                    <Icon size={16} className={app.color} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-navy">{t(app.title)}</p>
                                                    <p className="text-[10px] text-text-muted">{app.device}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <span className="text-[10px] text-accent font-semibold">{t('showcase.try_it')}</span>
                                                <ExternalLink size={12} className="text-accent" />
                                            </div>
                                        </div>

                                        {/* Screenshot */}
                                        <div className="relative overflow-hidden">
                                            <img
                                                src={app.preview}
                                                alt={t(app.title)}
                                                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                                                loading="lazy"
                                            />
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center pb-6">
                                                <span className="px-5 py-2.5 rounded-full bg-white/95 text-navy text-sm font-bold shadow-lg flex items-center gap-2">
                                                    <ExternalLink size={14} />
                                                    {t('showcase.explore')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </a>

                                {/* Description */}
                                <div className="mt-5 text-center px-2">
                                    <h3 className="text-lg font-bold text-navy mb-2">{t(app.title)}</h3>
                                    <p className="text-text-muted text-sm leading-relaxed">{t(app.desc)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom note */}
                <div className="reveal mt-14 text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-accent-faded border border-accent/10">
                        <span className="text-lg">📱</span>
                        <p className="text-sm text-accent font-medium">{t('showcase.note')}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
