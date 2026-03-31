'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useCart } from '@/hooks/use-cart';
import { useFavorites } from '@/hooks/use-favorites';
import { useBookingStore } from '@/store/booking-store';
import { setBookingProductIntent } from '@/lib/booking-product-intent';
import { ShopNavBar } from '@/components/shop/ShopNavBar';
import { FilterBar } from '@/components/shop/FilterBar';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { CartDrawer } from '@/components/shop/CartDrawer';
import type { ShopProduct } from '@/components/shop/types';
import { formatPrice, normalizeText } from '@/components/shop/utils';
import { getLocalizedValue } from '@/lib/localized-text';

export default function ShopPage() {
  const router = useRouter();
  const { language, setLanguage, localizePath, t } = useTranslation();
  const { favoritesCount } = useFavorites();
  const { items: cartItems, addToCart, setCartItems } = useCart();
  const addProductToBooking = useBookingStore((state) => state.addProductToBooking);
  const activeBookingSession = useBookingStore((state) => state.selectedService || state.selectedSlot);

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
    eyebrow: t('shopPage.eyebrow'),
    title: t('shopPage.title'),
    subtitle: t('shopPage.subtitle'),
    trustLine: t('shopPage.trustLine'),
    categoryAll: t('shopPage.categoryAll'),
    sortLabel: t('shopPage.sortLabel'),
    mobileFilters: t('shopPage.mobileFilters'),
    loading: t('shopPage.loading'),
    emptyProducts: t('shopPage.emptyProducts'),
    addToCart: t('add_to_cart'),
    addToBooking: t('add_to_booking'),
    viewDetails: t('shopPage.viewDetails'),
    benefitLabel: t('shopPage.benefitLabel'),
    bestSeller: t('shopPage.bestSeller'),
    cartButton: t('shopPage.cartButton'),
    cartSummary: t('shopPage.cartSummary'),
    cartTitle: t('shopPage.cartTitle'),
    cartEmpty: t('shopPage.empty'),
    cartTotal: t('shopPage.total'),
    cartEmail: t('shopPage.email'),
    emailPlaceholder: t('shopPage.emailPlaceholder'),
    checkout: t('shopPage.checkout'),
    redirecting: t('shopPage.redirecting'),
    checkoutError: t('shopPage.checkoutError'),
    close: t('common.close'),
    merchTitleFavorites: t('shopPage.merch.favorites.title'),
    merchDescFavorites: t('shopPage.merch.favorites.description'),
    merchTitleAftercare: t('shopPage.merch.aftercare.title'),
    merchDescAftercare: t('shopPage.merch.aftercare.description'),
    merchTitleGift: t('shopPage.merch.gift.title'),
    merchDescGift: t('shopPage.merch.gift.description'),
  };

  const sortOptions = [
    { value: 'featured', label: t('shopPage.sort.featured') },
    { value: 'priceAsc', label: t('shopPage.sort.priceAsc') },
    { value: 'priceDesc', label: t('shopPage.sort.priceDesc') },
    { value: 'nameAsc', label: t('shopPage.sort.nameAsc') },
  ];

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products?lang=${language}`);
        if (!response.ok) throw new Error('Failed to load products');
        const data = (await response.json()) as { products?: ShopProduct[] };
        if (mounted) {
          setProducts(Array.isArray(data.products) ? data.products : []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [language]);

  const displayProducts = useMemo(
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

  const categories = useMemo(
    () => Array.from(new Set(displayProducts.map((p) => p.category).filter((category): category is string => Boolean(category)))),
    [displayProducts],
  );

  const filteredProducts = useMemo(() => {
    const subset =
      activeCategory === 'all' ? displayProducts : displayProducts.filter((product) => product.category === activeCategory);
    const sorted = [...subset];

    switch (sortBy) {
      case 'priceAsc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'priceDesc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'nameAsc':
        sorted.sort((a, b) => a.name.localeCompare(b.name, language === 'et' ? 'et' : 'en'));
        break;
      default:
        sorted.sort((a, b) => Number(Boolean(b.isPopular)) - Number(Boolean(a.isPopular)));
        break;
    }

    return sorted;
  }, [activeCategory, displayProducts, language, sortBy]);

  const productsById = useMemo(() => new Map(displayProducts.map((product) => [product.id, product])), [displayProducts]);

  const cartTotal = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const product = productsById.get(item.productId);
        return sum + (product ? product.price * item.quantity : 0);
      }, 0),
    [cartItems, productsById],
  );

  const merchandising = useMemo(() => {
    const favorites = displayProducts.filter((product) => product.isPopular).slice(0, 3);
    const aftercare = displayProducts
      .filter((product) => {
        const text = `${normalizeText(product.name)} ${normalizeText(product.category)} ${normalizeText(product.description)}`;
        return text.includes('care') || text.includes('hooldus') || text.includes('repair') || text.includes('taast');
      })
      .slice(0, 3);
    const gifts = displayProducts.filter((product) => product.price >= 35).slice(0, 3);

    return [
      { id: 'favorites', title: copy.merchTitleFavorites, description: copy.merchDescFavorites, items: favorites },
      { id: 'aftercare', title: copy.merchTitleAftercare, description: copy.merchDescAftercare, items: aftercare },
      { id: 'gift', title: copy.merchTitleGift, description: copy.merchDescGift, items: gifts },
    ];
  }, [copy.merchDescAftercare, copy.merchDescFavorites, copy.merchDescGift, copy.merchTitleAftercare, copy.merchTitleFavorites, copy.merchTitleGift, displayProducts]);

  const handleAddToCart = (product: ShopProduct) => {
    addToCart(product.id, 1, product.price);
    setCartOpen(true);
  };

  const handleAddToBooking = (product: ShopProduct) => {
    const bookingProduct = {
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: 1,
      imageUrl: product.imageUrl ?? null,
    };
    setBookingProductIntent(bookingProduct);
    addProductToBooking(bookingProduct);
    router.push(localizePath('/book'));
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setCheckoutError(null);
    setIsPaying(true);

    try {
      const response = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems, customerEmail: email || undefined }),
      });
      if (!response.ok) throw new Error('Checkout failed');
      const data = (await response.json()) as { checkoutUrl?: string };
      if (!data.checkoutUrl) throw new Error('Missing checkout URL');
      window.location.href = data.checkoutUrl;
    } catch {
      setCheckoutError(copy.checkoutError);
      setIsPaying(false);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(cartItems.filter((item) => item.productId !== productId));
      return;
    }
    setCartItems(cartItems.map((item) => (item.productId === productId ? { ...item, quantity } : item)));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff6fb_38%,_#fffafc_100%)]">
      <ShopNavBar language={language} setLanguage={setLanguage} localizePath={localizePath} copy={navCopy} favoritesCount={favoritesCount} />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="space-y-3 rounded-[30px] border border-[#ebdde6] bg-white/85 p-6 shadow-[0_22px_40px_-28px_rgba(95,63,86,0.28)]">
          <p className="type-overline text-[#9b7890]">{copy.eyebrow}</p>
          <h1 className="font-brand text-5xl leading-[0.92] text-[#2f2530] sm:text-6xl">{copy.title}</h1>
          <p className="max-w-[62ch] text-base leading-7 text-[#665666]">{copy.subtitle}</p>
          <p className="text-sm font-medium text-[#8a6b7e]">{copy.trustLine}</p>
        </section>

        <FilterBar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={(category) => {
            setActiveCategory(category);
            setMobileFiltersOpen(false);
          }}
          sortValue={sortBy}
          onSortChange={setSortBy}
          allLabel={copy.categoryAll}
          sortLabel={copy.sortLabel}
          mobileFiltersLabel={copy.mobileFilters}
          onOpenMobileFilters={() => setMobileFiltersOpen(true)}
          sortOptions={sortOptions}
        />

        <section className="grid gap-4 sm:grid-cols-3">
          {merchandising.map((block) => (
            <article key={block.id} className="rounded-3xl border border-[#ece0e8] bg-white/80 p-4">
              <p className="type-overline text-[#9a7890]">{block.title}</p>
              <p className="mt-1 text-sm text-[#675667]">{block.description}</p>
              <div className="mt-3 space-y-1.5">
                {block.items.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(localizePath(`/shop/${item.id}`))}
                    className="flex w-full items-center justify-between rounded-xl border border-[#f0e4ec] bg-white px-3 py-2 text-left text-sm text-[#2f2530]"
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="ml-3 shrink-0 text-xs text-[#8a6b7e]">{formatPrice(item.price, language)}</span>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section>
          {loading ? (
            <div className="rounded-3xl border border-[#eadde5] bg-white/85 px-6 py-14 text-center text-[#6f5d6d]">{copy.loading}</div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              language={language}
              primaryCta={copy.addToCart}
              secondaryCta={copy.addToBooking}
              showSecondaryCta={Boolean(activeBookingSession)}
              benefitLabel={copy.benefitLabel}
              bestSellerLabel={copy.bestSeller}
              emptyText={copy.emptyProducts}
              onAddToCart={handleAddToCart}
              onAddToBooking={handleAddToBooking}
              onOpenProduct={(product) => router.push(localizePath(`/shop/${product.id}`))}
            />
          )}
        </section>
      </main>

      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="btn-primary btn-primary-md fixed bottom-5 right-5 z-[80] inline-flex items-center gap-2"
      >
        <ShoppingBag className="h-4 w-4" />
        {copy.cartButton} ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
      </button>

      <div className="fixed bottom-24 right-5 z-[75] rounded-full bg-white/92 px-4 py-2 text-sm font-medium text-[#5f4f5f] shadow-[0_12px_24px_-20px_rgba(64,39,58,0.35)]">
        {copy.cartSummary}: {formatPrice(cartTotal, language)}
      </div>

      {checkoutError && (
        <div className="fixed left-1/2 top-24 z-[96] -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {checkoutError}
        </div>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        language={language}
        productsById={productsById}
        items={cartItems}
        total={cartTotal}
        email={email}
        onEmailChange={setEmail}
        onQuantityChange={updateQuantity}
        onCheckout={handleCheckout}
        checkoutDisabled={cartItems.length === 0 || isPaying}
        isPaying={isPaying}
        copy={{
          title: copy.cartTitle,
          empty: copy.cartEmpty,
          total: copy.cartTotal,
          email: copy.cartEmail,
          checkout: copy.checkout,
          redirecting: copy.redirecting,
          close: copy.close,
          emailPlaceholder: copy.emailPlaceholder,
        }}
      />

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[85] md:hidden">
          <button type="button" className="absolute inset-0 bg-[#1f141d]/40" onClick={() => setMobileFiltersOpen(false)} aria-label={copy.close} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[26px] border border-[#ead9e3] bg-white p-5">
            <FilterBar
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={(category) => {
                setActiveCategory(category);
                setMobileFiltersOpen(false);
              }}
              sortValue={sortBy}
              onSortChange={setSortBy}
              allLabel={copy.categoryAll}
              sortLabel={copy.sortLabel}
              mobileFiltersLabel={copy.mobileFilters}
              onOpenMobileFilters={() => setMobileFiltersOpen(false)}
              sortOptions={sortOptions}
            />
          </div>
        </div>
      )}
    </div>
  );
}
