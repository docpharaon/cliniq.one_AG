'use client';

import { useI18n } from '@/lib/i18n';

export default function Footer() {
    const { t } = useI18n();

    return (
        <footer className="border-t border-border py-12 sm:py-16">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid sm:grid-cols-3 gap-10 mb-12">
                    <div>
                        <div className="flex items-center gap-2.5 mb-4">
                            <img src="/cliniq-logo.png" alt="cliniq.one" className="h-8 w-8 object-contain" />
                            <span className="text-lg font-bold">
                                <span className="text-accent">cliniq</span>
                                <span className="text-text-primary">.one</span>
                            </span>
                        </div>
                        <p className="text-text-muted text-sm leading-relaxed">{t('footer.tagline')}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-4">{t('footer.platform')}</h4>
                        <div className="space-y-2.5">
                            <a href="#about" className="block text-sm text-text-muted hover:text-accent transition-colors">{t('nav.about')}</a>
                            <a href="#how-it-works" className="block text-sm text-text-muted hover:text-accent transition-colors">{t('nav.howItWorks')}</a>
                            <a href="#safety" className="block text-sm text-text-muted hover:text-accent transition-colors">{t('nav.safety')}</a>
                            <a href="#download" className="block text-sm text-text-muted hover:text-accent transition-colors">{t('nav.download')}</a>
                            <a href="#tester-signup" className="block text-sm text-text-muted hover:text-accent transition-colors">{t('nav.tester')}</a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-4">{t('footer.contact')}</h4>
                        <div className="space-y-2.5">
                            <a href="mailto:tester@cliniq.one" className="block text-sm text-text-muted hover:text-accent transition-colors">tester@cliniq.one</a>
                        </div>
                        <div className="mt-6">
                            <h4 className="text-sm font-semibold text-text-primary mb-3">{t('footer.markets')}</h4>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 rounded-full text-xs bg-accent-faded text-accent">{t('footer.ksa')}</span>
                                <span className="px-3 py-1 rounded-full text-xs bg-blue-faded text-blue">{t('footer.uae')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="section-divider mb-8" />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-text-muted text-xs">
                    <span>{t('footer.copyright')}</span>
                    <div className="flex items-center gap-6">
                        <a href="#" className="hover:text-accent transition-colors">{t('footer.terms')}</a>
                        <a href="#" className="hover:text-accent transition-colors">{t('footer.privacy')}</a>
                        <a href="#" className="hover:text-accent transition-colors">{t('footer.ai')}</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
