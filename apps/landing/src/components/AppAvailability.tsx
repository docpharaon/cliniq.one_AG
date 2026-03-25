'use client';

import { useI18n } from '@/lib/i18n';

export default function AppAvailability() {
    const { t } = useI18n();

    return (
        <section id="app-availability" className="py-16 sm:py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.03] to-transparent pointer-events-none" />
            <div className="max-w-5xl mx-auto px-6 relative z-10">
                <div className="reveal glass-strong rounded-3xl p-8 sm:p-12 border border-accent/20 relative overflow-hidden">
                    {/* Decorative gradient blob */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent mb-4">
                                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                {t('avail.tag')}
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                                {t('avail.h2_1')} <span className="gradient-text">{t('avail.h2_2')}</span>
                            </h2>
                            <p className="text-text-secondary max-w-xl mx-auto">{t('avail.sub')}</p>
                        </div>

                        {/* Platform cards */}
                        <div className="grid sm:grid-cols-2 gap-6 mb-10">
                            {/* Android — Available Now */}
                            <div className="glass rounded-2xl p-6 sm:p-8 border border-emerald-500/20 relative group hover:border-emerald-500/40 transition-all duration-500">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                                            <path d="M17.523 2.473a.75.75 0 0 0-1.06 1.06l1.076 1.077A7.927 7.927 0 0 0 12 2.75a7.927 7.927 0 0 0-5.539 1.86L5.384 3.533a.75.75 0 0 0-1.06 1.06l1.076 1.077A7.927 7.927 0 0 0 4.05 10H3.25a.75.75 0 0 0 0 1.5h.75v4.75A3.75 3.75 0 0 0 7.75 20h8.5a3.75 3.75 0 0 0 3.75-3.75V11.5h.75a.75.75 0 0 0 0-1.5h-.8a7.927 7.927 0 0 0-1.35-4.33l1.076-1.077a.75.75 0 0 0-1.06-1.06l-1.543 1.543Zm-8.273 6.277a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0ZM15.5 8.75a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0Z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary">{t('avail.android_title')}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                {t('avail.android_status')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-text-secondary text-sm leading-relaxed mb-5">{t('avail.android_desc')}</p>
                                <a
                                    href="#tester-signup"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-xl text-sm font-medium transition-all"
                                >
                                    🧪 {t('avail.android_cta')}
                                </a>
                            </div>

                            {/* iOS — Coming Soon */}
                            <div className="glass rounded-2xl p-6 sm:p-8 border border-slate-500/20 relative group">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary">{t('avail.ios_title')}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold">
                                                ⏳ {t('avail.ios_status')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-text-secondary text-sm leading-relaxed mb-5">{t('avail.ios_desc')}</p>
                                <a
                                    href="#tester-signup"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/20 hover:border-slate-500/40 text-slate-400 rounded-xl text-sm font-medium transition-all"
                                >
                                    🔔 {t('avail.ios_cta')}
                                </a>
                            </div>
                        </div>

                        {/* Bottom CTA */}
                        <div className="text-center">
                            <div className="inline-flex items-center gap-3 glass rounded-2xl px-6 py-4">
                                <span className="text-2xl">📬</span>
                                <div className="text-start">
                                    <p className="text-sm font-semibold text-text-primary">{t('avail.notify_title')}</p>
                                    <p className="text-xs text-text-muted">{t('avail.notify_sub')}</p>
                                </div>
                                <a href="#tester-signup" className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-bg-primary font-bold rounded-xl text-xs transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(45,212,191,0.3)] whitespace-nowrap">
                                    {t('avail.notify_cta')}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
