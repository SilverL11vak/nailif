'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '@/lib/behavior-tracking';

/**
 * Cart hook with server sync
 * 
 * Architecture:
 * - localStorage is primary for speed and offline support
 * - Server sync happens with debounce (500ms) after changes
 * - On load: try server first, fall back to localStorage
 * - Handles cross-tab sync via storage events
 * 
 * No login required - uses cookie-based session ID
 */

export interface StoredCartItem {
  productId: string;
  quantity: number;
}

const CART_KEY = 'nailify_cart_v1';
const CART_EVENT = 'nailify:cart-changed';
const SYNC_DEBOUNCE_MS = 500;

// Get session ID (client-side only)
function getOrCreateSessionId(): string | null {
  if (typeof document === 'undefined') return null;
  
  const match = document.cookie.match(/nailify_session=([^;]+)/);
  if (match) return match[1];
  
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const sessionId = `nfs_${uuid}_${timestamp}`;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000);
  document.cookie = `nailify_session=${sessionId}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
  
  return sessionId;
}

// Sync cart to server (debounced)
function syncToServer(cart: { items: StoredCartItem[] }, sessionId: string | null) {
  if (!sessionId) return;
  
  fetch('/api/session', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'cart',
      key: 'data',
      value: cart,
    }),
  }).catch(() => {
    // Silent fail - localStorage is primary
  });
}

// Load cart from server
async function loadFromServer(): Promise<{ items: StoredCartItem[] } | null> {
  try {
    const response = await fetch('/api/session', { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.cart || null;
  } catch {
    return null;
  }
}

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

function writeCart(items: StoredCartItem[], sessionId: string | null) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
  
  // Debounced server sync
  syncToServerDebounced({ items }, sessionId);
}

// Debounce helper
function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Create debounced sync function
const syncToServerDebounced = debounce(syncToServer, SYNC_DEBOUNCE_MS);

export function useCart() {
  const [items, setItems] = useState<StoredCartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  // Initialize: get session ID and load data
  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    
    // First, try localStorage
    const localCart = readCart();
    
    if (localCart.length > 0) {
      setItems(localCart);
      setIsLoaded(true);
      
      // Sync to server in background
      if (sessionIdRef.current) {
        syncToServer({ items: localCart }, sessionIdRef.current);
      }
    } else {
      // No local data, try server
      loadFromServer().then((serverCart) => {
        if (serverCart && serverCart.items && serverCart.items.length > 0) {
          setItems(serverCart.items);
          writeCart(serverCart.items, sessionIdRef.current);
        }
        setIsLoaded(true);
      }).catch(() => {
        setIsLoaded(true);
      });
    }
    // Run once on mount
  }, []);

  // Listen for cross-tab sync
  useEffect(() => {
    if (!isLoaded) return;
    
    const sync = () => setItems(readCart());
    window.addEventListener('storage', sync);
    window.addEventListener(CART_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CART_EVENT, sync);
    };
  }, [isLoaded]);

  const cartCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const setCartItems = useCallback((nextItems: StoredCartItem[]) => {
    setItems(nextItems);
    writeCart(nextItems, sessionIdRef.current);
  }, []);

  const addToCart = useCallback((productId: string, quantity = 1, price?: number) => {
    trackEvent('product_add_to_cart', { productId, quantity, price });
    setItems((previous) => {
      const found = previous.find((item) => item.productId === productId);
      const next = found
        ? previous.map((item) =>
            item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item,
          )
        : [...previous, { productId, quantity }];
      writeCart(next, sessionIdRef.current);
      return next;
    });
  }, []);

  return {
    items,
    cartCount,
    setCartItems,
    addToCart,
    isLoaded,
  };
}

