import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import { ClientProviders } from '@/components/providers/ClientProviders';
import { BehaviorTracking } from '@/components/analytics/BehaviorTracking';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://nailif.vercel.app'),
  title: 'Nailify - Premium Nail Artistry in Tallinn',
  description: 'Expert nail technicians, lasting results. Book your appointment in Mustamäe, Tallinn.',
  alternates: {
    languages: {
      et: '/et',
      en: '/en',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="et">
      <body className={`${inter.variable} ${cormorant.variable} antialiased`}>
        <ClientProviders>
          <BehaviorTracking />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
