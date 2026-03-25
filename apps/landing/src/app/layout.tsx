import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'cliniq.one — AI-Powered Telemedicine for the GCC',
    description:
        'Experience the future of healthcare. cliniq.one connects patients with licensed doctors through AI-driven medical interviews, structured clinical reports, and e-prescriptions — all from your phone.',
    openGraph: {
        title: 'cliniq.one — AI-Powered Telemedicine',
        description:
            'AI-driven medical intake, licensed doctor consultations, e-prescriptions — all from your phone.',
        type: 'website',
        url: 'https://cliniq.one',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}
