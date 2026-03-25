import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const dynamic = 'force-dynamic';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
});

export const metadata: Metadata = {
    title: 'cliniq.one Doctor Portal',
    description: 'Doctor portal for the cliniq.one telehealth platform',
    robots: 'noindex, nofollow',
    authors: [{ name: 'cliniq.one' }],
    creator: 'cliniq.one',
    publisher: 'cliniq.one',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable}>
            <body className="min-h-screen bg-bg-primary">
                <ToastProvider>
                    {children}
                </ToastProvider>
            </body>
        </html>
    );
}
