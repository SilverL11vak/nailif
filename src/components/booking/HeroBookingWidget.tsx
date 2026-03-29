'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { trackEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';
import { getTodayInTallinn, getTomorrowInTallinn, getCurrentTimeInTallinn } from '@/lib/timezone';
import {
  getNextAvailableSlotClient,
  type NextAvailableSlotLite,
} from '@/lib/next-available-slot-client';
import { ArrowRight } from 'lucide-react';

const HERO_SLOT_STORAGE_KEY = 'hero_next_slot_lite_v1';
const HOLD_DURATION = 15 * 60;

export function HeroBookingWidget() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [nextSlot, setNextSlot] = useState<NextAvailableSlotLite | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [showSlowFallback, setShowSlowFallback] = useState(false);
  const [slotVisible, setSlotVisible] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);
  const [isCardBooting, setIsCardBooting] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const [displayTime, setDisplayTime] = useState('');
  const [incomingTime, setIncomingTime] = useState<string | null>(null);
  const [timeTransitioning, setTimeTransitioning] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(HOLD_DURATION);
  const pulseOnceRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!nextSlot) return;
    setSecondsLeft(HOLD_DURATION);
  }, [nextSlot?.id]);

  useEffect(() => {
    let mounted = true;
    const loadSlots = async () => {
      try {
        const slot = await getNextAvailableSlotClient();
        if (mounted) setNextSlot(slot);
      } catch {
        if (mounted) setNextSlot(null);
      } finally {
        if (mounted) setSlotsLoading(false);
      }
    };

    const raf = window.requestAnimationFrame(() => {
      // Defer network to post-paint so card chrome/skeleton appears immediately.
      window.setTimeout(() => {
        if (!mounted) return;
        try {
          const raw = window.localStorage.getItem(HERO_SLOT_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as { slot?: NextAvailableSlotLite; ts?: number };
            if (parsed?.slot?.date && parsed?.slot?.time && typeof parsed.ts === 'number' && Date.now() - parsed.ts < 10 * 60 * 1000) {
              setNextSlot(parsed.slot);
              setSlotVisible(true);
              setSlotsLoading(false);
            }
          }
        } catch {
          // ignore parse/storage issues
        }
        setIsCardBooting(false);
        void loadSlots();
      }, 0);
    });
    return () => {
      mounted = false;
      window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!nextSlot) return;
    try {
      window.localStorage.setItem(HERO_SLOT_STORAGE_KEY, JSON.stringify({ slot: nextSlot, ts: Date.now() }));
    } catch {
      // ignore storage failures
    }
  }, [nextSlot]);

  useEffect(() => {
    if (!slotsLoading || nextSlot) {
      setShowSlowFallback(false);
      return;
    }
    const timeout = window.setTimeout(() => setShowSlowFallback(true), 2500);
    return () => window.clearTimeout(timeout);
  }, [slotsLoading, nextSlot]);

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
    if (!nextSlot) {
      if (slotsLoading && !showSlowFallback) {
        return t('_auto.components_booking_HeroBookingWidget.p208');
      }
      return t('_auto.components_booking_HeroBookingWidget.p209');
    }
    const todayDate = getTodayInTallinn();
    const currentTime = getCurrentTimeInTallinn();
    const isToday = nextSlot.date === todayDate;
    const h = Number(nextSlot.time.split(':')[0] ?? 0);
    if (isToday) {
      // Check if this specific time has passed
      if (nextSlot.time <= currentTime) {
        return t('_auto.components_booking_HeroBookingWidget.p210');
      }
      if (h >= 9 && h < 12) return t('_auto.components_booking_HeroBookingWidget.p211');
      if (h >= 17) return t('_auto.components_booking_HeroBookingWidget.p212');
      return t('_auto.components_booking_HeroBookingWidget.p213');
    }
    return t('_auto.components_booking_HeroBookingWidget.p214');
  }, [nextSlot, language, slotsLoading, showSlowFallback]);

  const bookingHeadlineParts = useMemo(() => {
    if (!nextSlot) {
      return {
        label:
          slotsLoading && !showSlowFallback
            ? t('_auto.components_booking_HeroBookingWidget.p215')
            : t('_auto.components_booking_HeroBookingWidget.p216'),
        time: slotsLoading && !showSlowFallback ? '...' : t('_auto.components_booking_HeroBookingWidget.p217'),
      };
    }

    const todayDate = getTodayInTallinn();
    const tomorrowDate = getTomorrowInTallinn();

    if (nextSlot.date === todayDate) {
      return {
        label: t('_auto.components_booking_HeroBookingWidget.p218'),
        time: nextSlot.time,
      };
    }

    if (nextSlot.date === tomorrowDate) {
      return {
        label: t('_auto.components_booking_HeroBookingWidget.p219'),
        time: nextSlot.time,
      };
    }

    const formatted = new Date(`${nextSlot.date}T00:00:00`).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    return {
      label: language === 'en' ? `Next available: ${formatted}` : `J\u00E4rgmine vaba aeg: ${formatted}`,
      time: nextSlot.time,
    };
  }, [nextSlot, language, slotsLoading, showSlowFallback]);

  useEffect(() => {
    if (!bookingHeadlineParts.time) return;
    if (!displayTime) {
      setDisplayTime(bookingHeadlineParts.time);
      return;
    }
    if (bookingHeadlineParts.time === displayTime) return;
    if (reduceMotion) {
      setDisplayTime(bookingHeadlineParts.time);
      return;
    }
    setIncomingTime(bookingHeadlineParts.time);
    setTimeTransitioning(true);
    const id = window.setTimeout(() => {
      setDisplayTime(bookingHeadlineParts.time);
      setIncomingTime(null);
      setTimeTransitioning(false);
    }, 220);
    return () => window.clearTimeout(id);
  }, [bookingHeadlineParts.time, displayTime, reduceMotion]);

  const reserveLabel = () => {
    if (!nextSlot) return t('_auto.components_booking_HeroBookingWidget.p220');
    const time = nextSlot.time;
    return language === 'en' ? `Reserve ${time} time` : `Broneeri kell ${time}`;
  };

  const progress = Math.max(0, (secondsLeft / HOLD_DURATION) * 100);

  const handleReserve = () => {
    if (isReserving) return;
    setIsReserving(true);
    trackBehaviorEvent('hero_booking_click');
    window.setTimeout(() => {
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
    }, 180);
  };

  return (
    <div
      id="hero-booking-widget"
      className="group relative overflow-hidden rounded-[24px] border border-[rgba(201,165,154,0.25)] bg-white/78 p-5 shadow-[0_40px_90px_rgba(20,12,18,0.18)] backdrop-blur-[16px] transition-all duration-[170ms] [transition-timing-function:cubic-bezier(0.22,0.68,0,1)] md:p-6 md:hover:-translate-y-[2px] lg:p-8"
    >
      {/* Gradient top bar */}
      <div className="absolute left-0 right-0 top-0 h-1 bg-[linear-gradient(90deg,#C0588B_0%,#E2B6C8_100%)]" aria-hidden />
      
      {/* Ambient glows */}
      <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(215,157,192,0.22)_0%,transparent_70%)]" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(207,124,172,0.15)_0%,transparent_70%)] blur-sm" aria-hidden />
      <div className="pointer-events-none absolute right-8 top-[58%] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(194,77,134,0.16)_0%,transparent_70%)] blur-lg" aria-hidden />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8f7f89]">
            {t('_auto.components_booking_HeroBookingWidget.p221')}
          </p>
          <p className="mt-1 text-[16px] font-medium text-[#7a6a74]">
            {slotsLoading || isCardBooting ? (t('_auto.components_booking_HeroBookingWidget.p222')) : bookingHeadlineParts.label}
          </p>
          {slotsLoading || isCardBooting ? (
            <div className="mt-2 space-y-2">
              <div className="h-4 w-44 rounded bg-[#f3edf1]" />
              <div className="h-8 w-28 rounded bg-[#f3edf1]" />
            </div>
          ) : (
            <p className={`mt-2 leading-[1.02] tracking-[-0.02em] text-[#171118] ${slotVisible ? 'hero-slot-reveal' : ''}`}>
              <span className="relative block h-[1.1em] text-[42px] font-extrabold leading-[0.98] tabular-nums sm:text-[52px] lg:text-[58px]">
                <span
                  className={`absolute inset-0 transition-all duration-[220ms] [transition-timing-function:cubic-bezier(0.22,0.68,0,1)] ${
                    timeTransitioning ? 'translate-y-[-6px] opacity-0' : 'translate-y-0 opacity-100'
                  }`}
                >
                  {slotVisible ? (displayTime || bookingHeadlineParts.time) : '\u2014'}
                </span>
                {incomingTime && (
                  <span className="hero-time-enter absolute inset-0">
                    {incomingTime}
                  </span>
                )}
              </span>
            </p>
          )}
          {nextSlot ? (
            <p className="mt-1 text-[12px] text-[#8a7a85]">
              {t('_auto.components_booking_HeroBookingWidget.p223')}
            </p>
          ) : null}
        </div>
        <span className="pill-tag self-start sm:self-center">
          {t('widget.identityStudio')}
        </span>
      </div>

      {/* Micro progress strip */}
      <div className={`mt-4 rounded-[14px] border px-[14px] py-[10px] text-[12px] font-medium transition-colors duration-300 ${
        nextSlot 
          ? 'border-[#E7D4DE] bg-[#F7EEF3] text-[#6a3b57]' 
          : 'border-[#E7D4DE] bg-[#F7EEF3] text-[#8a7a88]'
      }`}>
        <span className="inline-flex items-center gap-2">
          {nextSlot && (
            <span className="relative flex h-2 w-2">
              <span className={`hero-live-dot absolute inline-flex h-full w-full rounded-full bg-[#c24d86] ${reduceMotion ? '' : 'hero-live-dot-pulse'}`} aria-hidden />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c24d86]" aria-hidden />
            </span>
          )}
          {nextSlot
            ? (secondsLeft > 0
                ? (language === 'en' ? `Held for you ${Math.ceil(secondsLeft / 60)} min` : `Hoitud sulle ${Math.ceil(secondsLeft / 60)} min`)
                : (t('_auto.components_booking_HeroBookingWidget.p224')))
            : urgencyMicro}
        </span>
        {nextSlot && (
          <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-[#eddde5]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#C0588B_0%,#E6A9C4_100%)]"
              style={{ width: `${progress}%`, transition: 'width 1s linear' }}
            />
          </div>
        )}
      </div>

      {showSlowFallback && !nextSlot && (
        <p className="mt-2 text-[12px] text-[#7f6275]">
          {t('_auto.components_booking_HeroBookingWidget.p225')}
        </p>
      )}

      <p className="mt-3 text-[12px] font-medium text-[#8a7a88]">
        {t('_auto.components_booking_HeroBookingWidget.p226')}
      </p>

      <div className="relative mt-5">
        <div className="pointer-events-none absolute inset-x-10 -top-2 h-10 rounded-full bg-[radial-gradient(circle,rgba(194,77,134,0.35)_0%,transparent_70%)] blur-lg" aria-hidden />
        <button
          type="button"
          onClick={handleReserve}
          disabled={isReserving}
          className={`btn-primary btn-primary-lg group/cta hero-booking-cta-pulse relative w-full ${
            ctaPulse ? 'ring-4 ring-[#c24d86]/25' : ''
          } ${isReserving ? 'opacity-90' : ''}`}
        >
          <span className="inline-flex items-center justify-center gap-2">
            {isReserving ? (t('_auto.components_booking_HeroBookingWidget.p227')) : reserveLabel()}
            {nextSlot && (
              <ArrowRight className="h-4 w-4 transition-transform duration-[170ms] group-hover/cta:translate-x-[2px]" strokeWidth={2.2} />
            )}
          </span>
        </button>
        {isReserving ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f2dfe9]">
            <div className="hero-commit-bar h-full rounded-full bg-[linear-gradient(90deg,#c24d86_0%,#8f3362_100%)]" />
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-center text-[12px] font-medium text-[#8a7a88] opacity-70">
        {language === 'en'
          ? (nextSlot
              ? (secondsLeft > 0
                  ? `Selected time is held for ${Math.ceil(secondsLeft / 60)} minutes`
                  : 'Time released. Choose a new slot.')
              : 'Select a time to continue')
          : (nextSlot
              ? (secondsLeft > 0
                  ? `Valitud aeg hoitakse sulle ${Math.ceil(secondsLeft / 60)} minutit`
                  : 'Aeg vabastati. Vali uus aeg.')
              : 'Vali aeg j\u00E4tkamiseks')}
      </p>

      <div className="mt-5 flex items-center justify-center gap-3 border-t border-[#f1e3ec] pt-5 text-[11px] text-[#7f6275]">
        <span>{t('trust.rating')} ({t('trust.clients')})</span>
        <span className="text-[#d8c5d1]">{'\u2022'}</span>
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
        .hero-slot-reveal {
          animation: heroSlotReveal 260ms ease-out both;
        }
        .hero-time-enter {
          animation: heroTimeEnter 220ms cubic-bezier(0.22, 0.68, 0, 1) both;
        }
        .hero-live-dot-pulse {
          animation: heroLiveDotPulse 2200ms ease-in-out infinite;
        }
        .hero-commit-bar {
          animation: heroCommitBar 200ms ease-out both;
        }
        @keyframes heroCtaPulse {
          0%, 84%, 100% {
            box-shadow: 0 14px 32px rgba(158, 62, 112, 0.35);
          }
          90% {
            box-shadow: 0 22px 46px rgba(158, 62, 112, 0.45);
          }
        }
        @keyframes heroTimeEnter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroSlotReveal {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroCommitBar {
          from { width: 0%; opacity: 0.7; }
          to { width: 100%; opacity: 1; }
        }
        @keyframes heroLiveDotPulse {
          0%, 100% { opacity: 0.24; transform: scale(1); }
          50% { opacity: 0.52; transform: scale(1.14); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-live-dot-pulse,
          .hero-time-enter {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default HeroBookingWidget;
