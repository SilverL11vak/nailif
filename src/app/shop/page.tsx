'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/hooks/use-cart';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
}

export default function ShopPage() {
  const router = useRouter();
  const { language, localizePath } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
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
            stockPrefix: 'Stock',
            viewDetails: 'View details',
            favorites: 'Favourites',
          }
        : {
            eyebrow: 'Nailify pood',
            title: 'Premium hooldustooted',
            subtitle: 'Hoolikalt valitud jarelhooldus salongitulemuse hoidmiseks kodus.',
            loading: 'Laen tooteid...',
            addToCart: 'Lisa korvi',
            cart: 'Ostukorv',
            yourItems: 'Sinu tooted',
            empty: 'Ostukorv on tuhi.',
            email: 'E-post (valikuline)',
            total: 'Kokku',
            checkout: 'Maksa Stripega',
            redirecting: 'Suunan maksmisse...',
            checkoutError: 'Maksmine ebaonnestus. Kontrolli Stripe seadeid ja proovi uuesti.',
            fallbackBrand: 'Nailify',
            stockPrefix: 'Laos',
            viewDetails: 'Vaata detaile',
            favorites: 'Lemmikud',
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
    <main className="min-h-screen bg-[#f6f0eb] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_340px]">
        <section className="rounded-3xl border border-[#eadfd7] bg-white/90 p-6 shadow-[0_24px_40px_-32px_rgba(59,42,33,0.6)]">
          <div className="mb-6">
            <p className="type-overline text-[#b08979]">{copy.eyebrow}</p>
            <h1 className="type-h2 mt-1 text-[#2a211d]">{copy.title}</h1>
            <p className="type-small mt-2 measure-copy text-[#6f5d53]">{copy.subtitle}</p>
            <button
              onClick={() => router.push(localizePath('/favorites'))}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#e6d8cf] bg-white px-4 py-2 text-xs font-semibold text-[#6d5650]"
            >
              <span>{copy.favorites}</span>
              {favoritesCount > 0 && (
                <span className="rounded-full bg-[#c24d86] px-1.5 text-[10px] font-semibold text-white">
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </span>
              )}
            </button>
          </div>

          {isLoading ? (
            <p className="text-[#7d685d]">{copy.loading}</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {products.map((product) => (
                <article key={product.id} className="group overflow-hidden rounded-2xl border border-[#efe4dc] bg-[#fffdfa] shadow-[0_20px_30px_-24px_rgba(59,42,33,0.45)]">
                  <div className="relative aspect-[4/3] bg-[#f6ece6]">
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt={product.name} width={700} height={525} unoptimized className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#8f776b]">{copy.fallbackBrand}</div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(product.id)}
                      className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white/95 ${
                        isFavorite(product.id) ? 'border-[#c24d86] text-[#c24d86]' : 'border-[#ead6e2] text-[#8f7086]'
                      }`}
                      aria-label={language === 'en' ? 'Toggle favourite' : 'Muuda lemmikut'}
                    >
                      <svg className="h-4 w-4" fill={isFavorite(product.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s-7.5-4.35-9.5-8.6C.9 9.05 2.15 5.5 5.9 5.5c2.1 0 3.4 1.1 4.1 2.15.7-1.05 2-2.15 4.1-2.15 3.75 0 5 3.55 3.4 6.9C19.5 16.65 12 21 12 21z" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-[#2f2520]">{product.name}</h2>
                    <p className="mt-1 text-sm text-[#7e6a5f]">{product.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-base font-semibold text-[#b58373]">EUR {product.price}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(localizePath(`/shop/${product.id}`))}
                          className="rounded-full border border-[#e6d8cf] px-3 py-2 text-xs font-semibold text-[#6f5d53]"
                        >
                          {copy.viewDetails}
                        </button>
                        <button onClick={() => addToCart(product.id)} className="rounded-full bg-[#b58373] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9f6d5c]">
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

        <aside className="sticky top-6 h-fit rounded-3xl border border-[#eadfd7] bg-white p-6 shadow-[0_24px_40px_-32px_rgba(59,42,33,0.6)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#b08979]">{copy.cart}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#2a211d]">{copy.yourItems}</h2>

          <div className="mt-4 space-y-3">
            {cart.length === 0 && <p className="text-sm text-[#8a7367]">{copy.empty}</p>}
            {cart.map((item) => {
              const product = productsById.get(item.productId);
              if (!product) return null;
              return (
                <div key={item.productId} className="rounded-xl border border-[#f1e7e1] p-3">
                  <p className="text-sm font-medium text-[#3b2f28]">{product.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="h-7 w-7 rounded-full border border-[#e6d8cf] text-[#7d685d]">-</button>
                      <span className="w-5 text-center text-sm text-[#5d4b43]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="h-7 w-7 rounded-full border border-[#e6d8cf] text-[#7d685d]">+</button>
                    </div>
                    <span className="text-sm font-semibold text-[#2f2520]">EUR {product.price * item.quantity}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <label className="mt-5 block text-sm text-[#6f5d53]">
            {copy.email}
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="client@email.com" className="mt-1 w-full rounded-xl border border-[#e9ddd5] px-3 py-2 outline-none focus:border-[#b58373]" />
          </label>

          <div className="mt-5 flex items-center justify-between border-t border-[#f1e7e1] pt-4">
            <span className="text-sm text-[#7d685d]">{copy.total}</span>
            <span className="text-lg font-semibold text-[#2f2520]">EUR {cartTotal}</span>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isPaying}
            className="mt-4 w-full rounded-xl bg-[#b58373] py-3 font-semibold text-white transition-colors hover:bg-[#9f6d5c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPaying ? copy.redirecting : copy.checkout}
          </button>
        </aside>
      </div>
    </main>
  );
}
