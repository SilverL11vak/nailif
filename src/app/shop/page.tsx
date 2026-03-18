'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/hooks/use-cart';
import { FavoriteHeartIcon } from '@/components/ui/FavoriteHeartIcon';
import { Globe, ArrowLeft, Package, ShoppingBag } from 'lucide-react';
import { trackEvent } from '@/lib/behavior-tracking';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category?: string;
  isPopular?: boolean;
}

export default function ShopPage() {
  const router = useRouter();
  const { language, setLanguage, localizePath } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const { favoritesCount, isFavorite, toggleFavorite } = useFavorites();
  const { items: cart, addToCart, setCartItems } = useCart();

  const copy = useMemo(
    () =>
      language === 'en'
        ? {
            eyebrow: 'Nailify Shop',
            title: 'Premium care products',
            subtitle: 'Curated aftercare for salon-level results at home.',
            loading: 'Loading products...',
            addToCart: 'Add to bag',
            cart: 'Cart',
            yourItems: 'Your items',
            empty: 'Your cart is empty.',
            email: 'Email (optional)',
            total: 'Total',
            checkout: 'Checkout with Stripe',
            redirecting: 'Redirecting...',
            checkoutError: 'Checkout failed. Please configure Stripe keys and try again.',
            fallbackBrand: 'Nailify',
            viewDetails: 'View details',
            favorites: 'Favourites',
            backToHome: 'Back to home',
            nav: { home: 'Home', services: 'Services', gallery: 'Gallery', shop: 'Shop', contact: 'Contact', book: 'Book now' },
          }
        : {
            eyebrow: 'Nailify pood',
            title: 'Premium hooldustooted',
            subtitle: 'Hoolikalt valitud järelhooldus salongitulemuse hoidmiseks kodus.',
            loading: 'Laen tooteid...',
            addToCart: 'Lisa korvi',
            cart: 'Ostukorv',
            yourItems: 'Sinu tooted',
            empty: 'Ostukorv on tühi.',
            email: 'E-post (valikuline)',
            total: 'Kokku',
            checkout: 'Maksa Stripega',
            redirecting: 'Suunan maksmisse...',
            checkoutError: 'Maksmine ebaonnestus. Kontrolli Stripe seadeid ja proovi uuesti.',
            fallbackBrand: 'Nailify',
            viewDetails: 'Vaata detaile',
            favorites: 'Lemmikud',
            backToHome: 'Tagasi avalehele',
            nav: { home: 'Avaleht', services: 'Teenused', gallery: 'Galerii', shop: 'Pood', contact: 'Kontakt', book: 'Broneeri' },
          },
    [language],
  );

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

  const featuredProduct = useMemo(() => products.find((p) => p.isPopular) ?? products[0], [products]);

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
                  className="type-navbar-icon-btn"
                  aria-label="Language"
                >
                  <Globe size={18} strokeWidth={1.8} />
                </button>
                {langMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} aria-hidden />
                    <div className="absolute right-0 top-12 z-50 w-36 rounded-xl border border-[#ecdce6] bg-white p-1.5 shadow-lg">
                      <button
                        onClick={() => { setLanguage('et'); setLangMenuOpen(false); }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm ${language === 'et' ? 'bg-[#fff2f9] font-medium text-[#6a3b57]' : 'text-[#5f4f5f] hover:bg-[#fff7fc]'}`}
                      >
                        Eesti
                      </button>
                      <button
                        onClick={() => { setLanguage('en'); setLangMenuOpen(false); }}
                        className={`mt-0.5 w-full rounded-lg px-3 py-2 text-left text-sm ${language === 'en' ? 'bg-[#fff2f9] font-medium text-[#6a3b57]' : 'text-[#5f4f5f] hover:bg-[#fff7fc]'}`}
                      >
                        English
                      </button>
                    </div>
                  </>
                )}
              </div>
              <Link
                href={localizePath('/favorites')}
                className="type-navbar-icon-btn relative"
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

      <main className="px-4 sm:px-6 lg:px-10 pb-[92px] lg:pb-0">
        <div className="mx-auto max-w-7xl">
          {/* 1) Shop hero (editorial) */}
          <section className="pt-9 pb-10 sm:pt-12 sm:pb-12 lg:pt-16 lg:pb-14">
            <div className="relative overflow-hidden rounded-[32px] border border-[#f0e2ea] bg-[linear-gradient(180deg,#fff_0%,#fff7fb_55%,#fffafc_100%)] p-5 shadow-[0_24px_60px_-42px_rgba(60,40,55,0.28)] sm:p-8 lg:p-10">
              <div className="pointer-events-none absolute -right-28 -top-24 h-80 w-80 rounded-full bg-[#f3c6da]/45 blur-[52px]" aria-hidden />
              <div className="pointer-events-none absolute -left-32 -bottom-28 h-80 w-80 rounded-full bg-[#f7ecf2] blur-[56px]" aria-hidden />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_15%,rgba(255,255,255,0.9)_0%,transparent_60%)]" aria-hidden />

              <div className="relative grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
                <div>
                  <Link
                    href={localizePath('/')}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#e8dce4] bg-white px-4 py-2.5 text-sm font-medium text-[#4b5563] shadow-sm hover:bg-[#fdf8fb] hover:border-[#dfbfd1] transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {copy.backToHome}
                  </Link>

                <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8a6b7e]">
                  {language === 'en' ? 'Studio shop' : 'Stuudio pood'}
                </p>

                <h1 className="mt-3 font-brand text-[2.35rem] font-semibold leading-[1.03] tracking-[-0.03em] text-[#1f171d] sm:text-[2.85rem] lg:text-[3.05rem]">
                  {language === 'en' ? 'Professional nail care products' : 'Professionaalsed küünehooldustooted'}
                </h1>

                <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-[#5f4c59] sm:text-[16px]">
                  {language === 'en'
                    ? 'Trusted by our studio specialists. Curated aftercare for salon-level results at home.'
                    : 'Stuudio spetsialistide poolt usaldatud. Valitud järelhooldus, et hoida salongitulemust ka kodus.'}
                </p>

                <div className="mt-6 flex flex-nowrap items-center gap-2.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[
                    language === 'en' ? 'Salon quality' : 'Salongi kvaliteet',
                    language === 'en' ? 'Safe formulas' : 'Ohutud koostised',
                    language === 'en' ? 'Fast delivery' : 'Kiire tarne',
                  ].map((label) => (
                    <span
                      key={label}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#ead8e2] bg-white/90 px-4 py-2.5 text-xs font-medium text-[#5d4a56] shadow-[0_10px_20px_-18px_rgba(60,40,55,0.18)]"
                    >
                      <span className="text-[#c24d86]">✓</span>
                      {label}
                    </span>
                  ))}
                </div>
                </div>

                {/* Right: curated guide card */}
                <div className="relative">
                  <div className="rounded-[26px] border border-[#ecdfe7] bg-white/70 p-4 shadow-[0_24px_60px_-46px_rgba(60,40,55,0.34)] backdrop-blur-md sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6b7e]">
                          {language === 'en' ? 'Curated guide' : 'Kureeritud juhis'}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#2f2530]">
                          {language === 'en' ? 'Studio picks for longer wear' : 'Stuudio valik pikemaks püsivuseks'}
                        </h2>
                      </div>
                      <span className="rounded-full border border-[#ead6e2] bg-white px-3 py-1 text-[11px] font-semibold text-[#6a3b57]">
                        {language === 'en' ? 'Expert curated' : 'Eksperdi valik'}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-[#5f4c59]">
                      {language === 'en'
                        ? 'Everything here is chosen for shine, gentleness and longevity — the same aftercare we trust between appointments.'
                        : 'Kõik siin on valitud läike, õrnuse ja püsivuse järgi — sama järelhooldus, mida soovitame ka hoolduste vahel.'}
                    </p>

                    {featuredProduct && (
                      <button
                        type="button"
                        onClick={() => router.push(localizePath(`/shop/${featuredProduct.id}`))}
                        className="group mt-5 flex w-full items-center gap-3 rounded-2xl border border-[#ead8e2] bg-white/85 p-3 text-left shadow-[0_10px_26px_-18px_rgba(60,40,55,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
                      >
                        <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-[#f8edf4]">
                          {featuredProduct.imageUrl ? (
                            <Image
                              src={featuredProduct.imageUrl}
                              alt={featuredProduct.name}
                              fill
                              unoptimized
                              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#9d7a90]">
                              <Package className="h-6 w-6 opacity-60" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#2f2530]">{featuredProduct.name}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-[#7a6677]">
                            {language === 'en' ? 'Best starter pick from the studio.' : 'Stuudio parim algusvalik.'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[13px] font-semibold text-[#b04b80]">€{featuredProduct.price}</p>
                          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6b7e]">
                            {language === 'en' ? 'View' : 'Vaata'}
                          </p>
                        </div>
                      </button>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-[#ead8e2] bg-white/70 p-4">
                        <p className="text-xs font-semibold text-[#2f2530]">{language === 'en' ? 'Aftercare' : 'Järelhooldus'}</p>
                        <p className="mt-1 text-xs text-[#7a6a72]">{language === 'en' ? 'For longer wear' : 'Pikemaks püsivuseks'}</p>
                      </div>
                      <div className="rounded-2xl border border-[#ead8e2] bg-white/70 p-4">
                        <p className="text-xs font-semibold text-[#2f2530]">{language === 'en' ? 'Tools' : 'Tarvikud'}</p>
                        <p className="mt-1 text-xs text-[#7a6a72]">{language === 'en' ? 'Gentle & precise' : 'Õrnad ja täpsed'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Product grid */}
            <section className="rounded-[28px] border border-[#ecdfe7] bg-white/92 p-5 shadow-[0_18px_42px_-30px_rgba(95,63,86,0.22)] sm:p-6">
              {isLoading ? (
                <p className="py-12 text-center text-[#7d685d]">{copy.loading}</p>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="h-14 w-14 text-[#d4b8c8]" />
                  <p className="mt-4 text-[#6b7280]">
                    {language === 'en' ? 'No products available right now.' : 'Tooteid pole hetkel saadaval.'}
                  </p>
                  <p className="mt-1 text-sm text-[#8a7a88]">
                    {language === 'en' ? 'Check back soon or contact us.' : 'Proovi hiljem uuesti või võta ühendust.'}
                  </p>
                  <Link
                    href={localizePath('/')}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f0e2eb] px-4 py-2.5 text-sm font-medium text-[#6a3b57] hover:bg-[#e8d4df]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {copy.backToHome}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] lg:gap-8">
                  {products.map((product, index) => (
                    <article
                      key={product.id}
                      className={`group rounded-[26px] bg-white p-[18px] shadow-[0_10px_32px_rgba(0,0,0,0.055)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_46px_rgba(0,0,0,0.08)] ${
                        index === 0 ? 'md:col-span-2 md:p-[20px]' : ''
                      }`}
                    >
                      <div className={`relative overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,#f8edf4_0%,#fff8fb_100%)] ${
                        index === 0 ? 'aspect-[6/5]' : 'aspect-[1/1]'
                      }`}>
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            unoptimized
                            sizes={index === 0 ? '(max-width: 768px) 100vw, 640px' : '(max-width: 640px) 50vw, 320px'}
                            className="object-cover transition-transform duration-600 ease-out group-hover:scale-[1.06]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#9d7a90]">
                            <Package className="h-10 w-10 opacity-50" />
                          </div>
                        )}

                        {product.isPopular && (
                          <span className="absolute left-3 top-3 z-10 rounded-full border border-[#f0dbe6] bg-white/92 px-3 py-1 text-[11px] font-semibold text-[#6a3b57] shadow-[0_14px_26px_-18px_rgba(60,40,55,0.22)]">
                            {language === 'en' ? 'Studio Favorite' : 'Stuudio lemmik'}
                          </span>
                        )}

                        {/* Floating icons: favourite + add-to-cart */}
                        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => toggleFavorite(product.id)}
                            className={`flex h-[42px] w-[42px] items-center justify-center rounded-full border bg-white/95 shadow-[0_10px_24px_-16px_rgba(60,40,55,0.35)] transition-transform duration-200 hover:scale-[1.05] active:scale-[0.98] ${
                              isFavorite(product.id) ? 'border-[#c24d86] text-[#c24d86]' : 'border-[#ead6e2] text-[#8f7086] hover:border-[#d8b3ca]'
                            }`}
                            aria-label={language === 'en' ? 'Toggle favourite' : 'Muuda lemmikut'}
                          >
                            <FavoriteHeartIcon active={isFavorite(product.id)} size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => addToCart(product.id, 1, product.price)}
                            className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#ead6e2] bg-white/95 text-[#6f5d6d] shadow-[0_10px_24px_-16px_rgba(60,40,55,0.35)] transition-transform duration-200 hover:scale-[1.05] hover:border-[#d8b3ca] active:scale-[0.98]"
                            aria-label={language === 'en' ? 'Add to cart' : 'Lisa korvi'}
                          >
                            <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.8} />
                          </button>
                        </div>
                      </div>
                      <div className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[#2f2530] sm:text-[16px]">
                            {product.name}
                          </h2>
                          <span className="shrink-0 text-[18px] font-semibold tracking-[-0.02em] text-[#2f2530] sm:text-[20px]">
                            €{product.price}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[#6f5d6d] sm:text-[13px]">
                          {product.description}
                        </p>

                        <div className="mt-4 grid gap-2">
                          <button
                            type="button"
                            onClick={() => addToCart(product.id, 1, product.price)}
                            className="w-full rounded-[16px] bg-[linear-gradient(135deg,#c24d86_0%,#a93d71_55%,#8f3362_100%)] py-3 text-[13px] font-semibold text-white shadow-[0_12px_26px_-16px_rgba(194,77,134,0.62)] transition-all duration-200 hover:brightness-[1.03] active:scale-[0.99]"
                          >
                            {language === 'en' ? 'Add to cart' : 'Lisa korvi'}
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(localizePath(`/shop/${product.id}`))}
                            className="w-full rounded-[16px] border border-[#ead6e2] bg-white py-3 text-[12px] font-semibold text-[#6a3b57] transition-colors hover:bg-[#fff4fa]"
                          >
                            {copy.viewDetails}
                          </button>
                        </div>

                        <p className="mt-2 text-center text-[11px] text-[#9a8a94]">
                          ✓ {language === 'en' ? 'Used in real salon treatments' : 'Kasutame päris salongihooldustes'}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Cart sidebar */}
            <aside className="sticky top-24 hidden h-fit rounded-[26px] border border-[#ecdfe7] bg-white/95 p-6 shadow-[0_26px_54px_-34px_rgba(95,63,86,0.2)] backdrop-blur-sm lg:block">
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
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5d8df] text-[#6b7280] hover:bg-white"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-sm font-semibold text-[#374151]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5d8df] text-[#6b7280] hover:bg-white"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs font-medium text-[#8a6b7e]">
                          {language === 'en' ? 'Qty' : 'Kogus'} × {product.price}
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
                  {language === 'en'
                    ? 'Secure payment via Stripe. You’ll receive confirmation by email.'
                    : 'Turvaline makse Stripe kaudu. Kinnituse saad e-postile.'}
                </p>
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isPaying}
                className="mt-4 w-full rounded-2xl bg-[linear-gradient(135deg,#c24d86_0%,#a93d71_55%,#8f3362_100%)] py-3.5 font-semibold text-white shadow-[0_14px_30px_-16px_rgba(194,77,134,0.62)] transition-all duration-200 hover:brightness-[1.03] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPaying ? copy.redirecting : copy.checkout}
              </button>
            </aside>
          </div>
        </div>
      </main>

      {/* Mobile: sticky cart summary + slide-up panel (UI only) */}
      <div className="fixed inset-x-0 bottom-0 z-[55] border-t border-[#f0e2eb] bg-white/92 backdrop-blur-xl shadow-[0_-18px_36px_-26px_rgba(60,40,55,0.26)] lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="flex min-h-[48px] flex-1 items-center justify-between rounded-2xl border border-[#ecdfe7] bg-white px-4 py-3 text-left"
            aria-label={language === 'en' ? 'Open cart' : 'Ava ostukorv'}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9d7a90]">{copy.cart}</p>
              <p className="mt-0.5 text-sm font-semibold text-[#2f2530]">
                {cart.length === 0 ? copy.empty : `${cart.length} ${language === 'en' ? 'items' : 'toodet'}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-[#8a6b7e]">{copy.total}</p>
              <p className="text-[16px] font-semibold tracking-[-0.02em] text-[#2f2530]">€{cartTotal}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || isPaying}
            className="min-h-[48px] shrink-0 rounded-2xl bg-[linear-gradient(135deg,#c24d86_0%,#a93d71_55%,#8f3362_100%)] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(194,77,134,0.6)] disabled:opacity-50"
          >
            {isPaying ? copy.redirecting : (language === 'en' ? 'Pay' : 'Maksa')}
          </button>
        </div>
      </div>

      {mobileCartOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#1f141d]/45"
            onClick={() => setMobileCartOpen(false)}
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
                onClick={() => setMobileCartOpen(false)}
                className="type-navbar-icon-btn"
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
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5d8df] text-[#6b7280] hover:bg-white"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-[#374151]">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5d8df] text-[#6b7280] hover:bg-white"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs font-medium text-[#8a6b7e]">
                        {language === 'en' ? 'Qty' : 'Kogus'} × {product.price}
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
                {language === 'en'
                  ? 'Secure payment via Stripe. You’ll receive confirmation by email.'
                  : 'Turvaline makse Stripe kaudu. Kinnituse saad e-postile.'}
              </p>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isPaying}
              className="mt-4 w-full rounded-2xl bg-[linear-gradient(135deg,#c24d86_0%,#a93d71_55%,#8f3362_100%)] py-3.5 font-semibold text-white shadow-[0_14px_30px_-16px_rgba(194,77,134,0.62)] transition-all duration-200 hover:brightness-[1.03] active:scale-[0.99] disabled:opacity-50"
            >
              {isPaying ? copy.redirecting : copy.checkout}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
