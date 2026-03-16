'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

type BookingContent = Record<string, string>;

const contentCache = new Map<string, BookingContent>();

export function useBookingContent() {
  const { language } = useTranslation();
  const [content, setContent] = useState<BookingContent>(() => contentCache.get(language) ?? {});
  const [loading, setLoading] = useState<boolean>(() => !contentCache.has(language));

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (contentCache.has(language)) {
        setContent(contentCache.get(language) ?? {});
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/booking-content?lang=${language}`);
        if (!response.ok) throw new Error('Failed to load booking content');
        const data = (await response.json()) as { content?: BookingContent };
        if (!mounted) return;
        const nextContent = data.content ?? {};
        contentCache.set(language, nextContent);
        setContent(nextContent);
      } catch (error) {
        console.error('useBookingContent error:', error);
        if (mounted) setContent({});
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [language]);

  const value = useMemo(
    () => ({
      content,
      loading,
      text: (key: string, fallback: string) => {
        const configured = content[key]?.trim();
        return configured || fallback;
      },
    }),
    [content, loading]
  );

  return value;
}

export default useBookingContent;
