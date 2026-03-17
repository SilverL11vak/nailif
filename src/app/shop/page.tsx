'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/hooks/use-cart';
import { Globe, Heart, ArrowLeft, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category?: string;
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff5fa_40%,_#fffafc_100%)]">
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#fdf8fb] hover:text-[#4b5563]"
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
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#fdf8fb] hover:text-[#4b5563]"
                aria-label={copy.favorites}
              >
                <Heart size={18} strokeWidth={1.8} fill={favoritesCount > 0 ? 'currentColor' : 'none'} />
                {favoritesCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#c24d86] px-1 text-[10px] font-semibold text-white">
                    {favoritesCount > 9 ? '9+' : favoritesCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => router.push(localizePath('/book'))}
                className="btn-primary btn-primary-md"
              >
                {copy.nav.book}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          {/* Back to home + page title */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={localizePath('/')}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e8dce4] bg-white px-4 py-2.5 text-sm font-medium text-[#4b5563] shadow-sm hover:bg-[#fdf8fb] hover:border-[#dfbfd1] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.backToHome}
            </Link>
            <div>
              <p className="type-overline text-[var(--color-text-muted)]">{copy.eyebrow}</p>
              <h1 className="section-title mt-1">{copy.title}</h1>
              <p className="type-body mt-1 text-[var(--color-text-muted)]">{copy.subtitle}</p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            {/* Product grid */}
            <section className="card-premium p-6">
              {isLoading ? (
                <p className="py-12 text-center text-[#7d685d]">{copy.loading}</p>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="h-14 w-14 text-[#d4b8c8]" />
                  <p className="mt-4 text-[#6b7280]">{language === 'en' ? 'No products available yet.' : 'Tooteid pole veel saadaval.'}</p>
                  <Link
                    href={localizePath('/')}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f0e2eb] px-4 py-2.5 text-sm font-medium text-[#6a3b57] hover:bg-[#e8d4df]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {copy.backToHome}
                  </Link>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {products.map((product) => (
                    <article
                      key={product.id}
                      className="card-premium group overflow-hidden rounded-2xl transition-all duration-200 hover:shadow-[var(--shadow-card-hover)]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-[#f8edf4]">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={700}
                            height={525}
                            unoptimized
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[#9d7a90]">
                            <Package className="h-12 w-12 opacity-50" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleFavorite(product.id)}
                          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 transition ${
                            isFavorite(product.id) ? 'border-[#c24d86] text-[#c24d86]' : 'border-[#ead6e2] text-[#8f7086] hover:border-[#d8b3ca]'
                          }`}
                          aria-label={language === 'en' ? 'Toggle favourite' : 'Muuda lemmikut'}
                        >
                          <Heart size={16} strokeWidth={1.8} fill={isFavorite(product.id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <div className="p-5">
                        <h2 className="text-lg font-semibold text-[#2f2530]">{product.name}</h2>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#6f5d6d]">{product.description}</p>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xl font-semibold text-[#b04b80]">EUR {product.price}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(localizePath(`/shop/${product.id}`))}
                              className="rounded-xl border border-[#e5d8df] bg-white px-3.5 py-2 text-xs font-semibold text-[#5f4f5f] hover:bg-[#fdf8fb] transition-colors"
                            >
                              {copy.viewDetails}
                            </button>
                            <button
                              onClick={() => addToCart(product.id)}
                              className="rounded-xl bg-[#c24d86] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(194,77,134,0.45)] hover:bg-[#a93d71] transition-colors"
                            >
                              {copy.addToCart}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Cart sidebar */}
            <aside className="sticky top-24 h-fit rounded-[24px] border border-[#ecdfe7] bg-white/95 p-6 shadow-[0_24px_48px_-32px_rgba(95,63,86,0.18)] backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9d7a90]">{copy.cart}</p>
              <h2 className="mt-1 text-xl font-semibold text-[#2f2530]">{copy.yourItems}</h2>

              <div className="mt-4 space-y-3">
                {cart.length === 0 && <p className="text-sm text-[#6b7280]">{copy.empty}</p>}
                {cart.map((item) => {
                  const product = productsById.get(item.productId);
                  if (!product) return null;
                  return (
                    <div key={item.productId} className="rounded-xl border border-[#f0e2eb] bg-[#fef9fc] p-3">
                      <p className="text-sm font-medium text-[#2f2530]">{product.name}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5d8df] text-[#6b7280] hover:bg-white"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-medium text-[#374151]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5d8df] text-[#6b7280] hover:bg-white"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-[#2f2530]">EUR {product.price * item.quantity}</span>
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

              <div className="mt-5 flex items-center justify-between border-t border-[#f0e2eb] pt-4">
                <span className="text-sm text-[#6b7280]">{copy.total}</span>
                <span className="text-lg font-semibold text-[#2f2530]">EUR {cartTotal}</span>
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isPaying}
                className="mt-4 w-full rounded-xl bg-[#c24d86] py-3.5 font-semibold text-white shadow-[0_8px_24px_-8px_rgba(194,77,134,0.5)] hover:bg-[#a93d71] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {isPaying ? copy.redirecting : copy.checkout}
              </button>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
