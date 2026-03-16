import type { Metadata } from 'next';
import FavoritesPage from '@/app/favorites/page';
import { isLocale } from '@/lib/i18n/locale-path';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  return {
    title: isEn ? 'Favourites | Nailify' : 'Lemmikud | Nailify',
    description: isEn ? 'Saved Nailify products for your next visit.' : 'Sinu salvestatud Nailify tooted järgmise hoolduse jaoks.',
    alternates: isLocale(locale)
      ? {
          canonical: `/${locale}/favorites`,
          languages: { et: '/et/favorites', en: '/en/favorites' },
        }
      : undefined,
  };
}

export default FavoritesPage;

