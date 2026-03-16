import type { Metadata } from 'next';
import ShopPage from '../../shop/page';
import { isLocale } from '@/lib/i18n/locale-path';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  return {
    title: isEn ? 'Shop | Nailify' : 'Pood | Nailify',
    description: isEn ? 'Shop premium Nailify aftercare products.' : 'Osta Nailify premium järelhooldustooteid.',
    alternates: isLocale(locale)
      ? {
          canonical: `/${locale}/shop`,
          languages: { et: '/et/shop', en: '/en/shop' },
        }
      : undefined,
  };
}

export default ShopPage;
