'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

export default function Header() {
    const { t, locale, toggleLocale } = useI18n();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const NAV_LINKS = [
        { key: 'nav.about', href: '#about' },
        { key: 'nav.howItWorks', href: '#how-it-works' },
        { key: 'nav.story', href: '#story' },
        { key: 'nav.safety', href: '#safety' },
        { key: 'nav.download', href: '#download' },
    ];

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                scrolled ? 'glass-strong py-3' : 'bg-transparent py-5'
            }`}
        >
            <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <a href="#" className="flex items-center gap-2.5 group">
                    <img src="/cliniq-logo.png" alt="cliniq.one" className="h-9 w-9 object-contain group-hover:scale-110 transition-transform" />
                    <span className="text-xl font-bold">
                        <span className="text-accent">cliniq</span>
                        <span className="text-text-primary">.one</span>
                    </span>
                </a>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {NAV_LINKS.map((link) => (
                        <a key={link.href} href={link.href} className="text-sm text-text-secondary hover:text-accent transition-colors">
                            {t(link.key)}
                        </a>
                    ))}
                    {/* Language toggle */}
                    <button
                        onClick={toggleLocale}
                        className="px-3 py-1.5 rounded-full glass text-sm font-medium text-accent hover:bg-accent/10 transition-all"
                        aria-label="Toggle language"
                    >
                        {locale === 'en' ? 'العربية' : 'English'}
                    </button>
                    <a
                        href="#tester-signup"
                        className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-bg-primary font-semibold text-sm rounded-full transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(45,212,191,0.3)]"
                    >
                        {t('nav.tester')}
                    </a>
                </div>

                {/* Mobile hamburger */}
                <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex flex-col gap-1.5 p-2" aria-label="Toggle menu">
                    <span className={`w-6 h-0.5 bg-text-primary transition-transform ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                    <span className={`w-6 h-0.5 bg-text-primary transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
                    <span className={`w-6 h-0.5 bg-text-primary transition-transform ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                </button>
            </nav>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="md:hidden glass-strong mt-2 mx-4 rounded-2xl p-6 animate-fade-in-down">
                    <div className="flex flex-col gap-4">
                        {NAV_LINKS.map((link) => (
                            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="text-text-secondary hover:text-accent transition-colors py-2">
                                {t(link.key)}
                            </a>
                        ))}
                        <button
                            onClick={() => { toggleLocale(); setMenuOpen(false); }}
                            className="text-start text-accent py-2"
                        >
                            {locale === 'en' ? '🌐 العربية' : '🌐 English'}
                        </button>
                        <a href="#tester-signup" onClick={() => setMenuOpen(false)} className="mt-2 px-5 py-3 bg-accent text-bg-primary font-semibold text-center rounded-full">
                            {t('nav.tester')}
                        </a>
                    </div>
                </div>
            )}
        </header>
    );
}
