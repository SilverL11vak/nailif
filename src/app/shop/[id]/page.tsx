'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/hooks/use-cart';
import { FavoriteHeartIcon } from '@/components/ui/FavoriteHeartIcon';
import { ShopNavBar } from '@/components/shop/ShopNavBar';
import { ArrowLeft } from 'lucide-react';
import { useBookingStore } from '@/store/booking-store';
import { clearBookingProductIntent, setBookingProductIntent } from '@/lib/booking-product-intent';

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  images?: string[];
  category?: string;
  stock?: number;
  active?: boolean;
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { language, setLanguage, localizePath, t } = useTranslation();
  const { favoritesCount, isFavorite, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const selectedBookingProducts = useBookingStore((state) => state.selectedProducts);
  const addProductToBooking = useBookingStore((state) => state.addProductToBooking);
  const removeProductFromBooking = useBookingStore((state) => state.removeProductFromBooking);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const copy = {
    back: t('shopDetail.back'),
    addToBag: t('shopDetail.addToBag'),
    addToBooking: t('shopDetail.addToBooking'),
    detailsTitle: t('shopDetail.detailsTitle'),
    whatItDoes: t('shopDetail.whatItDoes'),
    whyItMatters: t('shopDetail.whyItMatters'),
    howToUse: t('shopDetail.howToUse'),
    whoFor: t('shopDetail.whoFor'),
    specs: t('shopDetail.specs'),
    benefits: t('shopDetail.benefits'),
    pairing: t('shopDetail.pairing'),
    similar: t('shopDetail.similar'),
    viewDetails: t('shopDetail.viewDetails'),
    notFound: t('shopDetail.notFound'),
    notFoundHint: t('shopDetail.notFoundHint'),
    backToHome: t('shopNav.backToHome'),
    backToShop: t('shopDetail.backToShop'),
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

  const product = useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const isInBooking = useMemo(() => {
    if (!product) return false;
    return selectedBookingProducts.some((p) => p.productId === product.id);
  }, [selectedBookingProducts, product]);
  const productImages = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) return product.images;
    return product.imageUrl ? [product.imageUrl] : [];
  }, [product]);

  const similarProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((item) => item.id !== product.id)
      .filter((item) => (product.category ? item.category === product.category : true))
      .slice(0, 4);
  }, [products, product]);


  const navCopy = copy;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff5fa_40%,_#fffafc_100%)]">
        <ShopNavBar language={language} setLanguage={setLanguage} localizePath={localizePath} copy={navCopy} favoritesCount={favoritesCount} />
        <main className="px-4 py-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-6xl rounded-[28px] border border-[#ecdce7] bg-white/90 p-8">
            <p className="text-sm text-[#7b6979]">{t('_auto.app_shop_id_page.p323')}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff5fa_40%,_#fffafc_100%)]">
        <ShopNavBar language={language} setLanguage={setLanguage} localizePath={localizePath} copy={copy} favoritesCount={favoritesCount} />
        <main className="px-4 py-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-[#ecdce7] bg-white/90 p-8 text-center">
            <h1 className="text-2xl font-semibold text-[#352b35]">{copy.notFound}</h1>
            <p className="mt-2 text-sm text-[#7b6979]">{copy.notFoundHint}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href={localizePath('/')} className="btn-secondary btn-secondary-sm inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> {copy.backToHome}
              </Link>
              <button onClick={() => router.push(localizePath('/shop'))} className="btn-primary btn-primary-sm">
                {copy.backToShop}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff5fa_40%,_#fffafc_100%)]">
      <ShopNavBar language={language} setLanguage={setLanguage} localizePath={localizePath} copy={copy} favoritesCount={favoritesCount} />
      <main className="px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={localizePath('/')}
              className="btn-secondary btn-secondary-sm inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.backToHome}
            </Link>
            <button
              onClick={() => router.push(localizePath('/shop'))}
              className="btn-secondary btn-secondary-sm"
            >
              {copy.backToShop}
            </button>
          </div>

        <section className="grid gap-6 rounded-[30px] border border-[#ecdce7] bg-white/92 p-5 shadow-[0_24px_42px_-30px_rgba(90,55,82,0.35)] lg:grid-cols-12 lg:p-8">
          <div className="space-y-3 lg:col-span-7">
            <div className="relative overflow-hidden rounded-[24px] bg-[#f7ecf3]">
              {productImages[activeImageIndex] ? (
                <Image src={productImages[activeImageIndex]} alt={product.name} width={1200} height={900} unoptimized className="h-[380px] w-full object-cover sm:h-[440px]" />
              ) : (
                <div className="flex h-[380px] items-center justify-center text-[#8f7187]">{product.name}</div>
              )}
            </div>
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {productImages.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative h-20 w-20 overflow-hidden rounded-xl border ${index === activeImageIndex ? 'border-[#c24d86]' : 'border-[#e8d5e1]'}`}
                  >
                    <Image src={imageUrl} alt={`${product.name}-${index + 1}`} width={240} height={240} unoptimized className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#a06f8d]">{product.category ?? 'Aftercare'}</p>
            <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2f2530]">{product.name}</h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-3xl font-semibold tracking-[-0.02em] text-[#b04b80]">EUR {product.price}</p>
              <span className="rounded-full border border-[#e8d5e1] bg-white px-3 py-1 text-xs font-semibold text-[#6a4c64]">
                SKU: {product.id}
              </span>
              {product.active && (product.stock ?? 0) > 0 ? (
                <span className="rounded-full bg-[#f1fbf5] px-3 py-1 text-xs font-semibold text-[#2d8a5e]">In stock</span>
              ) : (
                <span className="rounded-full bg-[#fff1f4] px-3 py-1 text-xs font-semibold text-[#c94a64]">
                  {t('_auto.app_shop_id_page.p324')}
                </span>
              )}
            </div>

            <p className="text-sm leading-6 text-[#726272]">{product.description}</p>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[#ecdce7] bg-white/75 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a06f8d]">
                  {t('_auto.app_shop_id_page.p325')}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="icon-circle-btn h-10 w-10 min-h-[40px] min-w-[40px]"
                    aria-label={t('_auto.app_shop_id_page.p326')}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    value={quantity}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      setQuantity(Math.max(1, Math.min(99, Math.floor(next))));
                    }}
                    className="w-16 rounded-xl border border-[#e8d5e1] bg-white px-3 py-2 text-center text-sm font-semibold text-[#2f2530] outline-none focus:border-[#c24d86]/60 focus:ring-2 focus:ring-[#c24d86]/20"
                    aria-label={t('_auto.app_shop_id_page.p327')}
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    className="icon-circle-btn h-10 w-10 min-h-[40px] min-w-[40px]"
                    aria-label={t('_auto.app_shop_id_page.p328')}
                    disabled={!product.active || (product.stock ?? 0) <= 0}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => addToCart(product.id, quantity, product.price)}
                  disabled={!product.active || (product.stock ?? 0) <= 0}
                  className="btn-primary btn-primary-md disabled:opacity-50"
                >
                  {copy.addToBag}
                </button>

                <button
                  onClick={() => {
                    if (isInBooking) {
                      clearBookingProductIntent();
                      removeProductFromBooking(product.id);
                      return;
                    }

                    const bookingProduct = {
                      productId: product.id,
                      name: product.name,
                      unitPrice: product.price,
                      quantity,
                      imageUrl: product.imageUrl ?? null,
                    };
                    setBookingProductIntent(bookingProduct);
                    addProductToBooking(bookingProduct);
                    router.push(localizePath('/book'));
                  }}
                  disabled={!product.active || (product.stock ?? 0) <= 0}
                  className="btn-secondary btn-secondary-md disabled:opacity-50"
                >
                  {isInBooking ? (t('_auto.app_shop_id_page.p329')) : copy.addToBooking}
                </button>

                <button
                  onClick={() => toggleFavorite(product.id)}
                  className={`pill-selectable inline-flex items-center gap-1.5 px-4 text-sm ${isFavorite(product.id) ? 'is-selected' : ''}`}
                >
                  <FavoriteHeartIcon active={isFavorite(product.id)} size={16} />
                  {t('_auto.app_shop_id_page.p330')}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[24px] border border-[#ecdce7] bg-white/92 p-6">
            <h2 className="text-lg font-semibold text-[#302532]">{copy.detailsTitle}</h2>
            <dl className="mt-3 space-y-3 text-sm leading-6 text-[#6f5f70]">
              <div><dt className="font-semibold text-[#3a2f3a]">{copy.whatItDoes}</dt><dd>{product.description}</dd></div>
              <div><dt className="font-semibold text-[#3a2f3a]">{copy.whyItMatters}</dt><dd>{product.description}</dd></div>
              <div><dt className="font-semibold text-[#3a2f3a]">{copy.howToUse}</dt><dd>{product.description}</dd></div>
              <div><dt className="font-semibold text-[#3a2f3a]">{copy.whoFor}</dt><dd>{product.category ?? (t('_auto.app_shop_id_page.p331'))}</dd></div>
            </dl>
          </article>

          <article className="rounded-[24px] border border-[#ecdce7] bg-white/92 p-6">
            <h2 className="text-lg font-semibold text-[#302532]">{copy.specs}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#6f5f70]">
              <li>{t('shopDetail.categoryLabel')} {product.category ?? (t('_auto.app_shop_id_page.p333'))}</li>
              <li>
                {t('shopDetail.availabilityLabel')} {product.active && (product.stock ?? 0) > 0
                  ? `${product.stock ?? 0} ${t('shopDetail.inStock')}`
                  : t('_auto.app_shop_id_page.p335')}
              </li>
              <li>{t('shopDetail.productCodeLabel')} {product.id}</li>
            </ul>
            <h3 className="mt-5 text-base font-semibold text-[#302532]">{copy.benefits}</h3>
            <p className="mt-2 text-sm text-[#6f5f70] leading-6">{product.description}</p>
            <h3 className="mt-5 text-base font-semibold text-[#302532]">{copy.pairing}</h3>
            <p className="mt-2 text-sm text-[#6f5f70]">
              {t('_auto.app_shop_id_page.p337')}
            </p>
          </article>
        </section>

        <section className="rounded-[26px] border border-[#ecdce7] bg-white/92 p-6">
          <h2 className="text-xl font-semibold text-[#302532]">{copy.similar}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similarProducts.map((item) => (
              <article key={item.id} className="group overflow-hidden rounded-[20px] border border-[#ecdce7] bg-white">
                <div className="relative h-40 overflow-hidden bg-[#f7ecf3]">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} width={500} height={420} unoptimized className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#8f7187]">{item.name}</div>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.id)}
                    className={`icon-circle-btn absolute right-2 top-2 h-7 w-7 min-h-[28px] min-w-[28px] bg-white/95 ${
                      isFavorite(item.id) ? 'border-[#c24d86] text-[#c24d86]' : 'border-[#ead6e2] text-[#8f7086]'
                    }`}
                    aria-label={t('_auto.app_shop_id_page.p338')}
                  >
                    <FavoriteHeartIcon active={isFavorite(item.id)} size={14} />
                  </button>
                </div>
                <div className="space-y-2 p-3">
                  <h3 className="line-clamp-1 text-sm font-semibold text-[#322a33]">{item.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#b04b80]">EUR {item.price}</span>
                    <button
                      onClick={() => router.push(localizePath(`/shop/${item.id}`))}
                      className="btn-secondary btn-small px-2.5 text-[11px]"
                    >
                      {copy.viewDetails}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        </div>
      </main>
    </div>
  );
}
