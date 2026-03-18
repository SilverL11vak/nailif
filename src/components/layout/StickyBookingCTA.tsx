'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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
  const [nextSlot, setNextSlot] = useState<TimeSlotType | null>(null);

  const { selectedService, totalPrice } = useBookingStore();

  const shouldHide = hideOnPaths.some((path) => pathname.startsWith(path));
  const isHome = pathname === '/' || pathname === '/et' || pathname === '/en';

  const handleScroll = useCallback(() => {
    if (shouldHide) {
      setIsVisible(false);
      return;
    }
    setIsVisible(window.scrollY > 420);
  }, [shouldHide]);

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

  const nextSlotLabel = useMemo(() => {
    if (!nextSlot) return null;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);
    if (nextSlot.date === today) return `${t('widget.todayAt')} ${nextSlot.time}`;
    if (nextSlot.date === tomorrowIso) return `${t('widget.tomorrowAt')} ${nextSlot.time}`;
    return `${nextSlot.date} ${nextSlot.time}`;
  }, [nextSlot, t]);

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
  const defaultHelper = t('widget.selectTime');
  const configuredPrimary = text('sticky_cta_label', defaultPrimary);
  const configuredHelper = text('sticky_cta_helper', defaultHelper);
  const nextSlotTitle = t('services.nextTimeLabel');
  const trustSignal = `${t('trust.rating')} · ${t('trust.clients')}`;

  return (
    <>
      {/* Mobile — soft bottom sheet CTA (non-intrusive) */}
      <div className="safe-area-bottom fixed bottom-0 left-0 right-0 z-[50] md:hidden">
        <div className="mx-auto max-w-xl px-4 pt-2 pb-safe">
          <div
            className="overflow-hidden rounded-t-3xl border border-[#e5d4de]/70 bg-gradient-to-b from-white to-[#fdf8fb]/95 shadow-[0_-16px_44px_-24px_rgba(70,45,58,0.22),0_-6px_18px_-10px_rgba(70,45,58,0.08)] backdrop-blur-xl"
          >
            {selectedService && (
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#8a6b7e]">{nextSlotTitle}</p>
                <p className="mt-0.5 text-[13px] font-semibold text-[#2d232d]">{selectedService.name}</p>
                {totalPrice > 0 && <p className="mt-0.5 text-[11px] text-[#6f5e66]">€{totalPrice}</p>}
              </div>
            )}
            <div className={`px-4 ${selectedService ? 'pb-3 pt-1' : 'py-3'}`}>
              <button
                onClick={handleClick}
                className="cta-sticky-mobile group flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_45%,#a93d71_100%)] px-5 py-3.5 font-semibold text-[0.98rem] text-white shadow-[0_12px_30px_-12px_rgba(139,51,100,0.5)] transition-all duration-200 active:scale-[0.99]"
              >
                {!selectedService && (
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                <span>
                  {isHome && nextSlotLabel
                    ? `${language === 'en' ? 'Next slot' : 'Järgmine aeg'} ${nextSlotLabel} → ${language === 'en' ? 'Reserve' : 'Broneeri'}`
                    : configuredPrimary}
                </span>
                <svg className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
            {!selectedService && <p className="px-4 pb-2 text-center text-[10px] text-[#7d6586]">{configuredHelper}</p>}
            <p className="px-4 pb-2.5 text-center text-[9px] font-medium text-[#9a8a94]">{trustSignal}</p>
          </div>
        </div>
      </div>

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

      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: max(env(safe-area-inset-bottom, 0px), 10px);
        }
        .pb-safe {
          padding-bottom: max(env(safe-area-inset-bottom, 0px), 12px);
        }
      `}</style>
    </>
  );
}

export default StickyBookingCTA;
