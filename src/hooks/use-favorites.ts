'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '@/lib/behavior-tracking';

/**
 * Favorites hook with server sync
 * 
 * Architecture:
 * - localStorage is primary for speed and offline support
 * - Server sync happens with debounce (500ms) after changes
 * - On load: try server first, fall back to localStorage
 * - Handles cross-tab sync via storage events
 * 
 * No login required - uses cookie-based session ID
 */

const FAVORITES_KEY = 'nailify_favorites_v1';
const FAVORITES_EVENT = 'nailify:favorites-changed';
const SYNC_DEBOUNCE_MS = 500;

function uniqueStringIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function sanitizeFavorites(ids: string[], validProductIds: Set<string> | null): string[] {
  const normalized = uniqueStringIds(ids);
  if (!validProductIds) return normalized;
  return normalized.filter((id) => validProductIds.has(id));
}

// Get session ID (client-side only)
function getOrCreateSessionId(): string | null {
  if (typeof document === 'undefined') return null;
  
  const match = document.cookie.match(/nailify_session=([^;]+)/);
  if (match) return match[1];
  
  // Create new session ID (UUID + timestamp)
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const sessionId = `nfs_${uuid}_${timestamp}`;
  
  // Set cookie
  const expires = new Date();
  expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000);
  document.cookie = `nailify_session=${sessionId}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
  
  return sessionId;
}

// Sync favorites to server (debounced)
function syncToServer(favorites: string[], sessionId: string | null) {
  if (!sessionId) return;
  
  fetch('/api/session', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'favorites',
      key: 'list',
      value: favorites,
    }),
  }).catch(() => {
    // Silent fail - localStorage is primary
  });
}

function readFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[], sessionId: string | null) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(FAVORITES_EVENT));
  
  // Debounced server sync
  syncToServerDebounced(ids, sessionId);
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

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [validProductIds, setValidProductIds] = useState<Set<string> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Initialize: get session ID and load local data
  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();

    const localFavorites = sanitizeFavorites(readFavorites(), null);
    setFavorites(localFavorites);
    setIsLoaded(true);

    if (sessionIdRef.current) {
      syncToServer(localFavorites, sessionIdRef.current);
    }
  }, []);

  // Load valid product IDs once and auto-prune stale favorites.
  useEffect(() => {
    let mounted = true;
    const loadProductIds = async () => {
      try {
        const response = await fetch('/api/products?lang=et');
        if (!response.ok) return;
        const data = (await response.json()) as { products?: Array<{ id: string }> };
        if (!mounted || !Array.isArray(data.products)) return;
        const ids = new Set(
          data.products
            .map((product) => (typeof product.id === 'string' ? product.id.trim() : ''))
            .filter(Boolean)
        );
        setValidProductIds(ids);
      } catch {
        // keep null => no extra filtering
      }
    };
    void loadProductIds();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !validProductIds) return;
    setFavorites((previous) => {
      const next = sanitizeFavorites(previous, validProductIds);
      if (!arraysEqual(previous, next)) {
        writeFavorites(next, sessionIdRef.current);
      }
      return next;
    });
  }, [isLoaded, validProductIds]);

  // Listen for cross-tab sync
  useEffect(() => {
    if (!isLoaded) return;
    
    const sync = () => {
      const newFavorites = sanitizeFavorites(readFavorites(), validProductIds);
      setFavorites(newFavorites);
    };
    window.addEventListener('storage', sync);
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(FAVORITES_EVENT, sync);
    };
  }, [isLoaded, validProductIds]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const isFavorite = useCallback((productId: string) => favoriteSet.has(productId), [favoriteSet]);

  const toggleFavorite = useCallback((productId: string) => {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) return;
    if (validProductIds && !validProductIds.has(normalizedProductId)) {
      return;
    }
    setFavorites((previous) => {
      const nextRaw = previous.includes(normalizedProductId)
        ? previous.filter((id) => id !== normalizedProductId)
        : [...previous, normalizedProductId];
      const next = sanitizeFavorites(nextRaw, validProductIds);
      writeFavorites(next, sessionIdRef.current);
      trackEvent('product_favourite_toggle', { productId: normalizedProductId, newState: next.includes(normalizedProductId) });
      return next;
    });
  }, [validProductIds]);

  return {
    favorites,
    favoritesCount: favorites.length,
    isFavorite,
    toggleFavorite,
    isLoaded,
  };
}
