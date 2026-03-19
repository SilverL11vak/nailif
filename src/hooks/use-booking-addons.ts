'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AddOn } from '@/store/booking-types';
import { useTranslation } from '@/lib/i18n';
import { useBookingStore } from '@/store/booking-store';

const addOnCache = new Map<string, AddOn[]>();

export function useBookingAddOns(serviceId?: string | null) {
  const { language } = useTranslation();
  const selectedAddOns = useBookingStore((state) => state.selectedAddOns);
  const setAddOns = useBookingStore((state) => state.setAddOns);
  const cacheKey = `${language}:${serviceId ?? ''}`;
  const [loading, setLoading] = useState<boolean>(() => !addOnCache.has(cacheKey));

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!serviceId) {
        setAddOns([]);
        setLoading(false);
        return;
      }

      if (addOnCache.has(cacheKey)) {
        setAddOns(addOnCache.get(cacheKey) ?? []);
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const response = await fetch(
          `/api/booking-addons?lang=${language}&serviceId=${encodeURIComponent(serviceId)}`
        );
        if (!response.ok) {
          if (!mounted) return;
          setAddOns([]);
          return;
        }
        const data = (await response.json()) as { addOns?: AddOn[] };
        if (!mounted) return;
        const list = Array.isArray(data.addOns) ? data.addOns : [];
        addOnCache.set(cacheKey, list);
        setAddOns(list);
      } catch (error) {
        console.error('useBookingAddOns error:', error);
        if (mounted) {
          setAddOns([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [cacheKey, language, serviceId, setAddOns]);

  return useMemo(
    () => ({
      addOns: selectedAddOns,
      loading,
    }),
    [loading, selectedAddOns]
  );
}

export default useBookingAddOns;
