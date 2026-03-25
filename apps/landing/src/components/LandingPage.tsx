'use client';

import { useEffect } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import About from '@/components/About';
import HowItWorks from '@/components/HowItWorks';
import ForWho from '@/components/ForWho';
import Story from '@/components/Story';
import Safety from '@/components/Safety';
import Downloads from '@/components/Downloads';
import TesterSignup from '@/components/TesterSignup';
import Footer from '@/components/Footer';

function PageContent() {
    const { dir, locale } = useI18n();

    useEffect(() => {
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', locale);
    }, [dir, locale]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => {
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <>
            <Header />
            <main>
                <Hero />
                <About />
                <HowItWorks />
                <ForWho />
                <Story />
                <Safety />
                <Downloads />
                <TesterSignup />
            </main>
            <Footer />
        </>
    );
}

export default function LandingPage() {
    return (
        <I18nProvider>
            <PageContent />
        </I18nProvider>
    );
}
