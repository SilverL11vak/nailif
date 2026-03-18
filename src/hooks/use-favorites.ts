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

// Load favorites from server
async function loadFromServer(): Promise<string[] | null> {
  try {
    const response = await fetch('/api/session', { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.favorites || null;
  } catch {
    return null;
  }
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
  const sessionIdRef = useRef<string | null>(null);

  // Initialize: get session ID and load data
  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    
    // First, try localStorage
    const localFavorites = readFavorites();
    
    if (localFavorites.length > 0) {
      setFavorites(localFavorites);
      setIsLoaded(true);
      
      // Sync to server in background (merge)
      if (sessionIdRef.current) {
        syncToServer(localFavorites, sessionIdRef.current);
      }
    } else {
      // No local data, try server
      loadFromServer().then((serverFavorites) => {
        if (serverFavorites && serverFavorites.length > 0) {
          setFavorites(serverFavorites);
          writeFavorites(serverFavorites, sessionIdRef.current);
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
    
    const sync = () => {
      const newFavorites = readFavorites();
      setFavorites(newFavorites);
    };
    window.addEventListener('storage', sync);
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(FAVORITES_EVENT, sync);
    };
  }, [isLoaded]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const isFavorite = useCallback((productId: string) => favoriteSet.has(productId), [favoriteSet]);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((previous) => {
      const next = previous.includes(productId)
        ? previous.filter((id) => id !== productId)
        : [...previous, productId];
      writeFavorites(next, sessionIdRef.current);
      trackEvent('product_favourite_toggle', { productId, newState: next.includes(productId) });
      return next;
    });
  }, []);

  return {
    favorites,
    favoritesCount: favorites.length,
    isFavorite,
    toggleFavorite,
    isLoaded,
  };
}

