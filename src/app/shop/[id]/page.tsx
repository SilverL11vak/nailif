'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/hooks/use-cart';
import { useBookingStore } from '@/store/booking-store';
import { setBookingProductIntent } from '@/lib/booking-product-intent';
import { ShopNavBar } from '@/components/shop/ShopNavBar';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { ProductInfoPanel } from '@/components/shop/ProductInfoPanel';
import type { ShopProduct } from '@/components/shop/types';
import { formatPrice } from '@/components/shop/utils';
import { getLocalizedValue } from '@/lib/localized-text';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { language, setLanguage, localizePath, t } = useTranslation();
  const { favoritesCount } = useFavorites();
  const { addToCart } = useCart();
  const addProductToBooking = useBookingStore((state) => state.addProductToBooking);
  const activeBookingSession = useBookingStore((state) => state.selectedService || state.selectedSlot);

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'usage' | 'pairing'>('details');

  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;

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

  const copy = {
    breadcrumbShop: t('shopDetail.breadcrumbShop'),
    backToShop: t('shopDetail.backToShop'),
    loading: t('shopDetail.loading'),
    notFound: t('shopDetail.notFound'),
    notFoundHint: t('shopDetail.notFoundHint'),
    addToCart: t('add_to_cart'),
    addToBooking: t('add_to_booking'),
    quantity: t('shopDetail.quantity'),
    categoryFallback: t('shopDetail.categoryFallback'),
    inStock: t('shopDetail.inStockLabel'),
    outOfStock: t('shopDetail.outOfStockLabel'),
    trustSalon: t('shopDetail.trust.salonTested'),
    trustLonger: t('shopDetail.trust.longerResults'),
    trustGuidance: t('shopDetail.trust.aftercareGuidance'),
    detailsTab: t('shopDetail.tabs.details'),
    usageTab: t('shopDetail.tabs.usage'),
    pairingTab: t('shopDetail.tabs.pairing'),
    relatedTitle: t('shopDetail.relatedTitle'),
    detailsHeading: t('shopDetail.detailsHeading'),
    usageHeading: t('shopDetail.usageHeading'),
    pairingHeading: t('shopDetail.pairingHeading'),
    detailsBody: t('shopDetail.detailsBody'),
    usageBody: t('shopDetail.usageBody'),
    pairingBody: t('shopDetail.pairingBody'),
    viewProduct: t('shopDetail.viewDetails'),
  };

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products?lang=${language}`);
        if (!response.ok) throw new Error('Failed to load products');
        const data = (await response.json()) as { products?: ShopProduct[] };
        if (mounted) setProducts(Array.isArray(data.products) ? data.products : []);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [language]);

  const localizedProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        name: getLocalizedValue({ et: product.nameEt ?? product.name, en: product.nameEn ?? product.name, locale: language }),
        description: getLocalizedValue({
          et: product.descriptionEt ?? product.description,
          en: product.descriptionEn ?? product.description,
          locale: language,
        }),
        category: getLocalizedValue({ et: product.categoryEt ?? product.category, en: product.categoryEn ?? product.category, locale: language }),
      })),
    [language, products],
  );

  const product = useMemo(() => localizedProducts.find((item) => item.id === productId), [localizedProducts, productId]);

  const productImages = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) return product.images;
    return product.imageUrl ? [product.imageUrl] : [];
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return localizedProducts
      .filter((item) => item.id !== product.id)
      .filter((item) => (product.category ? item.category === product.category : true))
      .slice(0, 4);
  }, [localizedProducts, product]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product.id, quantity, product.price);
  };

  const handleAddToBooking = () => {
    if (!product) return;
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff6fb_38%,_#fffafc_100%)]">
        <ShopNavBar language={language} setLanguage={setLanguage} localizePath={localizePath} copy={navCopy} favoritesCount={favoritesCount} />
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#eadde5] bg-white/85 px-6 py-14 text-center text-[#6f5d6d]">{copy.loading}</div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff6fb_38%,_#fffafc_100%)]">
        <ShopNavBar language={language} setLanguage={setLanguage} localizePath={localizePath} copy={navCopy} favoritesCount={favoritesCount} />
        <main className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 lg:px-8">
          <h1 className="font-brand text-5xl text-[#2f2530]">{copy.notFound}</h1>
          <p className="mt-3 text-[#6f5d6d]">{copy.notFoundHint}</p>
          <Link href={localizePath('/shop')} className="btn-primary btn-primary-md mt-6 inline-flex">
            {copy.backToShop}
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff6fb_38%,_#fffafc_100%)]">
      <ShopNavBar language={language} setLanguage={setLanguage} localizePath={localizePath} copy={navCopy} favoritesCount={favoritesCount} />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-sm text-[#7d6a7a]">
          <Link href={localizePath('/shop')} className="hover:text-[#2f2530]">{copy.breadcrumbShop}</Link>
          <span>/</span>
          <span className="text-[#4f3f4f]">{product.name}</span>
        </nav>

        <button type="button" onClick={() => router.push(localizePath('/shop'))} className="btn-secondary btn-secondary-sm inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {copy.backToShop}
        </button>

        <section className="grid gap-8 rounded-[30px] border border-[#ebdde6] bg-white/90 p-5 shadow-[0_22px_40px_-28px_rgba(95,63,86,0.28)] lg:grid-cols-12 lg:p-8">
          <div className="lg:col-span-7">
            <ProductGallery
              name={product.name}
              images={productImages}
              activeImageIndex={activeImageIndex}
              onActiveImageChange={setActiveImageIndex}
            />
          </div>

          <div className="lg:col-span-5">
            <ProductInfoPanel
              product={product}
              language={language}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onAddToCart={handleAddToCart}
              onAddToBooking={handleAddToBooking}
              primaryCta={copy.addToCart}
              secondaryCta={copy.addToBooking}
              showSecondaryCta={Boolean(activeBookingSession)}
              quantityLabel={copy.quantity}
              categoryFallback={copy.categoryFallback}
              inStockLabel={copy.inStock}
              outOfStockLabel={copy.outOfStock}
              trustItems={[copy.trustSalon, copy.trustLonger, copy.trustGuidance]}
            />
          </div>
        </section>

        <section className="rounded-[28px] border border-[#eadce5] bg-white/85 p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`pill-selectable px-4 text-sm ${activeTab === 'details' ? 'is-selected' : ''}`}
            >
              {copy.detailsTab}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('usage')}
              className={`pill-selectable px-4 text-sm ${activeTab === 'usage' ? 'is-selected' : ''}`}
            >
              {copy.usageTab}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pairing')}
              className={`pill-selectable px-4 text-sm ${activeTab === 'pairing' ? 'is-selected' : ''}`}
            >
              {copy.pairingTab}
            </button>
          </div>

          {activeTab === 'details' && (
            <div>
              <h2 className="text-xl font-semibold text-[#2f2530]">{copy.detailsHeading}</h2>
              <p className="mt-2 text-[#655565]">{copy.detailsBody}</p>
              <p className="mt-3 text-[#655565]">{product.description}</p>
            </div>
          )}

          {activeTab === 'usage' && (
            <div>
              <h2 className="text-xl font-semibold text-[#2f2530]">{copy.usageHeading}</h2>
              <p className="mt-2 text-[#655565]">{copy.usageBody}</p>
            </div>
          )}

          {activeTab === 'pairing' && (
            <div>
              <h2 className="text-xl font-semibold text-[#2f2530]">{copy.pairingHeading}</h2>
              <p className="mt-2 text-[#655565]">{copy.pairingBody}</p>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-brand text-4xl text-[#2f2530]">{copy.relatedTitle}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(localizePath(`/shop/${item.id}`))}
                className="rounded-2xl border border-[#ecdee8] bg-white p-4 text-left shadow-[0_16px_30px_-26px_rgba(64,39,58,0.3)]"
              >
                <p className="line-clamp-1 text-sm font-semibold text-[#2f2530]">{item.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[#7f6a7d]">{item.description}</p>
                <p className="mt-2 text-sm font-semibold text-[#2f2530]">{formatPrice(item.price, language)}</p>
                <p className="mt-2 text-xs font-semibold text-[#8e5f7c]">{copy.viewProduct}</p>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
