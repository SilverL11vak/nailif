'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';
import type { TimeSlot as TimeSlotType } from '@/store/booking-types';
import { trackEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';

interface StickyBookingCTAProps {
  hideOnPaths?: string[];
}

export function StickyBookingCTA({ hideOnPaths = [] }: StickyBookingCTAProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useTranslation();
  const { text } = useBookingContent();
  const [isVisible, setIsVisible] = useState(false);
  const [heroBookingInView, setHeroBookingInView] = useState(true);
  const [nextSlot, setNextSlot] = useState<TimeSlotType | null>(null);

  const { selectedService, totalPrice } = useBookingStore();

  const shouldHide = hideOnPaths.some((path) => pathname.startsWith(path));
  const isHome = pathname === '/' || pathname === '/et' || pathname === '/en';

  const handleScroll = useCallback(() => {
    if (shouldHide) {
      setIsVisible(false);
      return;
    }
    // Prevent a second competing booking CTA while the hero booking card is still visible.
    setIsVisible(window.scrollY > 420 && !heroBookingInView);
  }, [shouldHide, heroBookingInView]);

  useEffect(() => {
    if (!isHome || shouldHide) {
      setHeroBookingInView(false);
      return;
    }

    const heroEl = document.getElementById('hero-booking');
    if (!heroEl) return;

    setHeroBookingInView(true);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setHeroBookingInView(Boolean(entry?.isIntersecting));
      },
      // If any part is visible, keep hero CTA as the only dominant booking action.
      { threshold: [0, 0.01, 0.08] }
    );

    observer.observe(heroEl);
    return () => observer.disconnect();
  }, [isHome, shouldHide]);

  useEffect(() => {
    if (shouldHide) {
      setIsVisible(false);
      return;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll, shouldHide, pathname]);

  useEffect(() => {
    if (!isHome) return;
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch('/api/slots?upcoming=1&limit=1');
        if (!res.ok) return;
        const data = (await res.json()) as { slots?: TimeSlotType[] };
        const slot = (data.slots ?? []).find((s) => s.available) ?? null;
        if (mounted) setNextSlot(slot);
      } catch {
        if (mounted) setNextSlot(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isHome]);

  const handleClick = () => {
    trackBehaviorEvent('hero_booking_click', { source: 'sticky_cta' });
    if (isHome && nextSlot) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const slotDay = new Date(`${nextSlot.date}T00:00:00`);
        const daysAhead = Math.max(0, Math.round((slotDay.getTime() - today.getTime()) / 86400000));
        trackBehaviorEvent('quick_slot_click', {
          slotTime: nextSlot.time,
          daysAhead,
          slotPosition: 1,
        });
      } catch {
        // ignore analytics failures
      }
      trackEvent({
        event: 'booking_cta_click',
        slotId: nextSlot.id,
        metadata: { source: 'sticky_home_bar', date: nextSlot.date, time: nextSlot.time },
        language,
      });
      const params = new URLSearchParams();
      params.set('date', nextSlot.date);
      params.set('time', nextSlot.time);
      router.push(`/book?${params.toString()}`);
      return;
    }
    const heroElement = document.getElementById('hero-booking');
    if (heroElement) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      heroElement.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    router.push('/book');
  };

  if (!isVisible) return null;

  const defaultPrimary = t('nav.bookNow');
  const configuredPrimary = text('sticky_cta_label', defaultPrimary);
  const trustSignal = `${t('trust.rating')} · ${t('trust.clients')}`;

  return (
    <>
      {/* Desktop — pill: primary gradient, hover lift + arrow */}
      <div className="fixed bottom-5 left-1/2 z-40 hidden -translate-x-1/2 md:block">
        <div className="flex max-w-md flex-col items-center gap-1">
          <button
            onClick={handleClick}
            className="cta-sticky-desktop group inline-flex min-w-[280px] max-w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_45%,#a93d71_100%)] px-6 py-3 font-semibold text-[0.95rem] text-white shadow-[0_12px_32px_-14px_rgba(139,51,100,0.45),0_0_0_1px_rgba(255,255,255,0.15)_inset] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_-12px_rgba(139,51,100,0.55)] active:scale-[0.99]"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {selectedService ? (
              <>
                <span className="truncate">{configuredPrimary}: {selectedService.name}</span>
                {totalPrice > 0 && <span className="shrink-0 opacity-90">€{totalPrice}</span>}
              </>
            ) : (
              configuredPrimary
            )}
            <svg className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <p className="text-[9px] font-medium text-[#9a8a94]">{trustSignal}</p>
        </div>
      </div>
    </>
  );
}

export default StickyBookingCTA;
