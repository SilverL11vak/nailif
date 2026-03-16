'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export interface StoredCartItem {
  productId: string;
  quantity: number;
}

const CART_KEY = 'nailify_cart_v1';
const CART_EVENT = 'nailify:cart-changed';

function readCart(): StoredCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => ({
        productId: typeof entry?.productId === 'string' ? entry.productId : '',
        quantity: Number(entry?.quantity ?? 0),
      }))
      .filter((entry) => entry.productId && Number.isFinite(entry.quantity) && entry.quantity > 0);
  } catch {
    return [];
  }
}

function writeCart(items: StoredCartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function useCart() {
  const [items, setItems] = useState<StoredCartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
    const sync = () => setItems(readCart());
    window.addEventListener('storage', sync);
    window.addEventListener(CART_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CART_EVENT, sync);
    };
  }, []);

  const cartCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const setCartItems = useCallback((nextItems: StoredCartItem[]) => {
    setItems(nextItems);
    writeCart(nextItems);
  }, []);

  const addToCart = useCallback((productId: string, quantity = 1) => {
    setItems((previous) => {
      const found = previous.find((item) => item.productId === productId);
      const next = found
        ? previous.map((item) =>
            item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item,
          )
        : [...previous, { productId, quantity }];
      writeCart(next);
      return next;
    });
  }, []);

  return {
    items,
    cartCount,
    setCartItems,
    addToCart,
  };
}

