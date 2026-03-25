'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

const SUPABASE_URL = 'https://uabbndansgxpvogteyxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYmJuZGFuc2d4cHZvZ3RleXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzIyODgsImV4cCI6MjA4Njg0ODI4OH0.bFh8Wa4koQrtdrD62N7BzsCCGXqBMhFJLr8RiO-3OEc';

/**
 * APK download URLs — update these when uploading new builds.
 * For Google Drive: use the format https://drive.google.com/uc?export=download&id=FILE_ID
 * For Supabase Storage: use the public URL from the bucket.
 */
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
            bgGradient: 'from-slate-700 to-slate-900',
            borderColor: 'border-slate-500/30',
            size: '~3 MB',
        },
    ];

    // Check for token in URL on mount
    useEffect(() => {
        const checkToken = async () => {
            try {
                // Token can come from ?token= or from hash #download?token=
                const url = new URL(window.location.href);
                let token = url.searchParams.get('token');

                // Also check hash params (e.g. /#download?token=...)
                if (!token && window.location.hash.includes('token=')) {
                    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
                    token = hashParams.get('token');
                }

                if (!token) {
                    setChecking(false);
                    return;
                }

                // Validate token against Supabase
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
        <section id="download" className="py-24 sm:py-32 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" />
            <div className="max-w-6xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16 animate-fade-in-up">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent mb-4">{t('dl.tag')}</span>
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        {t('dl.h2_1')} <span className="gradient-text">{t('dl.h2_2')}</span>
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto">{t('dl.sub')}</p>
                </div>

                {/* Token validation loading */}
                {checking ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    </div>
                ) : !unlocked ? (
                    /* ── LOCKED STATE ── */
                    <div className="animate-fade-in-up">
                        {tokenError && (
                            <div className="mb-6 px-5 py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center max-w-lg mx-auto">
                                ⚠️ {t('dl.invalid_token')}
                            </div>
                        )}
                        <div className="glass-strong rounded-3xl p-10 sm:p-14 text-center max-w-2xl mx-auto">
                            <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6">
                                <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-accent">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-text-primary mb-3">{t('dl.locked_title')}</h3>
                            <p className="text-text-secondary mb-8 max-w-md mx-auto leading-relaxed">{t('dl.locked_msg')}</p>

                            {/* Preview cards — blurred / disabled */}
                            <div className="grid sm:grid-cols-2 gap-4 opacity-40 blur-[2px] pointer-events-none select-none">
                                {apps.map((app) => (
                                    <div key={app.key} className="glass rounded-2xl p-6 text-left">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${app.bgGradient} flex items-center justify-center border ${app.borderColor}`}>
                                                <img src="/cliniq-logo.png" alt="" className="w-7 h-7 object-contain" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-text-primary">{t(app.nameKey)}</h4>
                                                <span className="text-[10px] text-text-muted">{t('dl.apk')}</span>
                                            </div>
                                        </div>
                                        <div className="h-8 bg-accent/10 rounded-lg" />
                                    </div>
                                ))}
                            </div>

                            <a href="#tester-signup" className="inline-flex items-center gap-2 mt-8 px-8 py-3.5 bg-accent hover:bg-accent-dark text-bg-primary font-bold rounded-xl text-sm transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(45,212,191,0.3)]">
                                🧪 {t('signup.submit')}
                            </a>
                        </div>
                    </div>
                ) : (
                    /* ── UNLOCKED STATE ── */
                    <>
                        <div className="grid sm:grid-cols-2 gap-6">
                            {apps.map((app) => (
                                <div key={app.key} className="animate-fade-in-up glass-strong rounded-2xl p-8 hover:glow-teal transition-all duration-500">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${app.bgGradient} flex items-center justify-center shadow-lg border ${app.borderColor}`}>
                                            <img src="/cliniq-logo.png" alt="" className="w-9 h-9 object-contain drop-shadow-md" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">{t(app.nameKey)}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-text-muted">{t('dl.apk')}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-medium">{t('dl.version')}</span>
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
                                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z" /></svg>
                                            {t('dl.btn')}
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl text-sm font-medium">
                                            🔧 {t('dl.coming_soon')}
                                        </span>
                                    )}
                                </div>
                            ))}
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
