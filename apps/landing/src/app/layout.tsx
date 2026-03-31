import type { Metadata } from 'next';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import './globals.css';

// Force dynamic rendering — avoids prerender errors for /_error:/404
// in monorepo environments with shared React dependencies
export const dynamic = 'force-dynamic';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const notoArabic = Noto_Sans_Arabic({
    subsets: ['arabic'],
    variable: '--font-arabic',
    display: 'swap',
    weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
    title: 'cliniq.one — استشارات طبية أونلاين مع أطباء مرخّصين',
    description:
        'استشر أطباء مرخّصين أونلاين من السعودية والإمارات. صِف أعراضك واحصل على تقييم طبي، تشخيص، ووصفة إلكترونية — كل ذلك من هاتفك.',
    openGraph: {
        title: 'cliniq.one — استشارات طبية أونلاين مع أطباء مرخّصين',
        description:
            'استشر أطباء مرخّصين أونلاين. تقييم طبي منظّم، وصفات إلكترونية، ورعاية متعددة التخصصات — آمنة وثنائية اللغة.',
        type: 'website',
        url: 'https://cliniq.one',
        siteName: 'cliniq.one',
        locale: 'ar_SA',
        images: [
            {
                url: 'https://cliniq.one/og-image.png',
                width: 1200,
                height: 630,
                alt: 'cliniq.one — استشارات طبية أونلاين مع أطباء مرخّصين',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'cliniq.one — استشارات طبية أونلاين مع أطباء مرخّصين',
        description:
            'استشر أطباء مرخّصين أونلاين. تقييم طبي منظّم، وصفات إلكترونية، ورعاية متعددة التخصصات.',
        images: ['https://cliniq.one/og-image.png'],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ar" dir="rtl">
            <body className={`${inter.variable} ${notoArabic.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}
