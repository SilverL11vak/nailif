'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
}

interface CartItem {
  productId: string;
  quantity: number;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const response = await fetch('/api/products', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load products');
        const data = (await response.json()) as { products?: Product[] };
        if (mounted) {
          setProducts(data.products ?? []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const product = productsById.get(item.productId);
        if (!product) return sum;
        return sum + product.price * item.quantity;
      }, 0),
    [cart, productsById]
  );

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const found = prev.find((item) => item.productId === productId);
      if (found) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setError(null);
    setIsPaying(true);
    try {
      const response = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customerEmail: email || undefined,
        }),
      });
      if (!response.ok) throw new Error('Checkout failed');
      const data = (await response.json()) as { checkoutUrl?: string };
      if (!data.checkoutUrl) throw new Error('Missing checkout URL');
      window.location.href = data.checkoutUrl;
    } catch (e) {
      console.error(e);
      setError('Checkout failed. Please configure Stripe keys and try again.');
      setIsPaying(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f0eb] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_340px]">
        <section className="rounded-3xl border border-[#eadfd7] bg-white/90 p-6 shadow-[0_24px_40px_-32px_rgba(59,42,33,0.6)]">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#b08979]">Nailify Shop</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#2a211d]">Premium care products</h1>
            <p className="mt-2 text-sm text-[#6f5d53]">Curated aftercare for salon-level results at home.</p>
          </div>

          {isLoading ? (
            <p className="text-[#7d685d]">Loading products...</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-[#efe4dc] bg-[#fffdfa] shadow-[0_20px_30px_-24px_rgba(59,42,33,0.45)]"
                >
                  <div className="aspect-[4/3] bg-[#f6ece6]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={700}
                        height={525}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#8f776b]">Nailify</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-[#2f2520]">{product.name}</h2>
                    <p className="mt-1 text-sm text-[#7e6a5f]">{product.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-base font-semibold text-[#b58373]">EUR {product.price}</span>
                      <button
                        onClick={() => addToCart(product.id)}
                        className="rounded-full bg-[#b58373] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9f6d5c]"
                      >
                        Add to cart
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="sticky top-6 h-fit rounded-3xl border border-[#eadfd7] bg-white p-6 shadow-[0_24px_40px_-32px_rgba(59,42,33,0.6)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#b08979]">Cart</p>
          <h2 className="mt-1 text-xl font-semibold text-[#2a211d]">Your items</h2>

          <div className="mt-4 space-y-3">
            {cart.length === 0 && <p className="text-sm text-[#8a7367]">Your cart is empty.</p>}
            {cart.map((item) => {
              const product = productsById.get(item.productId);
              if (!product) return null;
              return (
                <div key={item.productId} className="rounded-xl border border-[#f1e7e1] p-3">
                  <p className="text-sm font-medium text-[#3b2f28]">{product.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="h-7 w-7 rounded-full border border-[#e6d8cf] text-[#7d685d]"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-sm text-[#5d4b43]">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="h-7 w-7 rounded-full border border-[#e6d8cf] text-[#7d685d]"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-[#2f2520]">
                      EUR {product.price * item.quantity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <label className="mt-5 block text-sm text-[#6f5d53]">
            Email (optional)
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="client@email.com"
              className="mt-1 w-full rounded-xl border border-[#e9ddd5] px-3 py-2 outline-none focus:border-[#b58373]"
            />
          </label>

          <div className="mt-5 flex items-center justify-between border-t border-[#f1e7e1] pt-4">
            <span className="text-sm text-[#7d685d]">Total</span>
            <span className="text-lg font-semibold text-[#2f2520]">EUR {cartTotal}</span>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isPaying}
            className="mt-4 w-full rounded-xl bg-[#b58373] py-3 font-semibold text-white transition-colors hover:bg-[#9f6d5c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPaying ? 'Redirecting...' : 'Checkout with Stripe'}
          </button>
        </aside>
      </div>
    </main>
  );
}
