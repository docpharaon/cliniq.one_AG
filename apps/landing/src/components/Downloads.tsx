'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Download, Lock } from 'lucide-react';

const SUPABASE_URL = 'https://uabbndansgxpvogteyxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYmJuZGFuc2d4cHZvZ3RleXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzIyODgsImV4cCI6MjA4Njg0ODI4OH0.bFh8Wa4koQrtdrD62N7BzsCCGXqBMhFJLr8RiO-3OEc';

const APK_URLS: Record<string, string> = {
    patient: 'https://drive.google.com/uc?export=download&id=1DNZ_vNh-40OWVOBGe1w_Thxp0wAnjjue',
    doctor: 'https://drive.google.com/uc?export=download&id=1A_SizQZVxfGjBz2r0jON1ktiARF5vlje',
    locum: 'https://drive.google.com/uc?export=download&id=1bRmdZsaAqJ3ND16X07NJrbuN6oyDMSkN',
    admin: 'https://drive.google.com/uc?export=download&id=1oiB3tFjINRtSLy0W9wn6kkQLnllBi5Gz',
};

export default function Downloads() {
    const { t } = useI18n();
    const [unlocked, setUnlocked] = useState(false);
    const [checking, setChecking] = useState(true);
    const [tokenError, setTokenError] = useState(false);

    const apps = [
        {
            key: 'patient',
            nameKey: 'dl.patient_name',
            descKey: 'dl.patient_desc',
            label: 'Cliniq.One',
            bgGradient: 'from-teal-500 to-emerald-600',
            borderColor: 'border-teal-500/30',
            size: '~63 MB',
        },
        {
            key: 'doctor',
            nameKey: 'dl.doctor_name',
            descKey: 'dl.doctor_desc',
            label: 'Doctor',
            bgGradient: 'from-blue-500 to-blue-700',
            borderColor: 'border-blue-500/30',
            size: '~3 MB',
        },
        {
            key: 'locum',
            nameKey: 'dl.locum_name',
            descKey: 'dl.locum_desc',
            label: 'Locum',
            bgGradient: 'from-orange-500 to-amber-600',
            borderColor: 'border-orange-500/30',
            size: '~3 MB',
        },
        {
            key: 'admin',
            nameKey: 'dl.admin_name',
            descKey: 'dl.admin_desc',
            label: 'Admin',
            bgGradient: 'from-slate-600 to-slate-800',
            borderColor: 'border-slate-500/30',
            size: '~3 MB',
        },
    ];

    useEffect(() => {
        const checkToken = async () => {
            try {
                const url = new URL(window.location.href);
                let token = url.searchParams.get('token');

                if (!token && window.location.hash.includes('token=')) {
                    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
                    token = hashParams.get('token');
                }

                if (!token) {
                    setChecking(false);
                    return;
                }

                const resp = await fetch(
                    `${SUPABASE_URL}/rest/v1/tester_signups?download_token=eq.${token}&status=eq.approved&select=id`,
                    {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        },
                    }
                );

                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data.length > 0) {
                        setUnlocked(true);
                    } else {
                        setTokenError(true);
                    }
                } else {
                    setTokenError(true);
                }
            } catch {
                setTokenError(true);
            } finally {
                setChecking(false);
            }
        };

        checkToken();
    }, []);

    return (
        <section id="download" className="py-24 sm:py-32 section-alt">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-16 animate-fade-in-up">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent border border-accent/10 mb-4">{t('dl.tag')}</span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-navy mb-4">
                        {t('dl.h2_1')} <span className="gradient-text">{t('dl.h2_2')}</span>
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto">{t('dl.sub')}</p>
                </div>

                {checking ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    </div>
                ) : !unlocked ? (
                    <div className="animate-fade-in-up">
                        {tokenError && (
                            <div className="mb-6 px-5 py-3.5 rounded-xl bg-error/5 border border-error/20 text-error text-sm text-center max-w-lg mx-auto">
                                ⚠️ {t('dl.invalid_token')}
                            </div>
                        )}
                        <div className="card-shadow rounded-3xl p-10 sm:p-14 text-center max-w-2xl mx-auto">
                            <div className="w-20 h-20 rounded-2xl bg-accent-faded border border-accent/15 flex items-center justify-center mx-auto mb-6">
                                <Lock size={36} className="text-accent" />
                            </div>
                            <h3 className="text-2xl font-bold text-navy mb-3">{t('dl.locked_title')}</h3>
                            <p className="text-text-secondary mb-8 max-w-md mx-auto leading-relaxed">{t('dl.locked_msg')}</p>

                            <div className="grid sm:grid-cols-2 gap-4 opacity-40 blur-[2px] pointer-events-none select-none">
                                {apps.map((app) => (
                                    <div key={app.key} className="card-shadow rounded-2xl p-6 text-left">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${app.bgGradient} flex items-center justify-center border ${app.borderColor}`}>
                                                <img src="/cliniq-logo.png" alt="" className="w-7 h-7 object-contain" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-navy">{t(app.nameKey)}</h4>
                                                <span className="text-[10px] text-text-muted">{t('dl.apk')}</span>
                                            </div>
                                        </div>
                                        <div className="h-8 bg-bg-tertiary rounded-lg" />
                                    </div>
                                ))}
                            </div>

                            <a href="#tester-signup" className="inline-flex items-center gap-2 mt-8 px-8 py-3.5 bg-accent hover:bg-accent-dark text-white font-bold rounded-xl text-sm transition-all hover:scale-[1.02] shadow-md">
                                🧪 {t('signup.submit')}
                            </a>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid sm:grid-cols-2 gap-6">
                            {apps.map((app) => (
                                <div key={app.key} className="animate-fade-in-up card-shadow-hover rounded-2xl p-8">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${app.bgGradient} flex items-center justify-center shadow-md border ${app.borderColor}`}>
                                            <img src="/cliniq-logo.png" alt="" className="w-9 h-9 object-contain drop-shadow-md" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-navy">{t(app.nameKey)}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-text-muted">{t('dl.apk')}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-faded text-accent font-medium">{t('dl.version')}</span>
                                                <span className="text-[10px] text-text-muted">{app.size}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-text-secondary text-sm mb-6 leading-relaxed">{t(app.descKey)}</p>
                                    {APK_URLS[app.key] ? (
                                        <a
                                            href={APK_URLS[app.key]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-accent/10 hover:bg-accent/20 border border-accent/20 hover:border-accent/40 text-accent rounded-xl text-sm font-medium transition-all"
                                        >
                                            <Download size={18} />
                                            {t('dl.btn')}
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 px-6 py-3 bg-warning/10 border border-warning/20 text-warning rounded-xl text-sm font-medium">
                                            🔧 {t('dl.coming_soon')}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* iOS TestFlight Banner */}
                        <div className="animate-fade-in-up mt-8 card-shadow rounded-2xl p-8 border border-border relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-black opacity-[0.03] pointer-events-none" />
                            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center shadow-md flex-shrink-0">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                                    </svg>
                                </div>
                                <div className="flex-1 text-center sm:text-start">
                                    <h3 className="text-lg font-bold text-navy mb-1">{t('dl.testflight_title')}</h3>
                                    <p className="text-text-secondary text-sm leading-relaxed">{t('dl.testflight_desc')}</p>
                                </div>
                                <a
                                    href="#tester-signup"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-sm transition-all hover:scale-[1.02] shadow-md whitespace-nowrap"
                                >
                                     {t('dl.testflight_cta')}
                                </a>
                            </div>
                        </div>

                        <div className="animate-fade-in-up mt-8 text-center">
                            <p className="text-text-muted text-sm">⚠️ {t('dl.warning')}</p>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
