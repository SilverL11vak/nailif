import type { Metadata } from 'next';
import HomePage from '../page';
import { isLocale } from '@/lib/i18n/locale-path';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  return {
    title: isEn ? 'Nailify | Premium Nail Care' : 'Nailify | Premium küünehooldus',
    description: isEn
      ? 'Book premium nail services, discover beauty products, and visit our Mustamäe studio.'
      : 'Broneeri premium küünehooldus, avasta ilutooted ja külasta Mustamäe stuudiot.',
    alternates: isLocale(locale)
      ? {
          canonical: `/${locale}`,
          languages: { et: '/et', en: '/en' },
        }
      : undefined,
  };
}

export default HomePage;
