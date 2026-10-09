import type { Metadata } from 'next';
import { Figtree, Archivo_Black, JetBrains_Mono } from 'next/font/google';
import { NetworkStatusBanner } from '@/components/common/NetworkStatusBanner';
import './globals.css';

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-figtree',
  display: 'swap',
});

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-archivo-black',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jbmono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Speedy Meals',
  description:
    'Fair-priced food delivery for South Asia and the Middle East. Real menu prices, low merchant commission, and reliable weekly payouts for riders.',
  icons: {
    icon: '/favicon.webp',
    shortcut: '/favicon.webp',
    apple: '/favicon.webp',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${figtree.variable} ${archivoBlack.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.webp" type="image/webp" />
      </head>
      <body className="font-sans selection:bg-[#E23A2E] selection:text-white">
        {children}
        <NetworkStatusBanner />
      </body>
    </html>
  );
}
