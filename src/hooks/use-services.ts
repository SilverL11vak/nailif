'use client';

import { useEffect, useState } from 'react';
import type { Service } from '@/store/booking-types';
import { mockServices } from '@/store/mock-data';
import { useTranslation } from '@/lib/i18n';

interface ApiService extends Service {
  imageUrl?: string | null;
  active?: boolean;
}

const SERVICES_CACHE_TTL_MS = 5 * 60 * 1000;
const servicesCache = new Map<string, { ts: number; data: ApiService[] }>();
const servicesInFlight = new Map<string, Promise<ApiService[]>>();

async function fetchServices(language: string): Promise<ApiService[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);
  let response: Response;
  try {
    response = await fetch(`/api/services?lang=${language}`, { signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) {
    return mockServices;
  }
  const data = (await response.json()) as { services?: ApiService[] };
  if (!Array.isArray(data.services) || data.services.length === 0) {
    return mockServices;
  }
  return data.services;
}

export function useServices() {
  const { language } = useTranslation();
  const cached = servicesCache.get(language);
  const [services, setServices] = useState<ApiService[]>(cached?.data ?? mockServices);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const cachedItem = servicesCache.get(language);
      if (cachedItem && Date.now() - cachedItem.ts < SERVICES_CACHE_TTL_MS) {
        if (isMounted) {
          setServices(cachedItem.data);
          setLoading(false);
        }
        return;
      }

      if (isMounted) setLoading(true);

      const existingRequest = servicesInFlight.get(language);
      if (existingRequest) {
        try {
          const result = await existingRequest;
          if (isMounted) setServices(result);
        } finally {
          if (isMounted) setLoading(false);
        }
        return;
      }

      const request = fetchServices(language);
      servicesInFlight.set(language, request);

      try {
        const result = await request;
        servicesCache.set(language, { ts: Date.now(), data: result });
        if (isMounted) {
          setServices(result);
        }
      } catch {
        if (isMounted) setServices(mockServices);
      } finally {
        servicesInFlight.delete(language);
        if (isMounted) setLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [language]);

  return { services, loading };
}
