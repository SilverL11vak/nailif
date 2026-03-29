'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/hooks/use-cart';
import { useBookingStore } from '@/store/booking-store';
import { FavoriteHeartIcon } from '@/components/ui/FavoriteHeartIcon';
import { Globe, ArrowLeft, Package } from 'lucide-react';
import { trackEvent } from '@/lib/behavior-tracking';
import { recommendProductsForService, type CareProductLite } from '@/lib/care-funnel';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category?: string;
  isPopular?: boolean;
}

type ShopMemory = {
  lastProductIds: string[];
  lastServiceCategory: string | null;
  lastServiceName?: string | null;
  updatedAt: number;
};

const SHOP_MEMORY_KEY = 'nailify_shop_memory_v1';
const GIFT_THRESHOLD_EUR = 70;

function normalize(value?: string | null) {
  return (value ?? '').toLowerCase();
}

export default function ShopPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage, localizePath, t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [hasCartIntent, setHasCartIntent] = useState(false);
  const [activeJourney, setActiveJourney] = useState<'all' | 'care' | 'strength' | 'lasting' | 'design'>('all');
  const [upsellSuggestion, setUpsellSuggestion] = useState<{ sourceName: string; product: Product } | null>(null);
  const [showExitRecovery, setShowExitRecovery] = useState(false);
  const [memory, setMemory] = useState<ShopMemory | null>(null);
  const [careProfile, setCareProfile] = useState<{ lastServiceName?: string; lastServiceCategory?: string } | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(true);
  const openedCartOnceRef = useRef(false);
  const recoveryTimeoutRef = useRef<number | null>(null);
  const { favoritesCount } = useFavorites();
  const { items: cart, addToCart, setCartItems } = useCart();
  const bookedServiceCategory = useBookingStore((s) => s.selectedService?.category ?? null);
  const bookedServiceName = useBookingStore((s) => s.selectedService?.name ?? null);

  const copy = {
    eyebrow: t('shopPage.eyebrow'),
    title: t('shopPage.title'),
    subtitle: t('shopPage.subtitle'),
    loading: t('shopPage.loading'),
    addToCart: t('shopPage.addToCart'),
    cart: t('shopPage.cart'),
    yourItems: t('shopPage.yourItems'),
    empty: t('shopPage.empty'),
    email: t('shopPage.email'),
    total: t('shopPage.total'),
    checkout: t('shopPage.checkout'),
    redirecting: t('shopPage.redirecting'),
    checkoutError: t('shopPage.checkoutError'),
    fallbackBrand: t('shopPage.fallbackBrand'),
    viewDetails: t('shopPage.viewDetails'),
    favorites: t('shopPage.favorites'),
    backToHome: t('shopPage.backToHome'),
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
  };


  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const response = await fetch(`/api/products?lang=${language}`);
        if (!response.ok) throw new Error('Failed to load products');
        const data = (await response.json()) as { products?: Product[] };
        if (mounted) setProducts(data.products ?? []);
      } catch (errorLoad) {
        console.error(errorLoad);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [language]);

  useEffect(() => {
    if (cart.length > 0) setHasCartIntent(true);
  }, [cart.length]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SHOP_MEMORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ShopMemory;
      if (!parsed?.updatedAt || !Array.isArray(parsed.lastProductIds)) return;
      setMemory(parsed);
    } catch {
      // ignore storage issues
    }
    try {
      const profileRaw = localStorage.getItem('nailify_care_profile_v1');
      if (profileRaw) setCareProfile(JSON.parse(profileRaw) as { lastServiceName?: string; lastServiceCategory?: string });
    } catch {
      // ignore storage issues
    }
  }, []);

  useEffect(() => {
    const payload: ShopMemory = {
      lastProductIds: cart.map((item) => item.productId).slice(0, 8),
      lastServiceCategory: bookedServiceCategory,
      lastServiceName: bookedServiceName,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(SHOP_MEMORY_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage issues
    }
    setMemory(payload);
  }, [bookedServiceCategory, bookedServiceName, cart]);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const product = productsById.get(item.productId);
        if (!product) return sum;
        return sum + product.price * item.quantity;
      }, 0),
    [cart, productsById],
  );

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(cart.filter((item) => item.productId !== productId));
      return;
    }
    setCartItems(cart.map((item) => (item.productId === productId ? { ...item, quantity } : item)));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setError(null);
    setIsPaying(true);
    trackEvent('shop_checkout_start');
    if (cart.length > 0) {
      try {
        const payload: ShopMemory = {
          lastProductIds: cart.map((item) => item.productId).slice(0, 8),
          lastServiceCategory: bookedServiceCategory,
          lastServiceName: bookedServiceName,
          updatedAt: Date.now(),
        };
        localStorage.setItem(SHOP_MEMORY_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    }
    try {
      const response = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, customerEmail: email || undefined }),
      });
      if (!response.ok) throw new Error('Checkout failed');
      const data = (await response.json()) as { checkoutUrl?: string };
      if (!data.checkoutUrl) throw new Error('Missing checkout URL');
      window.location.href = data.checkoutUrl;
    } catch (checkoutError) {
      console.error(checkoutError);
      setError(copy.checkoutError);
      setIsPaying(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        window.clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);

  const openMobileCart = () => {
    openedCartOnceRef.current = true;
    setShowExitRecovery(false);
    setMobileCartOpen(true);
  };

  const closeMobileCart = () => {
    setMobileCartOpen(false);
    if (!openedCartOnceRef.current || cart.length === 0) return;
    if (recoveryTimeoutRef.current) window.clearTimeout(recoveryTimeoutRef.current);
    recoveryTimeoutRef.current = window.setTimeout(() => {
      setShowExitRecovery(true);
      window.setTimeout(() => setShowExitRecovery(false), 4200);
    }, 1800);
  };

  const featuredProduct = useMemo(() => products.find((p) => p.isPopular) ?? products[0], [products]);
  const filteredProducts = useMemo(() => {
    if (activeJourney === 'all') return products;
    const normalize = (v?: string) => (v ?? '').toLowerCase();
    const mapByJourney: Record<'care' | 'strength' | 'lasting' | 'design', string[]> = {
      care: ['care', 'aftercare', 'hooldus', 'järjelhooldus', 'jarelhooldus', 'treatment'],
      strength: ['strength', 'repair', 'reinforce', 'tugevdus'],
      lasting: ['lasting', 'durability', 'püsivus', 'pusivus'],
      design: ['design', 'color', 'style', 'disain'],
    };
    const keys = mapByJourney[activeJourney];
    return products.filter((product) => {
      const c = normalize(product.category);
      const text = `${normalize(product.name)} ${normalize(product.description)}`;
      return keys.some((k) => c.includes(k) || text.includes(k));
    });
  }, [activeJourney, products]);

  const quickReorderProducts = useMemo(() => {
    if (!memory?.lastProductIds?.length) return [];
    return memory.lastProductIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, 4);
  }, [memory, products]);

  const bookingMatchedProducts = useMemo(() => {
    const sourceName = bookedServiceName ?? careProfile?.lastServiceName ?? null;
    const sourceCategory = bookedServiceCategory ?? careProfile?.lastServiceCategory ?? null;
    if (!sourceName && !sourceCategory) return [];
    return recommendProductsForService(
      products,
      { name: sourceName ?? '', category: sourceCategory ?? '' },
      4,
      []
    );
  }, [bookedServiceCategory, bookedServiceName, careProfile, products]);

  const bundles = useMemo(() => {
    const makeBundle = (
      id: string,
      titleEt: string,
      titleEn: string,
      descEt: string,
      descEn: string,
      productIds: string[],
      save: number
    ) => {
      const items = productIds
        .map((pid) => products.find((p) => p.id === pid))
        .filter((p): p is Product => Boolean(p));
      if (items.length < 2) return null;
      const total = items.reduce((sum, item) => sum + item.price, 0);
      return {
        id,
        title: language === 'en' ? titleEn : titleEt,
        desc: language === 'en' ? descEn : descEt,
        items,
        total,
        save,
      };
    };

    return [
      makeBundle(
        'starter',
        'Starter Care komplekt',
        'Starter Care Bundle',
        'Topcoat + õli + tugevdav tugi',
        'Topcoat + oil + strengthening support',
        ['gloss-protect-topcoat', 'cuticle-oil-rose', 'nail-strength-serum'],
        8
      ),
      makeBundle(
        'luxury',
        'Luxury Maintenance komplekt',
        'Luxury Maintenance Bundle',
        'Seerum + mask + taastav hooldus',
        'Serum + mask + repair care',
        ['nail-strength-serum', 'silk-hand-cream', 'keratin-repair-balm'],
        8
      ),
    ].filter((b): b is NonNullable<typeof b> => Boolean(b));
  }, [language, products]);

  const deliveryEmotion = useMemo(
    () =>
      t('_auto.app_shop_page.p269'),
    [language]
  );

  const giftLine = t('_auto.app_shop_page.p270');

  const getUpsellSuggestion = (added: Product | CareProductLite): Product | null => {
    const addedText = `${normalize(added.name)} ${normalize(added.category)} ${normalize(added.description)}`;
    const preferredKeywords = addedText.includes('repair') || addedText.includes('taast')
      ? ['serum', 'seerum', 'strength', 'tugev', 'durability', 'püsiv']
      : addedText.includes('topcoat') || addedText.includes('finish') || addedText.includes('viimist')
        ? ['oil', 'õli', 'repair', 'taast', 'mask']
        : ['serum', 'seerum', 'oil', 'õli', 'topcoat', 'viimist'];

    const inCart = new Set(cart.map((item) => item.productId));
    return (
      products.find((candidate) => {
        if (candidate.id === added.id || inCart.has(candidate.id)) return false;
        const text = `${normalize(candidate.name)} ${normalize(candidate.description)} ${normalize(candidate.category)}`;
        return preferredKeywords.some((kw) => text.includes(kw));
      }) ?? null
    );
  };

  const handleAddToCart = (product: Product | CareProductLite) => {
    setHasCartIntent(true);
    addToCart(product.id, 1, product.price);
    const upsell = getUpsellSuggestion(product);
    if (upsell) {
      setUpsellSuggestion({ sourceName: product.name, product: upsell });
    }
  };

  const addBundleToCart = (bundleItems: Product[]) => {
    setHasCartIntent(true);
    for (const item of bundleItems) {
      addToCart(item.id, 1, item.price);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff6fb_40%,_#fffafc_100%)]">
      {/* Store navigation bar */}
      <header className="sticky top-0 z-50 border-b border-[#f1e1ea] bg-white/92 backdrop-blur-xl shadow-[0_18px_38px_-30px_rgba(97,48,85,0.12)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link
                href={localizePath('/')}
                className="font-brand text-2xl font-semibold leading-none tracking-tight text-[#c24d86] hover:text-[#a93d71] lg:text-3xl"
              >
                Nailify
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href={localizePath('/')} className="text-sm font-medium text-[#584a58] hover:text-[#2f2530] transition-colors">
                  {copy.nav.home}
                </Link>
                <Link href={`${localizePath('/')}#services`} className="text-sm font-medium text-[#584a58] hover:text-[#2f2530] transition-colors">
                  {copy.nav.services}
                </Link>
                <Link href={`${localizePath('/')}#gallery`} className="text-sm font-medium text-[#584a58] hover:text-[#2f2530] transition-colors">
                  {copy.nav.gallery}
                </Link>
                <span className="text-sm font-semibold text-[#2f2530]">{copy.nav.shop}</span>
                <Link href={`${localizePath('/')}#location`} className="text-sm font-medium text-[#584a58] hover:text-[#2f2530] transition-colors">
                  {copy.nav.contact}
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setLangMenuOpen((o) => !o)}
                  className="icon-circle-btn"
                  aria-label={copy.languageMenuLabel}
                >
                  <Globe size={18} strokeWidth={1.8} />
                </button>
                {langMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} aria-hidden />
                    <div className="absolute right-0 top-12 z-50 w-36 rounded-xl border border-[#ecdce6] bg-white p-1.5 shadow-lg">
                      <button
                        onClick={() => {
                          setLanguage('et');
                          router.push(localizePath(pathname, 'et'));
                          setLangMenuOpen(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm ${language === 'et' ? 'bg-[#fff2f9] font-medium text-[#6a3b57]' : 'text-[#5f4f5f] hover:bg-[#fff7fc]'}`}
                      >
                        {copy.languageEt}
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('en');
                          router.push(localizePath(pathname, 'en'));
                          setLangMenuOpen(false);
                        }}
                        className={`mt-0.5 w-full rounded-lg px-3 py-2 text-left text-sm ${language === 'en' ? 'bg-[#fff2f9] font-medium text-[#6a3b57]' : 'text-[#5f4f5f] hover:bg-[#fff7fc]'}`}
                      >
                        {copy.languageEn}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <Link
                href={localizePath('/favorites')}
                className="icon-circle-btn relative"
                aria-label={copy.favorites}
              >
                <FavoriteHeartIcon active={favoritesCount > 0} size={18} />
                {favoritesCount > 0 && (
                  <span className="absolute right-0 top-0 inline-flex min-h-[18px] min-w-[18px] translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-[#c24d86] px-1 text-[10px] font-semibold leading-none text-white shadow-[0_10px_18px_-12px_rgba(194,77,134,0.85)]">
                    {favoritesCount > 9 ? '9+' : favoritesCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => router.push(localizePath('/book'))}
                className="btn-primary btn-primary-md hidden md:inline-flex"
              >
                {copy.nav.book}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-[92px] px-4 sm:px-6 lg:px-10 lg:pb-0">
        <div className="mx-auto max-w-7xl">
          <section className="pb-8 pt-7 sm:pt-9 lg:pb-10 lg:pt-10">
            <div className="grid items-start gap-6 rounded-[24px] border border-[#efe3e9] bg-[linear-gradient(180deg,#fff_0%,#fff8fc_100%)] p-5 shadow-[0_18px_44px_-32px_rgba(95,63,86,0.2)] sm:p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-7">
              <div>
                <Link
                  href={localizePath('/')}
                  className="btn-secondary btn-secondary-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {copy.backToHome}
                </Link>

                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6b7e]">
                  {t('_auto.app_shop_page.p272')}
                </p>
                <h1 className="mt-2 font-brand text-[2rem] font-semibold leading-[1.08] tracking-[-0.02em] text-[#1f171d] sm:text-[2.4rem]">
                  {t('_auto.app_shop_page.p273')}
                </h1>
                <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-[#5f4c59] sm:text-[15px]">
                  {t('_auto.app_shop_page.p274')}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    t('_auto.app_shop_page.p275'),
                    t('_auto.app_shop_page.p276'),
                    t('_auto.app_shop_page.p277'),
                  ].map((label) => (
                    <span key={label} className="pill-meta min-h-[34px] px-3 text-[11px]">
                      <span className="text-[#c24d86]">✓</span>
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#eadce5] bg-white p-4 shadow-[0_16px_34px_-24px_rgba(60,40,55,0.28)]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6b7e]">
                    {t('_auto.app_shop_page.p278')}
                  </p>
                  <span className="pill-tag min-h-[28px] px-2.5 text-[10px]">
                    {t('_auto.app_shop_page.p279')}
                  </span>
                </div>
                {featuredProduct ? (
                  <button
                    type="button"
                    onClick={() => router.push(localizePath(`/shop/${featuredProduct.id}`))}
                    className="group w-full text-left"
                  >
                    <div className="relative aspect-[16/11] overflow-hidden rounded-[16px] bg-[#f8edf4]">
                      {featuredProduct.imageUrl ? (
                        <Image
                          src={featuredProduct.imageUrl}
                          alt={featuredProduct.name}
                          fill
                          priority
                          unoptimized
                          sizes="(max-width: 1024px) 100vw, 480px"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#9d7a90]">
                          <Package className="h-8 w-8 opacity-60" />
                        </div>
                      )}
                    </div>
                    <h2 className="mt-3 text-[16px] font-semibold text-[#2f2530]">{featuredProduct.name}</h2>
                    <p className="mt-1 text-[13px] text-[#6f5d6d]">
                      {t('_auto.app_shop_page.p280')}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[20px] font-semibold tracking-[-0.02em] text-[#2f2530]">€{featuredProduct.price}</span>
                      <span className="pill-tag min-h-[28px] px-3 text-[11px]">
                        {t('_auto.app_shop_page.p281')}
                      </span>
                    </div>
                  </button>
                ) : (
                  <p className="text-sm text-[#7a6a72]">{copy.loading}</p>
                )}
              </div>
            </div>
          </section>

          <section className="pb-7">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  id: 'care' as const,
                  title: t('_auto.app_shop_page.p282'),
                  desc: t('_auto.app_shop_page.p283'),
                },
                {
                  id: 'strength' as const,
                  title: t('_auto.app_shop_page.p284'),
                  desc: t('_auto.app_shop_page.p285'),
                },
                {
                  id: 'lasting' as const,
                  title: t('_auto.app_shop_page.p286'),
                  desc: t('_auto.app_shop_page.p287'),
                },
                {
                  id: 'design' as const,
                  title: t('_auto.app_shop_page.p288'),
                  desc: t('_auto.app_shop_page.p289'),
                },
              ].map((journey) => {
                const active = activeJourney === journey.id;
                return (
                  <button
                    key={journey.id}
                    type="button"
                    onClick={() => setActiveJourney((p) => (p === journey.id ? 'all' : journey.id))}
                    className={`rounded-[16px] border p-4 text-left transition-all ${
                      active
                        ? 'border-[#d8bccb] bg-[#fff8fb] shadow-[0_12px_24px_-20px_rgba(159,69,111,0.28)]'
                        : 'border-[#ece3e8] bg-white hover:border-[#dfd0d9]'
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9c8a96]">
                      {t('_auto.app_shop_page.p290')}
                    </p>
                    <p className="mt-1 text-[16px] font-semibold text-[#2f2530]">{journey.title}</p>
                    <p className="mt-1 text-[12px] text-[#6f5d6d]">{journey.desc}</p>
                    <p className="mt-3 text-[11px] font-semibold text-[#7a4563]">{t('_auto.app_shop_page.p291')}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {quickReorderProducts.length > 0 && (
            <section className="pb-7">
              <div className="rounded-[18px] border border-[#ece2e8] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9d7a90]">
                  {t('_auto.app_shop_page.p292')}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {quickReorderProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className="rounded-[14px] border border-[#efe4ea] bg-[#fffbfd] p-3 text-left transition-colors hover:border-[#decbd6]"
                    >
                      <p className="line-clamp-2 text-[12px] font-semibold text-[#2f2530]">{product.name}</p>
                      <p className="mt-1 text-[11px] text-[#7a6a72]">€{product.price}</p>
                      <p className="mt-2 text-[10px] font-semibold text-[#7a4563]">
                        {t('_auto.app_shop_page.p293')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {bookingMatchedProducts.length > 0 && (
            <section className="pb-7">
              <div className="rounded-[18px] border border-[#ece2e8] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9d7a90]">
                  {t('_auto.app_shop_page.p294')}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {bookingMatchedProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className="rounded-[14px] border border-[#efe4ea] bg-[#fffbfd] p-3 text-left transition-colors hover:border-[#decbd6]"
                    >
                      <p className="line-clamp-2 text-[12px] font-semibold text-[#2f2530]">{product.name}</p>
                      <p className="mt-1 text-[11px] text-[#7a6a72]">€{product.price}</p>
                      <p className="mt-2 text-[10px] font-semibold text-[#7a4563]">
                        {t('_auto.app_shop_page.p295')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {bundles.length > 0 && (
            <section className="pb-7">
              <div className="grid gap-3 lg:grid-cols-2">
                {bundles.map((bundle) => (
                  <div key={bundle.id} className="rounded-[18px] border border-[#e7d4df] bg-[linear-gradient(180deg,#fff_0%,#fff8fc_100%)] p-4 shadow-[0_14px_30px_-24px_rgba(95,63,86,0.24)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9d7a90]">
                          {t('_auto.app_shop_page.p296')}
                        </p>
                        <h3 className="mt-1 font-brand text-[22px] font-semibold leading-[1.1] text-[#2f2530]">{bundle.title}</h3>
                        <p className="mt-1 text-[12px] text-[#6f5d6d]">{bundle.desc}</p>
                      </div>
                      <span className="pill-tag min-h-[28px] px-2.5 text-[10px]">
                        {language === 'en' ? `Save €${bundle.save}` : `Säästad €${bundle.save}`}
                      </span>
                    </div>
                    <p className="mt-3 text-[12px] text-[#7a6a72]">{bundle.items.map((i) => i.name).join(' · ')}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[16px] font-semibold text-[#2f2530]">€{bundle.total}</p>
                      <button
                        type="button"
                        onClick={() => addBundleToCart(bundle.items)}
                        className="btn-primary btn-small px-4 text-[12px]"
                      >
                        {t('_auto.app_shop_page.p297')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-8 lg:grid-cols-[1fr_336px]">
            <section className="rounded-[22px] border border-[#ece2e8] bg-white p-4 shadow-[0_16px_34px_-28px_rgba(95,63,86,0.24)] sm:p-5">
              {isLoading ? (
                <p className="py-12 text-center text-[#7d685d]">{copy.loading}</p>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <Package className="h-12 w-12 text-[#d4b8c8]" />
                  <p className="mt-3 text-[#6b7280]">
                    {t('_auto.app_shop_page.p298')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveJourney('all')}
                    className="btn-secondary btn-secondary-sm mt-3"
                  >
                    {t('_auto.app_shop_page.p299')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <article
                      key={product.id}
                      className="group rounded-[18px] border border-[#ece3e8] bg-white p-3 shadow-[0_10px_24px_-20px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#dfcdd6]"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-[#f7eef4]">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            unoptimized
                            loading="lazy"
                            sizes="(max-width: 640px) 48vw, (max-width: 1200px) 30vw, 260px"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#9d7a90]">
                            <Package className="h-8 w-8 opacity-55" />
                          </div>
                        )}
                        {product.isPopular && (
                          <span className="pill-tag absolute left-2 top-2 min-h-[26px] px-2 text-[10px]">
                            {t('_auto.app_shop_page.p300')}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-[15px] font-semibold leading-snug text-[#2f2530]">{product.name}</h3>
                      <p className="mt-1 line-clamp-2 text-[12px] text-[#6f5d6d]">{product.description}</p>
                      <p className="mt-1 text-[10px] font-medium text-[#8a6b7e]">
                        {product.isPopular
                          ? (t('_auto.app_shop_page.p301'))
                          : normalize(product.category).includes('repair')
                            ? (t('_auto.app_shop_page.p302'))
                            : (t('_auto.app_shop_page.p303'))}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[18px] font-semibold tracking-[-0.02em] text-[#2f2530]">€{product.price}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className="btn-primary btn-small mt-3 w-full text-[12px]"
                      >
                        {copy.addToCart}
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(localizePath(`/shop/${product.id}`))}
                        className="btn-secondary btn-small mt-2 w-full text-[12px]"
                      >
                        {copy.viewDetails}
                      </button>
                      <p className="mt-2 text-[10px] text-[#94828f]">
                        ✓ {t('_auto.app_shop_page.p304')}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="sticky top-24 hidden h-fit rounded-[20px] border border-[#ece2e8] bg-white/95 p-5 shadow-[0_24px_48px_-34px_rgba(95,63,86,0.2)] backdrop-blur-sm lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9d7a90]">{copy.cart}</p>
              <h2 className="mt-1 text-xl font-semibold text-[#2f2530]">{copy.yourItems}</h2>

              <div className="mt-4 space-y-3">
                {cart.length === 0 && <p className="text-sm text-[#6b7280]">{copy.empty}</p>}
                {cart.map((item) => {
                  const product = productsById.get(item.productId);
                  if (!product) return null;
                  return (
                    <div key={item.productId} className="rounded-2xl border border-[#f0e2eb] bg-[#fef9fc] p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#2f2530]">{product.name}</p>
                        <span className="shrink-0 text-sm font-semibold text-[#2f2530]">€{product.price * item.quantity}</span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="icon-circle-btn h-9 w-9 min-h-[36px] min-w-[36px] text-[#6b7280]"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-sm font-semibold text-[#374151]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="icon-circle-btn h-9 w-9 min-h-[36px] min-w-[36px] text-[#6b7280]"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs font-medium text-[#8a6b7e]">
                          {t('_auto.app_shop_page.p305')} × {product.price}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <label className="mt-5 block text-sm font-medium text-[#4b5563]">
                {copy.email}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@email.com"
                  className="mt-1.5 w-full rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none focus:ring-1 focus:ring-[#c24d86]/20"
                />
              </label>

              <div className="mt-5 rounded-2xl border border-[#f0e2eb] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#6b7280]">{copy.total}</span>
                  <span className="text-xl font-semibold tracking-[-0.02em] text-[#2f2530]">€{cartTotal}</span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-[#8a6b7e]">
                  {deliveryEmotion}
                </p>
                {cartTotal >= GIFT_THRESHOLD_EUR && (
                  <p className="mt-2 rounded-lg bg-[#fff6fb] px-2.5 py-2 text-[11px] font-medium text-[#7a4563]">{giftLine}</p>
                )}
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isPaying}
                className="btn-primary btn-primary-lg mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPaying ? copy.redirecting : copy.checkout}
              </button>

              {featuredProduct && (
                <div className="mt-5 rounded-2xl border border-[#ecdfe7] bg-[#fef9fc] p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9d7a90]">
                    {t('_auto.app_shop_page.p306')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#2f2530]">{featuredProduct.name}</p>
                  <p className="mt-0.5 text-xs text-[#7a6a72]">
                    {t('_auto.app_shop_page.p307')}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#2f2530]">€{featuredProduct.price}</span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(featuredProduct)}
                      className="btn-secondary btn-small px-3 text-[11px]"
                    >
                      {copy.addToCart}
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      {upsellSuggestion && (
        <div className="fixed inset-x-0 bottom-[86px] z-[65] px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[360px] lg:inset-x-auto">
          <div className="shop-upsell-enter rounded-[16px] border border-[#ecdde6] bg-white/95 p-3 shadow-[0_20px_34px_-24px_rgba(60,40,55,0.35)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9d7a90]">
                  {t('_auto.app_shop_page.p308')}
                </p>
                <p className="mt-1 text-[12px] text-[#5f4c59]">
                  {language === 'en'
                    ? `After ${upsellSuggestion.sourceName}, technicians often add this for longer durability.`
                    : `${upsellSuggestion.sourceName} järel soovitame seda pikemaks püsivuseks.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUpsellSuggestion(null)}
                className="text-[11px] font-medium text-[#8a6b7e]"
              >
                {t('_auto.app_shop_page.p309')}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-[#efe3e9] bg-[#fffafd] px-3 py-2">
              <p className="truncate text-[12px] font-semibold text-[#2f2530]">{upsellSuggestion.product.name}</p>
              <span className="text-[12px] font-semibold text-[#2f2530]">€{upsellSuggestion.product.price}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                handleAddToCart(upsellSuggestion.product);
                setUpsellSuggestion(null);
              }}
              className="btn-primary btn-small mt-2 w-full text-[12px]"
            >
              {t('_auto.app_shop_page.p310')}
            </button>
          </div>
        </div>
      )}

      {advisorOpen && (
        <button
          type="button"
          onClick={() => {
            setAdvisorOpen(false);
            if (bundles.length > 0) setActiveJourney('lasting');
          }}
          className="pill-meta fixed bottom-[162px] right-4 z-[62] hidden min-h-[40px] px-4 text-[12px] lg:inline-flex"
        >
          {t('_auto.app_shop_page.p311')}
        </button>
      )}

      {showExitRecovery && (
        <div className="fixed left-1/2 top-[86px] z-[75] -translate-x-1/2 rounded-[14px] border border-[#eadce4] bg-white px-4 py-2 text-[12px] font-medium text-[#6a3b57] shadow-[0_16px_28px_-20px_rgba(60,40,55,0.32)]">
          {t('_auto.app_shop_page.p312')}
        </div>
      )}

      {/* Mobile: intent-based sticky cart summary + slide-up panel */}
      {hasCartIntent && (
        <div className="fixed inset-x-0 bottom-0 z-[55] border-t border-[#f0e2eb] bg-white/72 backdrop-blur-xl shadow-[0_-18px_36px_-26px_rgba(60,40,55,0.26)] lg:hidden">
          <div className="mx-auto flex h-[72px] max-w-7xl items-center px-4">
            <button
              type="button"
              onClick={openMobileCart}
              className="flex w-full items-center justify-between rounded-[14px] border border-[#ecdfe7] bg-white/95 px-4 py-2.5 text-left"
              aria-label={t('_auto.app_shop_page.p313')}
            >
              <div>
                <p className="text-[12px] font-semibold text-[#2f2530]">
                  {cart.length} {t('_auto.app_shop_page.p314')}
                </p>
                <p className="text-[11px] text-[#8a6b7e]">{copy.total} €{cartTotal}</p>
              </div>
              <span className="pill-tag min-h-[28px] px-3 text-[11px]">
                {t('_auto.app_shop_page.p315')}
              </span>
            </button>
          </div>
        </div>
      )}

      {mobileCartOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#1f141d]/45"
            onClick={closeMobileCart}
            aria-label="Close cart overlay"
          />
          <aside className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[28px] border border-[#ecdfe7] bg-white p-5 shadow-[0_-30px_60px_-40px_rgba(60,40,55,0.55)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9d7a90]">{copy.cart}</p>
                <h3 className="mt-1 text-lg font-semibold text-[#2f2530]">{copy.yourItems}</h3>
              </div>
              <button
                type="button"
                onClick={closeMobileCart}
                className="icon-circle-btn"
                aria-label="Close cart"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {cart.length === 0 && <p className="text-sm text-[#6b7280]">{copy.empty}</p>}
              {cart.map((item) => {
                const product = productsById.get(item.productId);
                if (!product) return null;
                return (
                  <div key={item.productId} className="rounded-2xl border border-[#f0e2eb] bg-[#fef9fc] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#2f2530]">{product.name}</p>
                      <span className="shrink-0 text-sm font-semibold text-[#2f2530]">€{product.price * item.quantity}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="icon-circle-btn h-10 w-10 min-h-[40px] min-w-[40px] text-[#6b7280]"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-[#374151]">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="icon-circle-btn h-10 w-10 min-h-[40px] min-w-[40px] text-[#6b7280]"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs font-medium text-[#8a6b7e]">
                        {t('_auto.app_shop_page.p316')} × {product.price}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="mt-5 block text-sm font-medium text-[#4b5563]">
              {copy.email}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@email.com"
                className="mt-1.5 w-full rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none focus:ring-1 focus:ring-[#c24d86]/20"
              />
            </label>

            <div className="mt-5 rounded-2xl border border-[#f0e2eb] bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#6b7280]">{copy.total}</span>
                <span className="text-xl font-semibold tracking-[-0.02em] text-[#2f2530]">€{cartTotal}</span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[#8a6b7e]">
                {deliveryEmotion}
              </p>
              {cartTotal >= GIFT_THRESHOLD_EUR && (
                <p className="mt-2 rounded-lg bg-[#fff6fb] px-2.5 py-2 text-[11px] font-medium text-[#7a4563]">{giftLine}</p>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isPaying}
              className="btn-primary btn-primary-lg mt-4 w-full disabled:opacity-50"
            >
              {isPaying ? copy.redirecting : copy.checkout}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
