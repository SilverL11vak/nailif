'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { trackEvent } from '@/lib/behavior-tracking';

const FAVORITES_KEY = 'nailify_favorites_v1';
const FAVORITES_EVENT = 'nailify:favorites-changed';

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

function writeFavorites(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(readFavorites());

    const sync = () => setFavorites(readFavorites());
    window.addEventListener('storage', sync);
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(FAVORITES_EVENT, sync);
    };
  }, []);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const isFavorite = useCallback((productId: string) => favoriteSet.has(productId), [favoriteSet]);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((previous) => {
      const next = previous.includes(productId)
        ? previous.filter((id) => id !== productId)
        : [...previous, productId];
      writeFavorites(next);
      trackEvent('product_favourite_toggle', { productId, newState: next.includes(productId) });
      return next;
    });
  }, []);

  return {
    favorites,
    favoritesCount: favorites.length,
    isFavorite,
    toggleFavorite,
  };
}

