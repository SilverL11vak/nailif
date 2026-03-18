'use client';

import { useState, useEffect, useMemo, useRef, useCallback, type RefObject } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';
import type { TimeSlot } from '@/store/booking-types';
import { DateTimeSlotPill, type SlotPillBadge } from './DateTimeSlotPill';
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, amount: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + amount);
  return date;
}

function daysBetween(a: Date, b: Date) {
  const u = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const v = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((v - u) / 86400000);
}

type Density = 'full' | 'limited' | 'none';

function dayDensity(slots: TimeSlot[] | undefined): Density {
  const n = (slots ?? []).filter((s) => s.available).length;
  if (n === 0) return 'none';
  if (n <= 3) return 'limited';
  return 'full';
}

const BOOKING_SLOT_LOCK_KEY = 'booking_slot_lock';
const SLOT_LOCK_MS = 5 * 60 * 1000;

function computeBadge(
  slot: TimeSlot,
  av: TimeSlot[],
  recommendedIds: Set<string>,
  fastestId: string | undefined,
  middayId: string | undefined
): SlotPillBadge {
  if (!slot.available) return null;
  if (recommendedIds.has(slot.id)) return 'recommended';
  if (slot.id === fastestId) return 'fastest';
  if (slot.isPopular) return 'popular';
  if (av.length >= 3 && slot.id === middayId) return 'midday';
  if (slot.count != null && slot.count <= 2) return 'limited';
  return null;
}

const HEADER_STICKY_PX = 76;
const SLOT_SELECT_SCROLL_DELAY_MS = 120;
const PROGRAMMATIC_SCROLL_GRACE_MS = 520;
const USER_SCROLL_IDLE_MS = 340;
const TOUCH_GUARD_MS = 300;
const TOUCH_MOVE_THRESHOLD_PX = 28;

export type DateTimeStepProps = {
  step3AnchorRef?: RefObject<HTMLElement | null>;
};

export function DateTimeStep({ step3AnchorRef }: DateTimeStepProps) {
  const { t, language } = useTranslation();
  const { text } = useBookingContent();
  const searchParams = useSearchParams();
  const selectedDate = useBookingStore((state) => state.selectedDate);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectDate = useBookingStore((state) => state.selectDate);
  const selectSlot = useBookingStore((state) => state.selectSlot);
  const nextStep = useBookingStore((state) => state.nextStep);
  const totalPrice = useBookingStore((state) => state.totalPrice);

  const [isLoading, setIsLoading] = useState(false);
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([]);
  const [recommendedSlots, setRecommendedSlots] = useState<TimeSlot[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, TimeSlot[]>>({});
  const [weekOffset, setWeekOffset] = useState(0);
  const [justSelectedId, setJustSelectedId] = useState<string | null>(null);
  const [summaryBump, setSummaryBump] = useState(0);
  const [summaryDesktopPulse, setSummaryDesktopPulse] = useState(false);
  const [desktopCtaPulse, setDesktopCtaPulse] = useState(false);
  const [mobileStickyLift, setMobileStickyLift] = useState(false);
  const [slotAreaShake, setSlotAreaShake] = useState(false);
  const continueButtonRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const summaryDesktopInnerRef = useRef<HTMLDivElement>(null);
  const desktopContinueRef = useRef<HTMLButtonElement>(null);
  const mobileScrollNudgeRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const programmaticScrollUntilRef = useRef(0);
  const lastManualGestureRef = useRef(0);
  const touchStartYRef = useRef(0);
  const ignoreTouchGestureUntilRef = useRef(0);
  const preferredTimeRef = useRef(searchParams.get('time'));
  const initialSelectedDateRef = useRef<Date | null>(selectedDate);
  const initialSelectedSlotIdRef = useRef<string | null>(selectedSlot?.id ?? null);
  const maxWeekOffset = 12;

  const en = language === 'en';

  const pillLabels = useMemo(
    () => ({
      recommended: en ? 'Recommended' : 'Soovitus',
      fastest: en ? 'Fastest booking' : 'Kiireim broneering',
      popular: en ? 'Most popular' : 'Populaarseim',
      midday: en ? 'Prime time' : 'Parim aeg',
      limited: en ? 'Filling fast' : 'Täitub kiiresti',
      quiet: en ? 'Quiet' : 'Rahulik',
      available: en ? 'Available' : 'Vaba',
      selectedLine: en ? 'Your time' : 'Sinu aeg',
    }),
    [en]
  );

  const weekDates = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 10 }, (_, i) => addDays(base, weekOffset * 7 + i));
  }, [weekOffset]);

  const selectedDateKey = selectedDate ? toIsoDate(selectedDate) : toIsoDate(weekDates[0]);
  const currentSlots = slotsByDate[selectedDateKey] ?? [];

  const nextAvailableSlot = useMemo(
    () =>
      allSlots
        .filter((slot) => slot.available)
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0] ?? null,
    [allSlots]
  );

  const recommendedIds = useMemo(() => new Set(recommendedSlots.map((s) => s.id)), [recommendedSlots]);

  const { fastestId, middayId, sortedAvailable } = useMemo(() => {
    const av = currentSlots.filter((s) => s.available).sort((a, b) => a.time.localeCompare(b.time));
    const fastest = av[0]?.id;
    let mid: string | undefined;
    if (av.length > 0) {
      const target = 12 * 60;
      let bestDiff = Infinity;
      for (const s of av) {
        const [h, m] = s.time.split(':').map(Number);
        const mins = (h || 0) * 60 + (m || 0);
        const d = Math.abs(mins - target);
        if (d < bestDiff) {
          bestDiff = d;
          mid = s.id;
        }
      }
    }
    return { fastestId: fastest, middayId: mid, sortedAvailable: av };
  }, [currentSlots]);

  const slotBadges = useMemo(() => {
    const m = new Map<string, SlotPillBadge>();
    for (const slot of currentSlots) {
      m.set(slot.id, computeBadge(slot, sortedAvailable, recommendedIds, fastestId, middayId));
    }
    return m;
  }, [currentSlots, sortedAvailable, recommendedIds, fastestId, middayId]);

  useEffect(() => {
    let mounted = true;
    const loadSlots = async () => {
      setIsLoading(true);
      const start = toIsoDate(new Date());
      const end = toIsoDate(addDays(new Date(), 60));

      try {
        const response = await fetch(
          `/api/slots?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}&smart=1&lang=${language}&serviceDuration=${selectedService?.duration ?? 0}`
        );
        if (!response.ok) throw new Error('Failed to load slots');

        const data = (await response.json()) as { slots?: TimeSlot[]; recommendedTimes?: TimeSlot[] };
        const loaded = data.slots ?? [];
        const recommended = (data.recommendedTimes ?? []).filter((slot) => slot.available).slice(0, 3);
        const map: Record<string, TimeSlot[]> = {};

        for (const slot of loaded) {
          if (!map[slot.date]) map[slot.date] = [];
          map[slot.date].push(slot);
        }

        if (!mounted) return;
        setAllSlots(loaded);
        setRecommendedSlots(recommended);
        setSlotsByDate(map);

        const initialDate = initialSelectedDateRef.current ?? new Date();
        const initialKey = toIsoDate(initialDate);
        const daySlots = map[initialKey] ?? [];
        selectDate(initialDate);

        const preferredSlot = preferredTimeRef.current
          ? daySlots.find((slot) => slot.available && slot.time === preferredTimeRef.current)
          : null;
        const existingAvailable = daySlots.find((slot) => slot.id === initialSelectedSlotIdRef.current && slot.available);
        const firstAvailable = preferredSlot ?? existingAvailable ?? daySlots.find((slot) => slot.available);
        if (firstAvailable && firstAvailable.id !== initialSelectedSlotIdRef.current) {
          selectSlot(firstAvailable);
        }
      } catch (error) {
        console.error('DateTimeStep slots load error:', error);
        if (mounted) {
          setAllSlots([]);
          setRecommendedSlots([]);
          setSlotsByDate({});
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadSlots();
    return () => {
      mounted = false;
    };
  }, [language, selectedService?.duration, selectDate, selectSlot]);

  useEffect(() => {
    if (!selectedDate) return;
    const inCurrentWeek = weekDates.some((item) => toIsoDate(item) === toIsoDate(selectedDate));
    if (!inCurrentWeek) {
      selectDate(weekDates[0]);
    }
  }, [weekDates, selectedDate, selectDate]);

  useEffect(() => {
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('booking_shake_slots')) {
        sessionStorage.removeItem('booking_shake_slots');
        setSlotAreaShake(true);
        const t = window.setTimeout(() => setSlotAreaShake(false), 650);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
    return undefined;
  }, []);

  useEffect(() => {
    let resetTimer: number;
    const onScroll = () => {
      if (typeof window === 'undefined') return;
      if (Date.now() < programmaticScrollUntilRef.current) return;
      isUserScrollingRef.current = true;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        isUserScrollingRef.current = false;
      }, USER_SCROLL_IDLE_MS);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(resetTimer);
    };
  }, []);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('[data-datetime-slot]')) {
        ignoreTouchGestureUntilRef.current = Date.now() + 450;
      }
      touchStartYRef.current = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (Date.now() < ignoreTouchGestureUntilRef.current) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('[data-datetime-slot]')) return;
      const y = e.touches[0]?.clientY ?? 0;
      if (Math.abs(y - touchStartYRef.current) > TOUCH_MOVE_THRESHOLD_PX) {
        lastManualGestureRef.current = Date.now();
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  const pulseDesktopSummary = useCallback(() => {
    setSummaryDesktopPulse(true);
    setDesktopCtaPulse(true);
    window.setTimeout(() => {
      setSummaryDesktopPulse(false);
      setDesktopCtaPulse(false);
    }, 720);
  }, []);

  const runAutoScrollAfterSlotSelect = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (isUserScrollingRef.current) return;
    if (Date.now() - lastManualGestureRef.current < TOUCH_GUARD_MS) return;

    const isLg = window.matchMedia('(min-width: 1024px)').matches;
    const summaryEl = summaryDesktopInnerRef.current;

    if (isLg && summaryEl) {
      const r = summaryEl.getBoundingClientRect();
      const vh = window.innerHeight;
      const inView =
        r.top >= HEADER_STICKY_PX - 6 &&
        r.bottom <= vh + 12 &&
        r.top < vh * 0.92;

      if (inView) {
        pulseDesktopSummary();
        return;
      }

      const targetTop = r.top + window.scrollY - HEADER_STICKY_PX - 14;
      if (window.scrollY >= targetTop - 8) {
        pulseDesktopSummary();
        return;
      }

      programmaticScrollUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_GRACE_MS;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      window.setTimeout(() => {
        pulseDesktopSummary();
      }, 440);
      return;
    }

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (window.scrollY >= maxScroll - 32) {
      setMobileStickyLift(true);
      window.setTimeout(() => setMobileStickyLift(false), 400);
      return;
    }

    programmaticScrollUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_GRACE_MS;
    setMobileStickyLift(true);
    window.setTimeout(() => setMobileStickyLift(false), 420);

    const nudge = mobileScrollNudgeRef.current;
    const anchor = step3AnchorRef?.current;
    if (nudge) {
      nudge.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
    } else if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    } else {
      window.scrollBy({ top: Math.min(96, maxScroll - window.scrollY), behavior: 'smooth' });
    }
  }, [pulseDesktopSummary, step3AnchorRef]);

  const handleDateSelect = (date: Date) => {
    selectDate(date);
    const daySlots = slotsByDate[toIsoDate(date)] ?? [];
    const preferredSlot = preferredTimeRef.current
      ? daySlots.find((slot) => slot.available && slot.time === preferredTimeRef.current)
      : null;
    if (preferredSlot) {
      selectSlot(preferredSlot);
    }
  };

  const handleSlotSelect = useCallback(
    (slot: TimeSlot) => {
      if (!slot.available) return;
      ignoreTouchGestureUntilRef.current = Date.now() + 450;
      try {
        localStorage.setItem(
          BOOKING_SLOT_LOCK_KEY,
          JSON.stringify({ slotId: slot.id, expiresAt: Date.now() + SLOT_LOCK_MS })
        );
      } catch {
        /* ignore */
      }
      selectSlot(slot);
      setJustSelectedId(slot.id);
      setSummaryBump((k) => k + 1);
      window.setTimeout(() => setJustSelectedId(null), 320);
      window.setTimeout(() => {
        runAutoScrollAfterSlotSelect();
      }, SLOT_SELECT_SCROLL_DELAY_MS);
    },
    [selectSlot, runAutoScrollAfterSlotSelect]
  );

  const handleContinue = () => {
    if (selectedSlot) {
      nextStep();
      continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const jumpToNextAvailable = () => {
    if (!nextAvailableSlot) return;
    const d = new Date(`${nextAvailableSlot.date}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = daysBetween(today, d);
    const newOffset = Math.max(0, Math.min(maxWeekOffset, Math.floor(diff / 7)));
    setWeekOffset(newOffset);
    window.requestAnimationFrame(() => {
      selectDate(d);
      selectSlot(nextAvailableSlot);
      dayScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    });
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isTomorrow = (date: Date) => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return date.toDateString() === t.toDateString();
  };

  const monthLabel = weekDates[0]?.toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDayLabel = selectedDate
    ? selectedDate.toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      })
    : null;

  const selectedTimeLine = selectedSlot
    ? `${new Date(selectedSlot.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })} · ${selectedSlot.time}`
    : en
      ? 'Pick a time'
      : 'Vali aeg';

  const serviceShort =
    selectedService && selectedService.name.length > 22
      ? `${selectedService.name.slice(0, 20)}…`
      : selectedService?.name ?? '';

  const daysUntilNext =
    nextAvailableSlot && selectedDate
      ? Math.max(0, daysBetween(selectedDate, new Date(`${nextAvailableSlot.date}T12:00:00`)))
      : null;

  const showEmptyDay =
    !isLoading && currentSlots.length > 0 && !currentSlots.some((s) => s.available) && nextAvailableSlot;

  const emptyNoSlotsAtAll = !isLoading && currentSlots.length === 0;

  const price = totalPrice || selectedService?.price || 0;

  const SummaryCard = ({ className }: { className?: string }) => (
    <div
      ref={summaryDesktopInnerRef}
      className={`rounded-2xl border border-[#f0e8ec]/90 bg-white/90 p-5 shadow-[0_16px_40px_-28px_rgba(57,33,52,0.18)] backdrop-blur-md transition-shadow duration-300 motion-reduce:transition-none ${
        summaryDesktopPulse ? 'booking-desktop-summary-pulse' : ''
      } ${className ?? ''}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a898a8]">
        {en ? 'Your selection' : 'Sinu valik'}
      </p>
      <div
        key={summaryBump}
        className="booking-time-summary-animate mt-4 space-y-3 border-t border-[#f2eaed] pt-4"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#b8a8b0]">{en ? 'Service' : 'Teenus'}</p>
          <p className="mt-0.5 font-brand text-lg font-semibold leading-tight text-[#2f2530]">
            {selectedService?.name ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#b8a8b0]">{en ? 'Day' : 'Päev'}</p>
          <p className="mt-0.5 text-sm font-medium text-[#5d4558]">{selectedDayLabel ?? '—'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#b8a8b0]">{en ? 'Time' : 'Aeg'}</p>
          <p className="mt-0.5 text-base font-semibold text-[#c24d86]">{selectedTimeLine}</p>
        </div>
        <div className="flex items-end justify-between border-t border-dashed border-[#ebe3e6] pt-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a898a8]">
            {en ? 'Total' : 'Kokku'}
          </span>
          <span className="text-2xl font-semibold tabular-nums text-[#c24d86]">€{price}</span>
        </div>
      </div>
      <button
        ref={desktopContinueRef}
        type="button"
        onClick={handleContinue}
        disabled={!selectedSlot}
        className={`mt-5 hidden w-full rounded-full py-3.5 text-[15px] font-semibold transition-all duration-[160ms] lg:block ${
          selectedSlot
            ? `bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_50%,#a93d71_100%)] text-white shadow-[0_12px_32px_-12px_rgba(194,77,134,0.5)] hover:shadow-[0_14px_36px_-10px_rgba(194,77,134,0.45)] active:scale-[0.99] ${desktopCtaPulse ? 'booking-desktop-cta-pulse !ring-4 !ring-[#c24d86]/35' : ''}`
            : 'cursor-not-allowed bg-[#ece8ea] text-[#9a9094]'
        }`}
      >
        {selectedSlot
          ? text('availability_continue', en ? 'Continue' : 'Jätka')
          : text('availability_select_for_continue', en ? 'Select a time' : 'Vali aeg')}
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in mx-auto max-w-[1100px]">
      <p className="mb-3 text-center text-[11px] font-medium tracking-wide text-[#b8a8b0] lg:mb-4">
        {en ? 'Times fill fast — book in advance.' : 'Ajad täituvad kiiresti — broneeri ette.'}
      </p>

      <div className="lg:grid lg:grid-cols-[minmax(260px,280px)_1fr] lg:items-start lg:gap-10">
        <aside className="mb-8 hidden lg:sticky lg:top-24 lg:mb-0 lg:block">
          <SummaryCard />
        </aside>

        <div className="min-w-0">
          <div className="mb-6 text-center lg:mb-8 lg:text-left">
            <h2 className="font-brand text-[1.65rem] font-semibold tracking-tight text-[#2f2530] md:text-[1.85rem]">
              {t('datetime.choose')}
            </h2>
            <p className="mt-2 text-[15px] text-[#745f6e]">{t('datetime.pickTime')}</p>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[#f0e8ec] bg-white/80 px-3 py-2.5 backdrop-blur-sm sm:px-4">
            <span className="text-sm font-semibold text-[#5d4a59]">{monthLabel}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setWeekOffset((p) => Math.max(0, p - 1))}
                disabled={weekOffset === 0}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ebe3e6] text-[#6f5769] transition-colors hover:bg-[#fff8fc] disabled:opacity-35"
                aria-label={en ? 'Previous week' : 'Eelmine nädal'}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-[#8a6b7e] hover:bg-[#fff5f9]"
              >
                {en ? 'Today' : 'Täna'}
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((p) => Math.min(maxWeekOffset, p + 1))}
                disabled={weekOffset >= maxWeekOffset}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ebe3e6] text-[#6f5769] transition-colors hover:bg-[#fff8fc] disabled:opacity-35"
                aria-label={en ? 'Next week' : 'Järgmine nädal'}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            ref={dayScrollRef}
            className="-mx-1 mb-6 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 pt-1 sm:gap-3 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:pb-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {weekDates.map((date, index) => {
              const key = toIsoDate(date);
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const dens = dayDensity(slotsByDate[key]);
              const weekday = date.toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', { weekday: 'short' });
              const badgeToday = isToday(date);
              const badgeTomorrow = !badgeToday && isTomorrow(date);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateSelect(date)}
                  className={`flex w-[4.75rem] shrink-0 snap-center flex-col items-center rounded-2xl border px-2.5 py-3 transition-[transform,box-shadow,border-color] duration-[160ms] motion-reduce:transition-none sm:w-[5.25rem] lg:w-[5.5rem] ${
                    isSelected
                      ? 'scale-[1.04] border-[#e8b8d0] bg-[linear-gradient(180deg,#fff8fc_0%,#fff0f6_100%)] shadow-[0_12px_28px_-14px_rgba(194,77,134,0.35)]'
                      : dens === 'none'
                        ? 'border-[#eeeaeb] bg-[#faf9f9] opacity-80 hover:opacity-100'
                        : 'border-[#ebe5e8] bg-white hover:border-[#e0d0d8] hover:shadow-[0_8px_20px_-14px_rgba(57,33,52,0.1)]'
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                      isSelected ? 'text-[#b04b80]' : 'text-[#8a7a88]'
                    }`}
                  >
                    {badgeToday ? (en ? 'Today' : 'Täna') : badgeTomorrow ? (en ? 'Tomorrow' : 'Homme') : weekday}
                  </span>
                  <span
                    className={`mt-1 text-xl font-bold tabular-nums ${isSelected ? 'text-[#2f2530]' : 'text-[#4a3d44]'}`}
                  >
                    {date.getDate()}
                  </span>
                  <div className="mt-2 flex h-1 w-full max-w-[2.5rem] gap-0.5 overflow-hidden rounded-full bg-[#f0ecee]">
                    {dens === 'full' && (
                      <>
                        <span className="h-full flex-1 rounded-full bg-[#5cb88a]" />
                        <span className="h-full flex-1 rounded-full bg-[#5cb88a]" />
                        <span className="h-full flex-1 rounded-full bg-[#5cb88a]" />
                      </>
                    )}
                    {dens === 'limited' && (
                      <>
                        <span className="h-full flex-1 rounded-full bg-[#e8c46c]" />
                        <span className="h-full w-1/3 rounded-full bg-[#e8e8ea]" />
                        <span className="h-full w-1/3 rounded-full bg-[#e8e8ea]" />
                      </>
                    )}
                    {dens === 'none' && <span className="h-full w-full rounded-full bg-[#d8d4d6]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] text-[#9a8a94]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#5cb88a]" />
              {en ? 'Many openings' : 'Palju vabu'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#e8c46c]" />
              {en ? 'Limited' : 'Vähe vabu'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#d8d4d6]" />
              {en ? 'Full' : 'Täis'}
            </span>
          </div>

          <div
            className={slotAreaShake ? 'booking-slot-area-shake rounded-2xl' : ''}
            id="booking-datetime-slot-area"
          >
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-[52px] rounded-full" />
              ))}
            </div>
          ) : emptyNoSlotsAtAll ? (
            <div className="rounded-2xl border border-[#f0e6ea] bg-[linear-gradient(180deg,#fffdfb_0%,#fff5f9_100%)] px-6 py-10 text-center shadow-[0_20px_48px_-32px_rgba(194,77,134,0.2)]">
              <p className="font-brand text-lg font-semibold text-[#2f2530]">
                {text('availability_no_slots', t('datetime.noSlots'))}
              </p>
              {nextAvailableSlot && (
                <>
                  <p className="mt-3 text-sm text-[#7a6a72]">
                    {en ? 'Next availability' : 'Järgmine vabadus'}{' '}
                    <span className="font-semibold text-[#b04b80]">
                      {daysBetween(new Date(), new Date(`${nextAvailableSlot.date}T12:00:00`)) === 0
                        ? en
                          ? 'today'
                          : 'täna'
                        : en
                          ? `in ${daysBetween(new Date(), new Date(`${nextAvailableSlot.date}T12:00:00`))} days`
                          : `${daysBetween(new Date(), new Date(`${nextAvailableSlot.date}T12:00:00`))} päeva pärast`}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={jumpToNextAvailable}
                    className="mt-6 rounded-full bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_50%,#a93d71_100%)] px-8 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-12px_rgba(194,77,134,0.45)] transition-transform duration-[160ms] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {en ? 'View next available' : 'Vaata järgmist'}
                  </button>
                </>
              )}
            </div>
          ) : showEmptyDay ? (
            <div className="rounded-2xl border border-[#f0e6ea] bg-[linear-gradient(180deg,#fffdfb_0%,#fff8fc_100%)] px-6 py-8 text-center">
              <p className="text-sm font-medium text-[#5d4a59]">
                {en ? 'No times left this day.' : 'Sellel päeval pole vabu aegu.'}
              </p>
              {daysUntilNext != null && daysUntilNext > 0 && (
                <p className="mt-2 text-sm text-[#8a7a88]">
                  {en
                    ? `Next availability in ${daysUntilNext} day${daysUntilNext === 1 ? '' : 's'}.`
                    : `Järgmine vabadus ${daysUntilNext} päeva pärast.`}
                </p>
              )}
              <button
                type="button"
                onClick={jumpToNextAvailable}
                className="mt-5 rounded-full border-2 border-[#c24d86] bg-white px-6 py-2.5 text-sm font-semibold text-[#c24d86] transition-colors hover:bg-[#fff5f9]"
              >
                {en ? 'View next available' : 'Vaata järgmist'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
              {currentSlots.map((slot) => (
                <DateTimeSlotPill
                  key={slot.id}
                  slot={slot}
                  isSelected={selectedSlot?.id === slot.id}
                  badge={slotBadges.get(slot.id) ?? null}
                  labels={pillLabels}
                  onSelect={handleSlotSelect}
                  justSelected={justSelectedId === slot.id}
                />
              ))}
            </div>
          )}
          </div>

          <div ref={mobileScrollNudgeRef} className="h-px w-full shrink-0 lg:hidden" aria-hidden />
        </div>
      </div>

      <div ref={continueButtonRef} className="h-1 w-full lg:hidden" aria-hidden />

      <div className="h-24 shrink-0 lg:hidden" aria-hidden />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] h-24 bg-[linear-gradient(180deg,transparent_0%,rgba(255,252,253,0.92)_50%,#fff9fb_100%)] lg:hidden" />

      <div className="fixed inset-x-0 bottom-0 z-[50] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div
          className={`pointer-events-auto flex h-16 w-full max-w-lg items-center gap-3 rounded-full border border-white/70 bg-white/72 px-4 shadow-[0_14px_40px_-14px_rgba(57,33,52,0.28)] backdrop-blur-xl transition-transform duration-[160ms] ease-out motion-reduce:transition-none ${
            mobileStickyLift ? 'booking-mobile-sticky-lift' : ''
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-[#2f2530]">{serviceShort}</p>
            <p className="truncate text-[13px] font-bold tabular-nums text-[#c24d86]">{selectedTimeLine}</p>
          </div>
          <button
            id="booking-sticky-primary-action"
            type="button"
            disabled={!selectedSlot}
            onClick={handleContinue}
            className={`shrink-0 rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all duration-[160ms] ${
              selectedSlot
                ? 'bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_50%,#a93d71_100%)] text-white shadow-[0_8px_24px_-8px_rgba(194,77,134,0.5)] active:scale-[0.98]'
                : 'cursor-not-allowed bg-[#e8e4e6] text-[#a09a9c]'
            }`}
          >
            {en ? 'Continue' : 'Jätka'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes bookingTimeSummaryIn {
          from {
            opacity: 0.85;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .booking-time-summary-animate {
          animation: bookingTimeSummaryIn 160ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .booking-time-summary-animate {
            animation: none;
          }
        }
        @keyframes bookingDesktopSummaryPulse {
          0%,
          100% {
            box-shadow: 0 16px 40px -28px rgba(57, 33, 52, 0.18);
          }
          50% {
            box-shadow:
              0 20px 48px -24px rgba(194, 77, 134, 0.28),
              0 0 0 2px rgba(194, 77, 134, 0.12);
          }
        }
        .booking-desktop-summary-pulse {
          animation: bookingDesktopSummaryPulse 520ms ease-in-out 2;
        }
        @keyframes bookingDesktopCtaPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
        .booking-desktop-cta-pulse {
          animation: bookingDesktopCtaPulse 450ms ease-out 2;
        }
        @keyframes bookingMobileStickyLift {
          0% {
            transform: translateY(10px);
            opacity: 0.92;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .booking-mobile-sticky-lift {
          animation: bookingMobileStickyLift 160ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .booking-desktop-summary-pulse,
          .booking-desktop-cta-pulse,
          .booking-mobile-sticky-lift {
            animation: none;
          }
        }
        @keyframes bookingSlotAreaShake {
          0%,
          100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-6px);
          }
          40% {
            transform: translateX(6px);
          }
          60% {
            transform: translateX(-4px);
          }
          80% {
            transform: translateX(4px);
          }
        }
        .booking-slot-area-shake {
          animation: bookingSlotAreaShake 0.55s ease-in-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .booking-slot-area-shake {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

export default DateTimeStep;
