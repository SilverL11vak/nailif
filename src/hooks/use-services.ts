'use client';

import { useEffect, useState } from 'react';
import type { Service } from '@/store/booking-types';
import { mockServices } from '@/store/mock-data';

interface ApiService extends Service {
  imageUrl?: string | null;
  active?: boolean;
}

export function useServices() {
  const [services, setServices] = useState<ApiService[]>(mockServices);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await fetch('/api/services', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load services');
        const data = (await response.json()) as { services?: ApiService[] };
        if (isMounted && Array.isArray(data.services) && data.services.length > 0) {
          setServices(data.services);
        }
      } catch (error) {
        console.error('useServices error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { services, loading };
}

