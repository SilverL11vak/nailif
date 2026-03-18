'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import type { TimeSlot as TimeSlotType } from '@/store/booking-types';
import { trackEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';

export function HeroBookingWidget() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [availableSlots, setAvailableSlots] = useState<TimeSlotType[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotVisible, setSlotVisible] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);
  const pulseOnceRef = useRef(false);

  const nextSlot = useMemo(() => {
    if (availableSlots.length === 0) return null;
    return [...availableSlots].sort((a, b) => `${a.date}-${a.time}`.localeCompare(`${b.date}-${b.time}`))[0];
  }, [availableSlots]);

  useEffect(() => {
    let mounted = true;
    const loadSlots = async () => {
      setSlotsLoading(true);
      try {
        const response = await fetch('/api/slots?upcoming=1&limit=1');
        if (!response.ok) throw new Error('Failed to load slots');
        const data = (await response.json()) as { slots?: TimeSlotType[] };
        if (mounted) {
          setAvailableSlots((data.slots ?? []).filter((slot) => slot.available));
        }
      } catch (error) {
        console.error('Hero booking slots load error:', error);
        if (mounted) {
          setAvailableSlots([]);
        }
      } finally {
        if (mounted) setSlotsLoading(false);
      }
    };

    void loadSlots();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (slotsLoading) return;
    if (!nextSlot) return;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setSlotVisible(true);
      return;
    }
    const t1 = window.setTimeout(() => setSlotVisible(true), 140);
    if (!pulseOnceRef.current) {
      pulseOnceRef.current = true;
      const t2 = window.setTimeout(() => {
        setCtaPulse(true);
        window.setTimeout(() => setCtaPulse(false), 520);
      }, 520);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
    return () => window.clearTimeout(t1);
  }, [slotsLoading, nextSlot]);

  const urgencyMicro = useMemo(() => {
    if (!nextSlot) return language === 'en' ? 'Times filling fast today' : 'Ajad täituvad kiiresti täna';
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const isToday = nextSlot.date === todayDate;
    const h = Number(nextSlot.time.split(':')[0] ?? 0);
    if (isToday) {
      if (h >= 9 && h < 12) return language === 'en' ? 'Last morning slots available' : 'Viimased hommikused ajad täna';
      if (h >= 17) return language === 'en' ? 'Evening nearly full' : 'Õhtused ajad on peaaegu täis';
      return language === 'en' ? 'Times filling fast today' : 'Ajad täituvad kiiresti täna';
    }
    return language === 'en' ? 'Limited openings ahead' : 'Avamisi on piiratud';
  }, [nextSlot, language]);

  const bookingHeadlineParts = useMemo(() => {
    if (!nextSlot) {
      return {
        label: language === 'en' ? 'Next available time' : 'Järgmine vaba aeg',
        time: '—',
      };
    }

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    if (nextSlot.date === todayDate) {
      return {
        label: language === 'en' ? 'Next available time today' : 'Järgmine vaba aeg täna',
        time: nextSlot.time,
      };
    }

    if (nextSlot.date === tomorrowDate) {
      return {
        label: language === 'en' ? 'Next available time tomorrow' : 'Järgmine vaba aeg homme',
        time: nextSlot.time,
      };
    }

    const formatted = new Date(`${nextSlot.date}T00:00:00`).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    return {
      label: language === 'en' ? `Next available: ${formatted}` : `Järgmine vaba aeg: ${formatted}`,
      time: nextSlot.time,
    };
  }, [nextSlot, language]);

  const reserveLabel = () => {
    if (!nextSlot) return language === 'en' ? 'Reserve time' : 'Broneeri aeg';
    const time = nextSlot.time;
    return language === 'en' ? `Reserve ${time} time` : `Broneeri kell ${time}`;
  };

  const handleReserve = () => {
    trackBehaviorEvent('hero_booking_click');
    if (!nextSlot) {
      router.push('/book');
      return;
    }
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
      metadata: { source: 'homepage_quick_booking', date: nextSlot.date, time: nextSlot.time },
      language,
    });
    const params = new URLSearchParams();
    params.set('date', nextSlot.date);
    params.set('time', nextSlot.time);
    router.push(`/book?${params.toString()}`);
  };

  return (
    <div
      id="hero-booking-widget"
      className="group relative overflow-hidden rounded-2xl border border-[#f0e6ec] bg-white p-5 shadow-[0_24px_64px_-44px_rgba(95,38,77,0.32)] transition-all duration-200 md:p-6 md:hover:-translate-y-0.5 md:hover:shadow-[0_32px_72px_-50px_rgba(95,38,77,0.38)] lg:p-8"
    >
      <div className="absolute left-0 right-0 top-0 h-1 bg-[linear-gradient(90deg,#e8b8d4_0%,#c24d86_55%,#a93d71_100%)]" aria-hidden />
      <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(215,157,192,0.22)_0%,transparent_70%)]" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(207,124,172,0.15)_0%,transparent_70%)] blur-sm" aria-hidden />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">
            {language === 'en' ? 'Next Premium Slot Available' : 'Järgmine premium aeg'}
          </p>
          <p className="mt-2 font-brand leading-[1.22] tracking-tight text-[#1f171d]">
            <span className="block text-[16px] font-semibold leading-[1.22]">
              {slotsLoading ? '—' : slotVisible ? bookingHeadlineParts.label : '—'}
            </span>
            <span className="block text-[30px] font-semibold leading-[1.22]">
              {slotsLoading ? '—' : slotVisible ? bookingHeadlineParts.time : '—'}
            </span>
          </p>
        </div>
        <span className="rounded-full border border-[#f0dfe9] bg-white/90 px-3 py-1 text-[11px] font-medium text-[#7f6275]">
          {t('widget.identityStudio')}
        </span>
      </div>

      {/* Row 1 — suitability + hygiene pills */}
      <div className="mt-4 flex flex-wrap gap-2 text-[12px] text-[#6f6168]">
        <span className="inline-flex items-center gap-2 rounded-2xl bg-[#fbf8fa] px-3 py-2 ring-1 ring-[#f1e6ec]">
          <span className="h-2 w-2 rounded-full bg-[#c24d86]" aria-hidden />
          {language === 'en' ? 'Fits most services (45–90 min)' : 'Sobib enamikele teenustele (45–90 min)'}
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl bg-[#fbf8fa] px-3 py-2 ring-1 ring-[#f1e6ec]">
          <span className="h-2 w-2 rounded-full bg-[#6b9b7a]" aria-hidden />
          {language === 'en' ? 'Medical level hygiene' : 'Meditsiiniline hügieen'}
        </span>
      </div>

      {/* Row 2 — urgency strip */}
      <div className="mt-2 rounded-2xl border border-[#efe0e8] bg-[#fff7fb] px-3 py-2 text-[12px] font-medium text-[#6a3b57]">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c24d86] opacity-45" aria-hidden />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c24d86]" aria-hidden />
          </span>
          {urgencyMicro}
        </span>
      </div>

      <p className="mt-4 text-[12px] font-medium text-[#8a7a88]">
        {language === 'en' ? 'Structured gel polish from €30' : 'Modelleeritud geellakk alates €30'}
      </p>

      <button
        type="button"
        onClick={handleReserve}
        disabled={slotsLoading || !nextSlot}
        className={`mt-5 w-full rounded-2xl px-5 py-4 text-[15px] font-semibold text-white shadow-[0_16px_36px_-14px_rgba(194,77,134,0.55)] transition-all duration-200 ${
          slotsLoading || !nextSlot
            ? 'cursor-not-allowed bg-[#ece8ea] text-[#9a9094] shadow-none'
            : `bg-[linear-gradient(135deg,#c24d86_0%,#a93d71_55%,#8f3362_100%)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-18px_rgba(194,77,134,0.55)] active:scale-[0.99] ${
                ctaPulse ? 'ring-4 ring-[#c24d86]/25' : ''
              } hero-booking-cta-pulse`
        }`}
      >
        {slotsLoading ? (language === 'en' ? 'Checking availability…' : 'Kontrollime aegu…') : reserveLabel()}
      </button>

      <p className="mt-2 text-center text-[12px] font-medium text-[#8a7a88] opacity-70">
        {language === 'en' ? 'Time will be temporarily locked for you' : 'Aeg lukustatakse ajutiselt sinu jaoks'}
      </p>

      <div className="mt-5 flex items-center justify-center gap-3 border-t border-[#f1e3ec] pt-5 text-[11px] text-[#7f6275]">
        <span>{t('trust.rating')} ({t('trust.clients')})</span>
        <span className="text-[#d8c5d1]">•</span>
        <span>{t('widget.hygiene')}</span>
      </div>

      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          .hero-booking-cta-pulse {
            animation: none !important;
          }
        }
        .hero-booking-cta-pulse {
          animation: heroCtaPulse 7.2s ease-in-out infinite;
        }
        @keyframes heroCtaPulse {
          0%, 84%, 100% {
            box-shadow: 0 16px 36px -14px rgba(194, 77, 134, 0.45);
          }
          90% {
            box-shadow: 0 22px 52px -18px rgba(194, 77, 134, 0.62);
          }
        }
      `}</style>
    </div>
  );
}

export default HeroBookingWidget;
