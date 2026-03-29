'use client';

import { useEffect, useState } from 'react';
import type { Service } from '@/store/booking-types';
import { useTranslation } from '@/lib/i18n';

interface ApiService extends Service {
  imageUrl?: string | null;
  active?: boolean;
  sortOrder?: number;
}

export interface ServiceCategoryItem {
  id: string;
  name: string;
  nameEt?: string;
  nameEn?: string;
  sortOrder?: number;
  active?: boolean;
}

const SERVICES_CACHE_TTL_MS = 5 * 60 * 1000;
const servicesCache = new Map<string, { ts: number; data: { services: ApiService[]; categories: ServiceCategoryItem[] } }>();
const servicesInFlight = new Map<string, Promise<{ services: ApiService[]; categories: ServiceCategoryItem[] }>>();

async function fetchServices(language: string): Promise<{ services: ApiService[]; categories: ServiceCategoryItem[] }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`/api/services?lang=${language}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`services_${response.status}`);

    const data = (await response.json()) as { services?: ApiService[]; categories?: ServiceCategoryItem[] };
    return {
      services: Array.isArray(data.services) ? data.services : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
    };
  } catch (err) {
    // AbortController timeouts are expected during route transitions; treat them as a soft fallback.
    const errObj = err as { name?: string; code?: string };
    const name = errObj?.name;
    const code = errObj?.code;
    if (name === 'AbortError' || code === 'ABORT_ERR') return { services: [], categories: [] };
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useServices() {
  const { language } = useTranslation();
  const cached = servicesCache.get(language);
  const [services, setServices] = useState<ApiService[]>(cached?.data.services ?? []);
  const [categories, setCategories] = useState<ServiceCategoryItem[]>(cached?.data.categories ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const cachedItem = servicesCache.get(language);
      if (cachedItem && Date.now() - cachedItem.ts < SERVICES_CACHE_TTL_MS) {
        if (isMounted) {
          setServices(cachedItem.data.services);
          setCategories(cachedItem.data.categories);
          setLoading(false);
        }
        return;
      }

      if (isMounted) setLoading(true);

      const existingRequest = servicesInFlight.get(language);
      if (existingRequest) {
        try {
          const result = await existingRequest;
          if (isMounted) {
            setServices(result.services);
            setCategories(result.categories);
          }
        } catch {
          // If the shared request was aborted, fall back to cached/mock services without throwing.
          if (isMounted) {
            setServices([]);
            setCategories([]);
          }
        } finally {
          if (isMounted) setLoading(false);
        }
        return;
      }

      const request = fetchServices(language);
      servicesInFlight.set(language, request);

      try {
        const result = await request;
        const hasData = result.services.length > 0 || result.categories.length > 0;
        if (hasData) {
          servicesCache.set(language, { ts: Date.now(), data: result });
          if (isMounted) {
            setServices(result.services);
            setCategories(result.categories);
          }
        } else if (isMounted && !cachedItem) {
          setServices([]);
          setCategories([]);
        }
      } catch {
        if (isMounted && cachedItem) {
          setServices(cachedItem.data.services);
          setCategories(cachedItem.data.categories);
        }
      } finally {
        servicesInFlight.delete(language);
        if (isMounted) setLoading(false);
      }
    };

    void load().catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [language]);

  return { services, categories, loading };
}
