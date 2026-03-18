'use client';

import { useState, useEffect, useMemo, useRef, useCallback, type RefObject } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';
import type { TimeSlot } from '@/store/booking-types';
// (no badge types needed on mobile time grid)
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';
import { Check, ChevronLeft, ChevronRight, ShieldCheck, Star } from 'lucide-react';
import { trackEvent, trackSlotClick, touchBookingActivity } from '@/lib/analytics-client';
import { trackEvent as trackFunnelEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';

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
  const [summaryBump, setSummaryBump] = useState(0);
  const [summaryDesktopPulse, setSummaryDesktopPulse] = useState(false);
  const [mobileStickyLift, setMobileStickyLift] = useState(false);
  const [slotAreaShake, setSlotAreaShake] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);
  const [lockRemainingMs, setLockRemainingMs] = useState<number | null>(null);
  const [lockTickPulse, setLockTickPulse] = useState(false);
  const [reservationToast, setReservationToast] = useState<string | null>(null);
  const confirmationPanelRef = useRef<HTMLDivElement>(null);
  const continueButtonRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const summaryDesktopInnerRef = useRef<HTMLDivElement>(null);
  const mobileScrollNudgeRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const programmaticScrollUntilRef = useRef(0);
  const lastManualGestureRef = useRef(0);
  const touchStartYRef = useRef(0);
  const ignoreTouchGestureUntilRef = useRef(0);
  const preferredTimeRef = useRef(searchParams.get('time'));
  const initialSelectedDateRef = useRef<Date | null>(selectedDate);
  const initialSelectedSlotIdRef = useRef<string | null>(selectedSlot?.id ?? null);
  const slotsViewAtRef = useRef<number | null>(null);
  const hoverStartsRef = useRef<Map<string, number>>(new Map());
  const maxWeekOffset = 12;

  const en = language === 'en';

  const weekDates = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 10 }, (_, i) => addDays(base, weekOffset * 7 + i));
  }, [weekOffset]);

  const selectedDateKey = selectedDate ? toIsoDate(selectedDate) : toIsoDate(weekDates[0]);
  const currentSlots = slotsByDate[selectedDateKey] ?? [];

  useEffect(() => {
    if (isLoading) return;
    if (currentSlots.length === 0) return;
    if (slotsViewAtRef.current == null) slotsViewAtRef.current = Date.now();
    trackBehaviorEvent('booking_slots_view', { slotsCount: currentSlots.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, currentSlots.length]);

  const nextAvailableSlot = useMemo(
    () =>
      allSlots
        .filter((slot) => slot.available)
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0] ?? null,
    [allSlots]
  );

  const sortedAvailable = useMemo(() => {
    // Used by the countdown microcopy to estimate how full the day is.
    return currentSlots.filter((s) => s.available).sort((a, b) => a.time.localeCompare(b.time));
  }, [currentSlots]);

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
    window.setTimeout(() => {
      setSummaryDesktopPulse(false);
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
      const prevSlotId = selectedSlot?.id ?? null;
      const hesitationTime =
        slotsViewAtRef.current != null ? Math.max(0, Math.round((Date.now() - slotsViewAtRef.current) / 1000)) : undefined;
      trackBehaviorEvent('slot_selected', {
        slotId: slot.id,
        slotTime: slot.time,
        hesitationTime,
        urgencyTimerActive: Boolean(lockExpiresAt && lockExpiresAt > Date.now()),
      });
      if (prevSlotId && prevSlotId !== slot.id) {
        trackBehaviorEvent('slot_changed', { fromSlotId: prevSlotId, toSlotId: slot.id });
      }
      touchBookingActivity();
      trackSlotClick(slot.id);
      trackEvent({
        eventType: 'booking_slot_selected',
        step: 2,
        serviceId: selectedService?.id,
        slotId: slot.id,
      });
      trackFunnelEvent({
        event: 'slot_clicked',
        serviceId: selectedService?.id,
        slotId: slot.id,
        metadata: { date: slot.date, time: slot.time, source: 'booking_step_2' },
        language,
      });
      const expiresAt = Date.now() + SLOT_LOCK_MS;
      try {
        localStorage.setItem(
          BOOKING_SLOT_LOCK_KEY,
          JSON.stringify({ slotId: slot.id, expiresAt })
        );
      } catch {
        /* ignore */
      }
      setLockExpiresAt(expiresAt);
      trackBehaviorEvent('slot_lock_started', { slotId: slot.id, countdownSeconds: Math.round(SLOT_LOCK_MS / 1000) });
      selectSlot(slot);
      setSummaryBump((k) => k + 1);
      window.setTimeout(() => {
        runAutoScrollAfterSlotSelect();
      }, SLOT_SELECT_SCROLL_DELAY_MS);

      // Conversion: bring the confirmation panel into view.
      window.setTimeout(() => {
        confirmationPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, SLOT_SELECT_SCROLL_DELAY_MS + 80);
    },
    [selectSlot, runAutoScrollAfterSlotSelect, selectedService?.id, language, selectedSlot?.id, lockExpiresAt]
  );

  const handleContinue = () => {
    if (selectedSlot) {
      nextStep();
      continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Psychological reservation lock timer (UI only).
  // - Persisted in localStorage so it doesn't reset on re-renders.
  // - Tied to selectedSlot id; if user switches slot, it gets a new 5-minute window.
  useEffect(() => {
    if (!selectedSlot) {
      setLockExpiresAt(null);
      setLockRemainingMs(null);
      return;
    }

    let initialExpires: number | null = null;
    try {
      const raw = localStorage.getItem(BOOKING_SLOT_LOCK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { slotId?: string; expiresAt?: number };
        if (parsed?.slotId === selectedSlot.id && typeof parsed.expiresAt === 'number') {
          initialExpires = parsed.expiresAt;
        }
      }
    } catch {
      // ignore
    }

    const nextExpires = initialExpires && initialExpires > Date.now() ? initialExpires : lockExpiresAt ?? Date.now() + SLOT_LOCK_MS;
    setLockExpiresAt(nextExpires);

    let raf: number | null = null;
    const tick = () => {
      const remaining = Math.max(0, nextExpires - Date.now());
      setLockTickPulse((p) => !p);
      setLockRemainingMs(remaining);
      raf = window.setTimeout(tick, 1000) as unknown as number;
    };
    tick();
    return () => {
      if (raf) window.clearTimeout(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlot?.id]);

  const lockLine = useMemo(() => {
    if (!selectedSlot || !lockRemainingMs || lockRemainingMs <= 0) return null;
    const totalSec = Math.floor(lockRemainingMs / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    const av = sortedAvailable ?? [];
    const count = av.length;
    const morningCount = av.filter((s) => {
      const h = Number(s.time.split(':')[0] ?? 0);
      return Number.isFinite(h) && h >= 9 && h < 12;
    }).length;
    const eveningCount = av.filter((s) => {
      const h = Number(s.time.split(':')[0] ?? 0);
      return Number.isFinite(h) && h >= 17;
    }).length;

    let micro: string;
    if (count <= 3) {
      micro = en ? '3 people are viewing this time' : '3 inimest vaatab seda aega täna';
    } else if (morningCount > 0 && count <= 6) {
      micro = en ? 'Last morning slots available' : 'Viimased hommikused ajad täna';
    } else if (eveningCount > 0 && eveningCount <= 2) {
      micro = en ? 'Evening nearly full' : 'Õhtused ajad on peaaegu täis';
    } else if (count <= 6) {
      micro = en ? 'Times filling fast today' : 'Ajad täituvad kiiresti täna';
    } else {
      micro = en ? 'Time locked for you' : 'Aeg lukus sinu jaoks';
    }

    return `${micro} — ${String(mm).padStart(1, '0')}:${String(ss).padStart(2, '0')}`;
  }, [selectedSlot, lockRemainingMs, en, sortedAvailable]);

  const lockUrgencyLine = useMemo(() => {
    if (!selectedSlot || !lockRemainingMs || lockRemainingMs <= 0) return null;
    const totalSec = Math.floor(lockRemainingMs / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    const prefix = en ? 'Time locked for you' : 'Aeg lukus sinu jaoks';
    return `${prefix} — ${mm}:${String(ss).padStart(2, '0')}`;
  }, [selectedSlot, lockRemainingMs, en]);

  const availabilityContext = useMemo(() => {
    const av = currentSlots.filter((s) => s.available);
    const count = av.length;
    if (count === 0) return null;
    const evening = av.filter((s) => {
      const h = Number(s.time.split(':')[0] ?? 0);
      return Number.isFinite(h) && h >= 17;
    }).length;
    const morning = av.filter((s) => {
      const h = Number(s.time.split(':')[0] ?? 0);
      return Number.isFinite(h) && h >= 9 && h < 12;
    }).length;

    if (morning > 0 && count <= 3) return en ? 'Last morning slots available' : 'Viimased hommikused ajad täna';
    if (count <= 6) return en ? 'Times filling fast today' : 'Ajad täituvad kiiresti täna';
    if (evening > 0 && evening <= 2) return en ? 'Evening nearly full' : 'Õhtused ajad on peaaegu täis';
    return en ? 'Choose your favourite time' : 'Vali endale sobiv aeg';
  }, [currentSlots, en]);

  // Reservation expiry (UI-only): if countdown reaches 0, deselect and prompt user.
  useEffect(() => {
    if (!selectedSlot) return;
    if (lockRemainingMs == null) return;
    if (lockRemainingMs > 0) return;

    trackBehaviorEvent('slot_lock_expired', { slotId: selectedSlot.id });
    trackFunnelEvent({
      event: 'slot_abandoned',
      serviceId: selectedService?.id,
      slotId: selectedSlot.id,
      metadata: { reason: 'reservation_expired', date: selectedSlot.date, time: selectedSlot.time },
      language,
    });

    try {
      localStorage.removeItem(BOOKING_SLOT_LOCK_KEY);
    } catch {
      // ignore
    }
    setReservationToast(en ? 'Reservation expired. Please select again.' : 'Broneering aegus. Palun vali uuesti.');
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('booking_shake_slots', '1');
    } catch {
      // ignore
    }
    selectSlot(null);
    const t = window.setTimeout(() => setReservationToast(null), 4800);
    return () => window.clearTimeout(t);
  }, [lockRemainingMs, selectedSlot?.id, en, selectSlot, selectedService?.id, language]);

  // Abandonment recovery: warn on leaving while a time is reserved.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const active = Boolean(selectedSlot && lockRemainingMs != null && lockRemainingMs > 0);
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = en ? 'Your reserved time may be released.' : 'Sinu broneeritud aeg võib vabaneda.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [selectedSlot?.id, lockRemainingMs, en]);

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

  const selectedTimeLineDash = selectedTimeLine.replace(' · ', ' — ');

  const showEmptyDay =
    !isLoading && currentSlots.length > 0 && !currentSlots.some((s) => s.available) && nextAvailableSlot;

  const emptyNoSlotsAtAll = !isLoading && currentSlots.length === 0;

  // Funnel analytics: slot list viewed (once per selected date view).
  useEffect(() => {
    if (isLoading) return;
    if (currentSlots.length === 0) return;
    trackFunnelEvent({
      event: 'slot_viewed',
      serviceId: selectedService?.id,
      metadata: {
        date: selectedDateKey,
        slots: currentSlots.length,
        available: currentSlots.filter((s) => s.available).length,
      },
      language,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, selectedDateKey]);

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
      <p className="mt-2 text-[13px] font-semibold text-[#6a3b57]">
        {en ? 'Almost done — choose time' : 'Peaaegu valmis — vali aeg'}
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
        type="button"
        onClick={() => document.getElementById('booking-datetime-slot-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-[#f0e6ec] bg-white/70 px-4 py-3 text-[14px] font-semibold text-[#c24d86] transition-all duration-[160ms] hover:bg-white active:scale-[0.99] lg:block"
      >
        {en ? 'Choose time' : 'Vali aeg'}
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in w-full pb-[104px] lg:pb-0">
      {/* Sticky progress + trust strip (Step 2) */}
      <div className="sticky top-0 z-30 -mx-4 mb-3 border-b border-[#f0e8ec] bg-white/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:mx-0 lg:static lg:rounded-2xl lg:border lg:border-[#f0e8ec] lg:shadow-[0_10px_30px_-22px_rgba(57,33,52,0.18)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">
          {en ? 'Step 2 of 3 — Choose Time' : 'Samm 2/3 — Vali aeg'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-medium text-[#7a6a72]">
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-4 w-4 text-[#b85c8a]" strokeWidth={1.8} /> 4.9
          </span>
          <span className="h-1 w-1 rounded-full bg-[#d4c8cc]" aria-hidden />
          <span>{en ? '1200+ clients' : '1200+ klienti'}</span>
          <span className="h-1 w-1 rounded-full bg-[#d4c8cc]" aria-hidden />
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#6b9b7a]" strokeWidth={1.8} />
            {en ? 'Medical level hygiene' : 'Meditsiiniline hügieen'}
          </span>
          {lockLine && (
            <>
              <span className="h-1 w-1 rounded-full bg-[#d4c8cc] lg:hidden" aria-hidden />
              <span
                className={`inline-flex items-center gap-2 rounded-full border border-[#ead6e2] bg-[#fff7fb] px-3 py-1 text-[11px] font-semibold text-[#6a3b57] lg:hidden ${
                  lockTickPulse ? 'booking-countdown-tick-pulse' : ''
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c24d86]" aria-hidden />
                </span>
                {lockLine}
              </span>
            </>
          )}
        </div>
      </div>

      {reservationToast && (
        <div
          className="mb-4 rounded-2xl border border-[#f0d6e3] bg-[#fff4fb] px-4 py-3 text-sm font-medium text-[#6a3b57] shadow-[0_14px_34px_-22px_rgba(57,33,52,0.22)]"
          role="status"
        >
          {reservationToast}
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-10">
        <aside className="hidden lg:sticky lg:top-[120px] lg:block">
          <SummaryCard />
        </aside>

        <div className="min-w-0">
          <div className="mb-4 text-center lg:text-left">
            <h2 className="font-brand text-[1.65rem] font-semibold tracking-tight text-[#2f2530] md:text-[1.85rem]">
              {t('datetime.choose')}
            </h2>
            <p className="mt-2 text-[15px] text-[#745f6e]">{t('datetime.pickTime')}</p>
          </div>

          {lockUrgencyLine && (
            <div className="booking-urgency-pulse hidden lg:sticky lg:top-[120px] z-20 mb-4 w-full rounded-full border border-[#ead6e2]/90 bg-white/70 px-5 py-2.5 text-[13px] font-semibold text-[#6a3b57] backdrop-blur-xl shadow-[0_14px_34px_-22px_rgba(57,33,52,0.22)]">
              <span className="inline-flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c24d86] opacity-50" aria-hidden />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c24d86]" aria-hidden />
                </span>
                {lockUrgencyLine}
              </span>
            </div>
          )}

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

          <div className="hidden lg:flex mb-6 flex-wrap items-center gap-3 text-[10px] text-[#9a8a94]">
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

          <div className={slotAreaShake ? 'booking-slot-area-shake rounded-2xl' : ''} id="booking-datetime-slot-area">
          {availabilityContext && !isLoading && currentSlots.length > 0 && (
            <div className="hidden lg:block mb-4 rounded-2xl border border-[#efe0e8] bg-white/80 px-4 py-3 text-sm font-medium text-[#5d4558] shadow-[0_12px_30px_-24px_rgba(57,33,52,0.16)]">
              {availabilityContext}
            </div>
          )}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-[68px] rounded-2xl lg:h-[72px]" />
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
                    {en ? 'Next available time' : 'Järgmine vaba aeg'}:{' '}
                    <span className="font-semibold text-[#b04b80]">
                      {daysBetween(new Date(), new Date(`${nextAvailableSlot.date}T12:00:00`)) === 1
                        ? en
                          ? `tomorrow at ${nextAvailableSlot.time}`
                          : `homme kell ${nextAvailableSlot.time}`
                        : `${nextAvailableSlot.date} ${nextAvailableSlot.time}`}
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
            <div className="rounded-2xl border border-[#f0e6ea] bg-[linear-gradient(180deg,#fffdfb_0%,#fff8fc_100%)] px-6 py-10 text-center shadow-[0_18px_44px_-30px_rgba(57,33,52,0.16)]">
              <p className="font-brand text-lg font-semibold text-[#2f2530]">
                {en ? 'Today is fully booked.' : 'Täna on täis broneeritud.'}
              </p>
              {nextAvailableSlot && (
                <p className="mt-2 text-sm text-[#7a6a72]">
                  {en ? 'Next available time' : 'Järgmine vaba aeg'}{' '}
                  <span className="font-semibold text-[#b04b80]">
                    {daysBetween(new Date(), new Date(`${nextAvailableSlot.date}T12:00:00`)) === 1
                      ? en
                        ? `tomorrow at ${nextAvailableSlot.time}`
                        : `homme kell ${nextAvailableSlot.time}`
                      : `${nextAvailableSlot.date} ${nextAvailableSlot.time}`}
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={jumpToNextAvailable}
                className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_50%,#a93d71_100%)] px-8 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-12px_rgba(194,77,134,0.45)] transition-transform duration-[160ms] hover:scale-[1.02] active:scale-[0.98]"
              >
                {en ? 'View next day' : 'Vaata järgmist päeva'} →
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {currentSlots.map((slot) => {
                  const isSelected = selectedSlot?.id === slot.id;
                  const isAvailable = slot.available;
                  const dimOthers = Boolean(selectedSlot) && !isSelected;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleSlotSelect(slot)}
                      onMouseEnter={() => {
                        if (typeof window === 'undefined') return;
                        if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
                          hoverStartsRef.current.set(slot.id, Date.now());
                        }
                      }}
                      onMouseLeave={() => {
                        if (typeof window === 'undefined') return;
                        if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
                          const start = hoverStartsRef.current.get(slot.id);
                          if (!start) return;
                          hoverStartsRef.current.delete(slot.id);
                          const hoverDuration = Math.max(0, Date.now() - start);
                          trackBehaviorEvent('slot_hover', {
                            slotId: slot.id,
                            slotTime: slot.time,
                            hoverDuration,
                          });
                        }
                      }}
                      className={[
                        'relative min-h-[72px] rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 motion-reduce:transition-none',
                        isAvailable
                          ? 'bg-white shadow-[0_10px_26px_-18px_rgba(57,33,52,0.14)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-22px_rgba(57,33,52,0.20)]'
                          : 'cursor-not-allowed border-[#eeeaeb] bg-[#f7f7f7] text-[#b5a8ad]',
                        isSelected
                          ? 'border-[#e8b8d0] bg-[linear-gradient(135deg,#fff2f9_0%,#ffe9f3_45%,#fffdfc_100%)] ring-2 ring-[#c24d86]/25 shadow-[0_18px_40px_-28px_rgba(194,77,134,0.35)] scale-[1.02]'
                          : 'border-[#ebe5e8]',
                        dimOthers ? 'opacity-80' : '',
                      ].join(' ')}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[18px] font-semibold leading-[1.2] tabular-nums text-[#2f2530] lg:text-[14px]">
                            {slot.time}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c24d86] text-white shadow-[0_12px_24px_-14px_rgba(194,77,134,0.65)]">
                            <Check className="h-4 w-4" strokeWidth={2.4} />
                          </span>
                        )}
                      </div>
                      {isAvailable && !isSelected && (
                        <p className="mt-2 text-[12px] font-semibold text-[#7a6a72]">
                          {en ? 'Select time' : 'Vali aeg'}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Optional subtle popularity signal */}
              <p className="hidden">
                {sortedAvailable.length > 0
                  ? en
                    ? 'Some times book fastest — choose quickly to secure your preferred slot.'
                    : 'Mõned ajad broneeritakse kiiremini — vali kiiresti, et kindlustada sobiv aeg.'
                  : en
                    ? 'Select a day to see openings.'
                    : 'Vali päev, et näha vabu aegu.'}
              </p>

              {/* Safe reassurance */}
              <div className="mt-4 rounded-2xl border border-[#f0e6ea] bg-white/90 p-5 shadow-[0_12px_32px_-30px_rgba(57,33,52,0.16)] lg:hidden">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#6b9b7a]" strokeWidth={2.2} />
                  <p className="text-sm font-semibold text-[#2f2530]">
                    {en ? 'Safe booking' : 'Turvaline broneering'}
                  </p>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="flex items-center gap-2 text-[13px] text-[#6f6168]">
                    <Check className="h-4 w-4 text-[#6b9b7a]" strokeWidth={2.4} />
                    <span>{en ? 'Change later' : 'Muuda hiljem'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#6f6168]">
                    <Check className="h-4 w-4 text-[#6b9b7a]" strokeWidth={2.4} />
                    <span>{en ? 'Deposit confirms' : 'Ettemaks kinnitab'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#6f6168]">
                    <Check className="h-4 w-4 text-[#6b9b7a]" strokeWidth={2.4} />
                    <span>{en ? 'No hidden fees' : 'Peidetud tasusid ei ole'}</span>
                  </div>
                </div>
              </div>
            </>
          )}
          </div>

          <div ref={mobileScrollNudgeRef} className="h-px w-full shrink-0 lg:hidden" aria-hidden />

          {/* Desktop confirmation panel (sticky within flow) */}
          <div
            ref={confirmationPanelRef}
            className="mt-4 hidden lg:block"
            aria-live="polite"
          >
            <div className="w-full rounded-[26px] border border-white/70 bg-white/80 p-5 shadow-[0_20px_48px_-28px_rgba(57,33,52,0.18)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">
                    {en ? 'Confirm selection' : 'Kinnita valik'}
                  </p>
                  <p className="mt-2 truncate font-brand text-xl font-semibold text-[#2f2530]">{selectedService?.name ?? '—'}</p>
                  <p className="mt-1 text-[14px] font-semibold tabular-nums text-[#c24d86]">{selectedTimeLine}</p>
                  {selectedService?.duration ? (
                    <p className="mt-1 text-[13px] text-[#7a6a72]">
                      {en ? 'Duration' : 'Kestus'}: <span className="font-semibold">{selectedService.duration} {en ? 'min' : 'min'}</span>
                    </p>
                  ) : null}
                  {lockLine ? (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#ead6e2] bg-[#fff7fb] px-3 py-1 text-[12px] font-semibold text-[#6a3b57]">
                      <span className="h-2 w-2 rounded-full bg-[#c24d86]" aria-hidden />
                      {lockLine}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!selectedSlot}
                  className={`mt-1 inline-flex min-h-[52px] shrink-0 items-center justify-center rounded-2xl px-7 text-[15px] font-semibold transition-all duration-[160ms] ${
                    selectedSlot
                      ? 'bg-[linear-gradient(135deg,#1f171d_0%,#2a2228_55%,#1c151b_100%)] text-white shadow-[0_18px_40px_-18px_rgba(31,23,29,0.55)] hover:shadow-[0_20px_46px_-18px_rgba(31,23,29,0.5)] active:scale-[0.99]'
                      : 'cursor-not-allowed bg-[#ece8ea] text-[#9a9094]'
                  }`}
                >
                  {en ? 'Continue Booking →' : 'Jätka broneerimist →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={continueButtonRef} className="h-1 w-full lg:hidden" aria-hidden />
      {selectedSlot && (
        <div className="mx-auto mt-4 w-full max-w-lg px-3 lg:hidden">
          <div className="rounded-[22px] border border-[#f0e8ed] bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(57,33,52,0.18)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b8a8b0]">
              {en ? 'Your selection' : 'Sinu valik'}
            </p>
            <p className="mt-2 text-[16px] font-brand font-semibold text-[#2f2530]">{selectedService?.name ?? '—'}</p>
            <p className="mt-1 text-[13px] font-medium text-[#5d4a56]">{selectedTimeLineDash}</p>
            <p className="mt-2 text-[18px] font-semibold tabular-nums text-[#c24d86]">€{price}</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] h-20 bg-[linear-gradient(180deg,transparent_0%,rgba(255,252,253,0.92)_45%,#fff9fb_100%)] shadow-[0_-20px_40px_-30px_rgba(57,33,52,0.28)] lg:hidden" />

      {/* Sticky bottom confirmation panel (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-[50] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div
          className={`pointer-events-auto w-full max-w-lg rounded-[22px] border border-white/70 bg-white/90 p-3 shadow-[0_18px_48px_-18px_rgba(57,33,52,0.28)] backdrop-blur-xl transition-transform duration-[160ms] ease-out motion-reduce:transition-none ${
            mobileStickyLift ? 'booking-mobile-sticky-lift' : ''
          }`}
        >
          <div className="w-full">
            <button
              id="booking-sticky-primary-action"
              type="button"
              disabled={!selectedSlot}
              onClick={handleContinue}
              className={`h-[56px] w-full rounded-[22px] px-5 text-[15px] font-semibold transition-all duration-[200ms] ${
                selectedSlot
                  ? 'bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_50%,#a93d71_100%)] text-white shadow-[0_12px_28px_-14px_rgba(194,77,134,0.45)] active:scale-[0.99] opacity-100 translate-y-0'
                  : 'cursor-not-allowed bg-[#e8e4e6] text-[#a09a9c] opacity-60 translate-y-[1px]'
              }`}
            >
              {en ? 'Continue Booking →' : 'Jätka broneerimist →'}
            </button>
          </div>
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

        @keyframes bookingCountdownTickPulse {
          0%,
          100% {
            transform: translateY(0) scale(1);
            box-shadow: 0 14px 34px -22px rgba(57, 33, 52, 0.22);
          }
          50% {
            transform: translateY(-1px) scale(1.02);
            box-shadow:
              0 20px 48px -24px rgba(194, 77, 134, 0.28),
              0 0 0 2px rgba(194, 77, 134, 0.14);
          }
        }

        .booking-countdown-tick-pulse {
          animation: bookingCountdownTickPulse 650ms ease-in-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .booking-desktop-summary-pulse,
          .booking-desktop-cta-pulse,
          .booking-mobile-sticky-lift,
          .booking-urgency-pulse,
          .booking-countdown-tick-pulse {
            animation: none;
          }
        }

        @keyframes bookingUrgencyPulse {
          0%,
          100% {
            box-shadow: 0 14px 34px -22px rgba(57, 33, 52, 0.22);
          }
          50% {
            box-shadow:
              0 20px 48px -24px rgba(194, 77, 134, 0.28),
              0 0 0 2px rgba(194, 77, 134, 0.14);
          }
        }
        .booking-urgency-pulse {
          animation: bookingUrgencyPulse 1.8s ease-in-out 2;
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
