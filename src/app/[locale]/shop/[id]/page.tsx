import type { Metadata } from 'next';
import ProductDetailPage from '@/app/shop/[id]/page';
import { isLocale } from '@/lib/i18n/locale-path';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const isEn = locale === 'en';
  return {
    title: isEn ? `Product | ${id} | Nailify` : `Toode | ${id} | Nailify`,
    description: isEn ? 'Nailify premium aftercare product details.' : 'Nailify premium järelhooldustoote detailid.',
    alternates: isLocale(locale)
      ? {
          canonical: `/${locale}/shop/${id}`,
          languages: {
            et: `/et/shop/${id}`,
            en: `/en/shop/${id}`,
          },
        }
      : undefined,
  };
}

export default ProductDetailPage;

