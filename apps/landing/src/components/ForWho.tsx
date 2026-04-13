'use client';

import { useI18n } from '@/lib/i18n';
import { Target, MessageSquare, Globe, Pill, Lock, Smartphone, ClipboardList, Zap, Stethoscope, BarChart3, Coins, Building2, MessageCircle, Mic, Link2, CalendarCheck } from 'lucide-react';

export default function ForWho() {
    const { t } = useI18n();

    const patientKeys = ['who.p1', 'who.p2', 'who.p3', 'who.p7', 'who.p8', 'who.p9', 'who.p4', 'who.p5', 'who.p6', 'who.p10'];
    const patientIcons = [Target, MessageSquare, Globe, MessageCircle, Mic, Link2, Pill, Lock, Smartphone, CalendarCheck];
    const doctorKeys = ['who.d1', 'who.d2', 'who.d3', 'who.d7', 'who.d8', 'who.d9', 'who.d4', 'who.d5', 'who.d6'];
    const doctorIcons = [ClipboardList, Zap, Stethoscope, Link2, MessageCircle, CalendarCheck, BarChart3, Coins, Building2];

    return (
        <section className="py-24 sm:py-32 section-alt">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16 reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent border border-accent/10 mb-4">{t('who.tag')}</span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-navy">
                        {t('who.h2_1')} <span className="gradient-text">{t('who.h2_2')}</span>
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Patients */}
                    <div className="reveal-left card-shadow rounded-3xl p-8 sm:p-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-accent-faded flex items-center justify-center">
                                <Target size={24} className="text-accent" />
                            </div>
                            <h3 className="text-2xl font-bold text-navy">{t('who.patients')}</h3>
                        </div>
                        <div className="space-y-4">
                            {patientKeys.map((key, i) => {
                                const Icon = patientIcons[i];
                                return (
                                    <div key={key} className="flex items-start gap-3 group">
                                        <Icon size={18} className="text-accent shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                        <p className="text-text-secondary">{t(key)}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-8 p-4 rounded-xl bg-accent-faded border border-accent/10">
                            <p className="text-sm text-accent font-medium">{t('who.p_footer1')}</p>
                            <p className="text-xs text-text-muted mt-1">{t('who.p_footer2')}</p>
                        </div>
                    </div>

                    {/* Doctors */}
                    <div className="reveal-right card-shadow rounded-3xl p-8 sm:p-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-faded flex items-center justify-center">
                                <Stethoscope size={24} className="text-blue" />
                            </div>
                            <h3 className="text-2xl font-bold text-navy">{t('who.doctors')}</h3>
                        </div>
                        <div className="space-y-4">
                            {doctorKeys.map((key, i) => {
                                const Icon = doctorIcons[i];
                                return (
                                    <div key={key} className="flex items-start gap-3 group">
                                        <Icon size={18} className="text-blue shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                        <p className="text-text-secondary">{t(key)}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-8 p-4 rounded-xl bg-blue-faded border border-blue/10">
                            <p className="text-sm text-blue font-medium">{t('who.d_footer1')}</p>
                            <p className="text-xs text-text-muted mt-1">{t('who.d_footer2')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
