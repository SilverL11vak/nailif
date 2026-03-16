import type { Metadata } from 'next';
import SuccessPage from '../../success/page';
import { isLocale } from '@/lib/i18n/locale-path';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  return {
    title: isEn ? 'Booking Confirmed | Nailify' : 'Broneering kinnitatud | Nailify',
    description: isEn ? 'Your Nailify booking is confirmed.' : 'Sinu Nailify broneering on kinnitatud.',
    alternates: isLocale(locale)
      ? {
          canonical: `/${locale}/success`,
          languages: { et: '/et/success', en: '/en/success' },
        }
      : undefined,
  };
}

export default SuccessPage;
