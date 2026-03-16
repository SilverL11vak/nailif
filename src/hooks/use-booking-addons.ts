'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AddOn } from '@/store/booking-types';
import { useTranslation } from '@/lib/i18n';
import { useBookingStore } from '@/store/booking-store';

const addOnCache = new Map<string, AddOn[]>();

const fallbackAddOns: Record<'et' | 'en', AddOn[]> = {
  et: [
    { id: 'nail-art', name: 'Küünedisain', description: 'Isikupärane detail sinu valitud stiiliga.', duration: 15, price: 12, selected: false },
    { id: 'repair', name: 'Parandus', description: 'Kiire korrigeerimine murdunud või nõrgenenud küünele.', duration: 10, price: 8, selected: false },
    { id: 'chrome-finish', name: 'Kroomviimistlus', description: 'Luksuslik peegelläige viimaseks viimistluseks.', duration: 10, price: 10, selected: false },
    { id: 'french-detail', name: 'French detail', description: 'Puhas klassikaline joon elegantseks tulemuseks.', duration: 10, price: 9, selected: false },
  ],
  en: [
    { id: 'nail-art', name: 'Nail art', description: 'Personalized detail aligned with your selected style.', duration: 15, price: 12, selected: false },
    { id: 'repair', name: 'Repair', description: 'Fast correction for broken or weakened nails.', duration: 10, price: 8, selected: false },
    { id: 'chrome-finish', name: 'Chrome finish', description: 'Luxurious mirror shine as a finishing touch.', duration: 10, price: 10, selected: false },
    { id: 'french-detail', name: 'French detail', description: 'Clean classic line for an elegant result.', duration: 10, price: 9, selected: false },
  ],
};

export function useBookingAddOns() {
  const { language } = useTranslation();
  const selectedAddOns = useBookingStore((state) => state.selectedAddOns);
  const setAddOns = useBookingStore((state) => state.setAddOns);
  const [loading, setLoading] = useState<boolean>(() => !addOnCache.has(language));

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (addOnCache.has(language)) {
        setAddOns(addOnCache.get(language) ?? []);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/booking-addons?lang=${language}`);
        if (!response.ok) throw new Error('Failed to load booking add-ons');
        const data = (await response.json()) as { addOns?: AddOn[] };
        if (!mounted) return;
        const list = Array.isArray(data.addOns) ? data.addOns : [];
        addOnCache.set(language, list);
        setAddOns(list);
      } catch (error) {
        console.error('useBookingAddOns error:', error);
        const fallback = fallbackAddOns[language] ?? fallbackAddOns.et;
        if (mounted) {
          setAddOns(fallback);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [language, setAddOns]);

  return useMemo(
    () => ({
      addOns: selectedAddOns,
      loading,
    }),
    [loading, selectedAddOns]
  );
}

export default useBookingAddOns;
