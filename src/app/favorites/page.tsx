'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FavoriteHeartIcon } from '@/components/ui/FavoriteHeartIcon';
import { useTranslation } from '@/lib/i18n';
import { useFavorites } from '@/hooks/use-favorites';
import { ShopNavBar } from '@/components/shop/ShopNavBar';

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
}

export default function FavoritesPage() {
  const { language, setLanguage, localizePath, t } = useTranslation();
  const { favorites, favoritesCount, isFavorite, toggleFavorite } = useFavorites();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const copy = {
    eyebrow: t('favoritesPage.eyebrow'),
    title: t('favoritesPage.title'),
    subtitle: t('favoritesPage.subtitle'),
    emptyTitle: t('favoritesPage.emptyTitle'),
    emptyText: t('favoritesPage.emptyText'),
    browse: t('favoritesPage.browse'),
    viewDetails: t('favoritesPage.viewDetails'),
    sectionTitle: t('favoritesPage.sectionTitle'),
    loading: t('favoritesPage.loading'),
    removeFavoriteAria: t('favoritesPage.removeFavoriteAria'),
  };

  const navCopy = {
    backToHome: t('shopNav.backToHome'),
    nav: {
      home: t('shopNav.home'),
      services: t('shopNav.services'),
      gallery: t('shopNav.gallery'),
      shop: t('shopNav.shop'),
      contact: t('shopNav.contact'),
      book: t('shopNav.book'),
    },
    languageMenuLabel: t('shopNav.languageMenuLabel'),
    languageEt: t('shopNav.languageEt'),
    languageEn: t('shopNav.languageEn'),
    favoritesAria: t('shopNav.favoritesAria'),
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/products?lang=${language}`);
        if (!response.ok) throw new Error('Failed to load products');
        const data = (await response.json()) as { products?: ProductItem[] };
        if (mounted) setProducts(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (mounted) setProducts([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [language]);

  const favoritesList = useMemo(
    () => products.filter((product) => favorites.includes(product.id)),
    [products, favorites],
  );

  return (
    <div className="min-h-screen bg-[#fff8fc]">
      <ShopNavBar
        language={language}
        setLanguage={setLanguage}
        localizePath={localizePath}
        copy={navCopy}
        favoritesCount={favoritesCount}
      />
      <main className="px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
        <section className="rounded-[30px] border border-[#eedce7] bg-white/92 p-6 shadow-[0_24px_42px_-30px_rgba(90,55,82,0.35)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#b57b9d]">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[#2f2530] sm:text-[2.3rem]">{copy.title}</h1>
          <p className="mt-3 max-w-[62ch] text-sm leading-6 text-[#715f70]">{copy.subtitle}</p>
        </section>

        <section className="mt-6">
          {isLoading ? (
            <p className="text-sm text-[#7f6c7c]">{copy.loading}</p>
          ) : favoritesList.length === 0 ? (
            <article className="rounded-[26px] border border-dashed border-[#e6cfde] bg-white/88 p-8 text-center">
              <h2 className="text-xl font-semibold text-[#3a2d38]">{copy.emptyTitle}</h2>
              <p className="mt-2 text-sm text-[#7f6c7c]">{copy.emptyText}</p>
              <Link
                href={localizePath('/shop')}
                className="btn-primary btn-primary-md mt-6 inline-flex"
              >
                {copy.browse}
              </Link>
            </article>
          ) : (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-[#3a2d38]">{copy.sectionTitle}</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {favoritesList.map((product) => (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-[24px] border border-[#ecdde7] bg-white shadow-[0_22px_34px_-28px_rgba(94,59,86,0.36)]"
                  >
                    <div className="relative h-52 overflow-hidden bg-[#f7ecf3]">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={800}
                          height={700}
                          unoptimized
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-[#897184]">{product.name}</div>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(product.id)}
                        className={`icon-circle-btn absolute right-3 top-3 h-8 w-8 min-h-[32px] min-w-[32px] bg-white/95 ${
                          isFavorite(product.id) ? 'border-[#c24d86] text-[#c24d86]' : 'border-[#e8d4e0] text-[#8f7086]'
                        }`}
                        aria-label={copy.removeFavoriteAria}
                      >
                        <FavoriteHeartIcon active={isFavorite(product.id)} size={16} />
                      </button>
                    </div>
                    <div className="space-y-2 p-4">
                      <h3 className="text-lg font-semibold text-[#332935]">{product.name}</h3>
                      <p className="line-clamp-2 text-sm leading-6 text-[#7b697a]">{product.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-lg font-semibold text-[#b04b80]">EUR {product.price}</span>
                        <Link
                          href={localizePath(`/shop/${product.id}`)}
                          className="btn-secondary btn-small px-3 text-xs"
                        >
                          {copy.viewDetails}
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
        </div>
      </main>
    </div>
  );
}
