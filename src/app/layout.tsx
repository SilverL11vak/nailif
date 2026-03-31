import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import { ClientProviders } from '@/components/providers/ClientProviders';
import { BehaviorTracking } from '@/components/analytics/BehaviorTracking';
import { getAnalyticsEnabled } from '@/lib/app-settings';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  preload: false,
});

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600'],
  display: 'swap',
  preload: false,
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const analyticsEnabled = await getAnalyticsEnabled();
  return (
    <html lang="et">
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body className={`${inter.variable} ${cormorant.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ANALYTICS_ENABLED__=${JSON.stringify(analyticsEnabled)}`,
          }}
        />
        <ClientProviders>
          <BehaviorTracking />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}