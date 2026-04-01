import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Force SSR for all pages — admin panel is always dynamic (auth + live data)
// Also prevents React 18/19 dual-version SSG conflict in the monorepo
export const dynamic = 'force-dynamic';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
});

export const metadata: Metadata = {
    title: 'cliniq.one Admin Panel',
    description: 'Administrative dashboard for the cliniq.one telehealth platform',
    robots: 'noindex, nofollow',
    authors: [{ name: 'cliniq.one' }],
    creator: 'cliniq.one',
    publisher: 'cliniq.one',
};

import OfflineBannerClient from '@/components/OfflineBannerClient';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable}>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
            </head>
            <body className="min-h-screen bg-bg-primary overflow-x-hidden">
                <OfflineBannerClient />
                {children}
            </body>
        </html>
    );
}
