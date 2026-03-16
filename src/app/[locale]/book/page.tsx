import type { Metadata } from 'next';
import BookPage from '../../book/page';
import { isLocale } from '@/lib/i18n/locale-path';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  return {
    title: isEn ? 'Book Appointment | Nailify' : 'Broneeri aeg | Nailify',
    description: isEn
      ? 'Secure your Nailify appointment in a few easy steps.'
      : 'Kinnita oma Nailify aeg paari lihtsa sammuga.',
    alternates: isLocale(locale)
      ? {
          canonical: `/${locale}/book`,
          languages: { et: '/et/book', en: '/en/book' },
        }
      : undefined,
  };
}

export default BookPage;
