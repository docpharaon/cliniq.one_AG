'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

const COOKIE_KEY = 'cliniq_cookie_consent';

export default function CookieConsent() {
    const { t } = useI18n();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(COOKIE_KEY);
        if (!consent) {
            // Show after 1.5s delay so it doesn't compete with page load
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const accept = () => {
        localStorage.setItem(COOKIE_KEY, 'accepted');
        setVisible(false);
    };

    const decline = () => {
        localStorage.setItem(COOKIE_KEY, 'declined');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 sm:p-6 animate-fade-in-up">
            <div className="max-w-4xl mx-auto glass-strong rounded-2xl p-5 sm:p-6 border border-accent/20 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-lg">🍪</span>
                            <h4 className="text-sm font-bold text-text-primary">{t('cookie.title')}</h4>
                        </div>
                        <p className="text-text-secondary text-xs leading-relaxed">
                            {t('cookie.message')}{' '}
                            <a href="/privacy" className="text-accent hover:underline">{t('cookie.learn_more')}</a>
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={decline}
                            className="px-4 py-2 text-text-muted hover:text-text-secondary text-xs font-medium transition-colors"
                        >
                            {t('cookie.decline')}
                        </button>
                        <button
                            onClick={accept}
                            className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-bg-primary font-bold rounded-xl text-xs transition-all hover:scale-[1.02]"
                        >
                            {t('cookie.accept')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
