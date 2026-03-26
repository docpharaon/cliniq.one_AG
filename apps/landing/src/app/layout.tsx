import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'cliniq.one — Online Medical Consultations with Licensed Doctors',
    description:
        'Consult licensed doctors online from KSA & UAE. Describe your symptoms, receive a structured medical review, diagnosis, and e-prescription — all from your phone. Arabic & English.',
    openGraph: {
        title: 'cliniq.one — Online Medical Consultations with Licensed Doctors',
        description:
            'Consult licensed doctors online. Structured medical reviews, e-prescriptions, and multi-specialty care — safe, bilingual, and privacy-first.',
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
