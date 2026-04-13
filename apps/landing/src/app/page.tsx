'use client';

import { useEffect } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import TrustBar from '@/components/TrustBar';
import Innovation from '@/components/Innovation';
import Story from '@/components/Story';
import HowItWorks from '@/components/HowItWorks';
import About from '@/components/About';
import AppShowcase from '@/components/AppShowcase';
import Safety from '@/components/Safety';
import ForWho from '@/components/ForWho';
import Channels from '@/components/Channels';
import AppAvailability from '@/components/AppAvailability';
import Downloads from '@/components/Downloads';
import TesterSignup from '@/components/TesterSignup';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import PasswordGate from '@/components/PasswordGate';

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
                <TrustBar />
                <Innovation />
                <Story />
                <HowItWorks />
                <AppShowcase />
                <About />
                <Channels />
                <Safety />
                <ForWho />
                <AppAvailability />
                <Downloads />
                <TesterSignup />
            </main>
            <Footer />
            <CookieConsent />
        </>
    );
}

export default function Home() {
    return (
        <I18nProvider>
            <PasswordGate>
                <PageContent />
            </PasswordGate>
        </I18nProvider>
    );
}
