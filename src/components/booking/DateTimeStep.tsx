'use client';

import { useState, useEffect, useMemo, useRef, useCallback, type RefObject } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';
import type { TimeSlot } from '@/store/booking-types';
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { trackEvent, trackSlotClick, touchBookingActivity } from '@/lib/analytics-client';
import { trackEvent as trackFunnelEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';
import { resolveEarliestUpcomingBookableSlot } from '@/lib/booking-engine/availability/earliest-slot';

function toIsoDate(date: Date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; }
function addDays(base: Date, n: number) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }
function daysBetween(a: Date, b: Date) { const u = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime(); const v = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime(); return Math.round((v - u) / 86400000); }

type Density = 'full' | 'limited' | 'none';
function dayDensity(slots: TimeSlot[] | undefined): Density { const n = (slots ?? []).filter((s) => s.available).length; if (n === 0) return 'none'; if (n <= 3) return 'limited'; return 'full'; }
function hasAvailableSlots(slots: TimeSlot[] | undefined): boolean { return (slots ?? []).some((slot) => slot.available); }

const BOOKING_SLOT_LOCK_KEY = 'booking_slot_lock';
const SLOT_LOCK_MS = 15 * 60 * 1000;
const HEADER_STICKY_PX = 76;
const SLOT_SELECT_SCROLL_DELAY_MS = 120;
const PROGRAMMATIC_SCROLL_GRACE_MS = 520;
const USER_SCROLL_IDLE_MS = 340;
const TOUCH_GUARD_MS = 300;
const TOUCH_MOVE_THRESHOLD_PX = 28;

export type DateTimeStepProps = { step3AnchorRef?: RefObject<HTMLElement | null> };

export function DateTimeStep({ step3AnchorRef }: DateTimeStepProps) {
  const { t, language } = useTranslation();
  const { text } = useBookingContent();
  const searchParams = useSearchParams();
  const selectedDate = useBookingStore((s) => s.selectedDate);
  const selectedSlot = useBookingStore((s) => s.selectedSlot);
  const selectedService = useBookingStore((s) => s.selectedService);
  const selectedVariant = useBookingStore((s) => s.selectedVariant);
  const selectDate = useBookingStore((s) => s.selectDate);
  const selectSlot = useBookingStore((s) => s.selectSlot);
  const nextStep = useBookingStore((s) => s.nextStep);

  const [isLoading, setIsLoading] = useState(false);
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, TimeSlot[]>>({});
  const [weekOffset, setWeekOffset] = useState(0);
  const [summaryAnimate, setSummaryAnimate] = useState(false);
  const [, setSummaryDesktopPulse] = useState(false);
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

  const weekDates = useMemo(() => { const base = new Date(); base.setHours(0, 0, 0, 0); return Array.from({ length: 10 }, (_, i) => addDays(base, weekOffset * 7 + i)); }, [weekOffset]);
  const availableWeekDates = useMemo(() => weekDates.filter((d) => hasAvailableSlots(slotsByDate[toIsoDate(d)])), [weekDates, slotsByDate]);
  const selectedDateKey = selectedDate ? toIsoDate(selectedDate) : toIsoDate(weekDates[0]);
  const currentSlots = useMemo(() => slotsByDate[selectedDateKey] ?? [], [slotsByDate, selectedDateKey]);
  const currentAvailableSlots = useMemo(() => currentSlots.filter((s) => s.available).slice().sort((a, b) => a.time.localeCompare(b.time)), [currentSlots]);

  useEffect(() => { if (isLoading || currentAvailableSlots.length === 0) return; if (slotsViewAtRef.current == null) slotsViewAtRef.current = Date.now(); trackBehaviorEvent('booking_slots_view', { slotsCount: currentAvailableSlots.length }); }, [isLoading, currentAvailableSlots.length]);

  const nextAvailableSlot = useMemo(() => resolveEarliestUpcomingBookableSlot(allSlots) ?? null, [allSlots]);

  useEffect(() => {
    let mounted = true;
    const loadSlots = async () => {
      setIsLoading(true);
      const start = toIsoDate(new Date()); const end = toIsoDate(addDays(new Date(), 60));
      try {
        const res = await fetch(`/api/slots?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}&smart=1&lang=${language}&serviceDuration=${selectedService?.duration ?? 0}`);
        if (!res.ok) throw new Error('Failed to load slots');
        const data = (await res.json()) as { slots?: TimeSlot[]; recommendedTimes?: TimeSlot[] };
        const loaded = data.slots ?? [];
        const map: Record<string, TimeSlot[]> = {};
        for (const s of loaded) { if (!map[s.date]) map[s.date] = []; map[s.date].push(s); }
        if (!mounted) return;
        setAllSlots(loaded); setSlotsByDate(map);
        const initialDate = initialSelectedDateRef.current ?? new Date();
        const initialKey = toIsoDate(initialDate);
        const initialDaySlots = map[initialKey] ?? [];
        const fallbackDate = weekDates.find((d) => hasAvailableSlots(map[toIsoDate(d)])) ?? initialDate;
        const targetDate = hasAvailableSlots(initialDaySlots) ? initialDate : fallbackDate;
        const targetKey = toIsoDate(targetDate);
        const targetDaySlots = map[targetKey] ?? [];
        selectDate(targetDate);
        const pSlot = preferredTimeRef.current ? targetDaySlots.find((s) => s.available && s.time === preferredTimeRef.current) : null;
        const existAvail = targetDaySlots.find((s) => s.id === initialSelectedSlotIdRef.current && s.available);
        const first = pSlot ?? existAvail ?? targetDaySlots.find((s) => s.available);
        if (first && first.id !== initialSelectedSlotIdRef.current) selectSlot(first);
      } catch (err) { console.error('DateTimeStep slots load error:', err); if (mounted) { setAllSlots([]); setSlotsByDate({}); } }
      finally { if (mounted) setIsLoading(false); }
    };
    void loadSlots();
    return () => { mounted = false; };
  }, [language, selectedService?.duration, selectDate, selectSlot, weekDates]);

  useEffect(() => { if (availableWeekDates.length === 0) return; if (!selectedDate) { selectDate(availableWeekDates[0]); return; } const k = toIsoDate(selectedDate); if (!availableWeekDates.some((d) => toIsoDate(d) === k)) selectDate(availableWeekDates[0]); }, [availableWeekDates, selectedDate, selectDate]);
  useEffect(() => { if (!selectedSlot) return; if (!currentAvailableSlots.some((s) => s.id === selectedSlot.id)) selectSlot(null); }, [currentAvailableSlots, selectedSlot, selectSlot]);

  useEffect(() => {
    try { if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('booking_shake_slots')) { sessionStorage.removeItem('booking_shake_slots'); setSlotAreaShake(true); const t = window.setTimeout(() => setSlotAreaShake(false), 650); return () => window.clearTimeout(t); } } catch { /* ignore */ }
    return undefined;
  }, []);

  useEffect(() => {
    let rt: number;
    const onScroll = () => { if (typeof window === 'undefined' || Date.now() < programmaticScrollUntilRef.current) return; isUserScrollingRef.current = true; window.clearTimeout(rt); rt = window.setTimeout(() => { isUserScrollingRef.current = false; }, USER_SCROLL_IDLE_MS); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(rt); };
  }, []);

  useEffect(() => {
    const onTs = (e: TouchEvent) => { const el = e.target as HTMLElement | null; if (el?.closest?.('[data-datetime-slot]')) ignoreTouchGestureUntilRef.current = Date.now() + 450; touchStartYRef.current = e.touches[0]?.clientY ?? 0; };
    const onTm = (e: TouchEvent) => { if (Date.now() < ignoreTouchGestureUntilRef.current) return; const el = e.target as HTMLElement | null; if (el?.closest?.('[data-datetime-slot]')) return; const y = e.touches[0]?.clientY ?? 0; if (Math.abs(y - touchStartYRef.current) > TOUCH_MOVE_THRESHOLD_PX) lastManualGestureRef.current = Date.now(); };
    window.addEventListener('touchstart', onTs, { passive: true }); window.addEventListener('touchmove', onTm, { passive: true });
    return () => { window.removeEventListener('touchstart', onTs); window.removeEventListener('touchmove', onTm); };
  }, []);

  const pulseDesktopSummary = useCallback(() => { setSummaryDesktopPulse(true); window.setTimeout(() => setSummaryDesktopPulse(false), 720); }, []);
  const triggerSummaryAnimate = useCallback(() => { setSummaryAnimate(true); window.setTimeout(() => setSummaryAnimate(false), 220); }, []);

  const runAutoScrollAfterSlotSelect = useCallback(() => {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || isUserScrollingRef.current || Date.now() - lastManualGestureRef.current < TOUCH_GUARD_MS) return;
    const isLg = window.matchMedia('(min-width: 1024px)').matches;
    const summaryEl = summaryDesktopInnerRef.current;
    if (isLg && summaryEl) {
      const r = summaryEl.getBoundingClientRect(); const vh = window.innerHeight; const inView = r.top >= HEADER_STICKY_PX - 6 && r.bottom <= vh + 12 && r.top < vh * 0.92;
      if (inView) { pulseDesktopSummary(); return; }
      const targetTop = r.top + window.scrollY - HEADER_STICKY_PX - 14;
      if (window.scrollY >= targetTop - 8) { pulseDesktopSummary(); return; }
      programmaticScrollUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_GRACE_MS; window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' }); window.setTimeout(() => pulseDesktopSummary(), 440); return;
    }
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (window.scrollY >= maxScroll - 32) { setMobileStickyLift(true); window.setTimeout(() => setMobileStickyLift(false), 400); return; }
    programmaticScrollUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_GRACE_MS; setMobileStickyLift(true); window.setTimeout(() => setMobileStickyLift(false), 420);
    const nudge = mobileScrollNudgeRef.current; const anchor = step3AnchorRef?.current;
    if (nudge) nudge.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
    else if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    else window.scrollBy({ top: Math.min(96, maxScroll - window.scrollY), behavior: 'smooth' });
  }, [pulseDesktopSummary, step3AnchorRef]);

  const handleDateSelect = (date: Date) => {
    selectDate(date);
    const daySlots = slotsByDate[toIsoDate(date)] ?? [];
    const pSlot = preferredTimeRef.current ? daySlots.find((s) => s.available && s.time === preferredTimeRef.current) : null;
    if (pSlot) selectSlot(pSlot);
  };

  const handleSlotSelect = useCallback(
    (slot: TimeSlot) => {
      if (!slot.available) return;
      ignoreTouchGestureUntilRef.current = Date.now() + 450;
      const prevSlotId = selectedSlot?.id ?? null;
      const hesitationTime = slotsViewAtRef.current != null ? Math.max(0, Math.round((Date.now() - slotsViewAtRef.current) / 1000)) : undefined;
      trackBehaviorEvent('slot_selected', { slotId: slot.id, slotTime: slot.time, hesitationTime, urgencyTimerActive: Boolean(lockExpiresAt && lockExpiresAt > Date.now()) });
      if (prevSlotId && prevSlotId !== slot.id) trackBehaviorEvent('slot_changed', { fromSlotId: prevSlotId, toSlotId: slot.id });
      touchBookingActivity(); trackSlotClick(slot.id);
      trackEvent({ eventType: 'booking_slot_selected', step: 2, serviceId: selectedService?.id, slotId: slot.id });
      trackFunnelEvent({ event: 'slot_clicked', serviceId: selectedService?.id, slotId: slot.id, metadata: { date: slot.date, time: slot.time, source: 'booking_step_2' }, language });
      const expiresAt = Date.now() + SLOT_LOCK_MS;
      try { localStorage.setItem(BOOKING_SLOT_LOCK_KEY, JSON.stringify({ slotId: slot.id, expiresAt })); } catch { /* ignore */ }
      setLockExpiresAt(expiresAt); trackBehaviorEvent('slot_lock_started', { slotId: slot.id, countdownSeconds: Math.round(SLOT_LOCK_MS / 1000) });
      selectSlot(slot);
      if (prevSlotId !== slot.id) triggerSummaryAnimate();
      window.setTimeout(() => runAutoScrollAfterSlotSelect(), SLOT_SELECT_SCROLL_DELAY_MS);
      window.setTimeout(() => { confirmationPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, SLOT_SELECT_SCROLL_DELAY_MS + 80);
    },
    [selectSlot, runAutoScrollAfterSlotSelect, selectedService?.id, language, selectedSlot?.id, lockExpiresAt, triggerSummaryAnimate]
  );

  const handleContinue = () => { if (selectedSlot) { nextStep(); continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };

  useEffect(() => {
    if (!selectedSlot) { setLockExpiresAt(null); setLockRemainingMs(null); return; }
    let initialExpires: number | null = null;
    try { const raw = localStorage.getItem(BOOKING_SLOT_LOCK_KEY); if (raw) { const p = JSON.parse(raw) as { slotId?: string; expiresAt?: number }; if (p?.slotId === selectedSlot.id && typeof p.expiresAt === 'number') initialExpires = p.expiresAt; } } catch { /* ignore */ }
    const nextE = initialExpires && initialExpires > Date.now() ? initialExpires : lockExpiresAt ?? Date.now() + SLOT_LOCK_MS;
    setLockExpiresAt(nextE);
    let raf: number | null = null;
    const tick = () => { setLockTickPulse((p) => !p); setLockRemainingMs(Math.max(0, nextE - Date.now())); raf = window.setTimeout(tick, 1000) as unknown as number; };
    tick();
    return () => { if (raf) window.clearTimeout(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlot?.id]);

  const formatMmSs = (ms: number) => { const total = Math.ceil(ms / 1000); const m = Math.floor(total / 60); const s = total % 60; return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };

  const lockLine = useMemo(() => { if (!selectedSlot || !lockRemainingMs || lockRemainingMs <= 0) return null; return en ? 'This time is reserved for you' : 'See aeg on sulle ajutiselt reserveeritud'; }, [selectedSlot, lockRemainingMs, en]);

  const availabilityContext = useMemo(() => {
    const av = currentAvailableSlots; const count = av.length; if (count === 0) return null;
    const morning = av.filter((s) => { const h = Number(s.time.split(':')[0] ?? 0); return Number.isFinite(h) && h >= 9 && h < 12; }).length;
    if (morning > 0 && count <= 3) return en ? 'A few morning times remain' : 'Paar hommikust aega saadaval';
    if (count <= 6) return en ? 'Limited availability' : 'Piiratud saadavus';
    return null;
  }, [currentAvailableSlots, en]);

  useEffect(() => {
    if (!selectedSlot) return;
    if (lockRemainingMs == null || lockRemainingMs > 0) return;
    trackBehaviorEvent('slot_lock_expired', { slotId: selectedSlot.id });
    trackFunnelEvent({ event: 'slot_abandoned', serviceId: selectedService?.id, slotId: selectedSlot.id, metadata: { reason: 'reservation_expired', date: selectedSlot.date, time: selectedSlot.time }, language });
    try { localStorage.removeItem(BOOKING_SLOT_LOCK_KEY); } catch { /* ignore */ }
    setReservationToast(en ? 'Reservation expired. Please select again.' : 'Broneering aegus. Palun vali uuesti.');
    try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('booking_shake_slots', '1'); } catch { /* ignore */ }
    selectSlot(null);
    const t = window.setTimeout(() => setReservationToast(null), 4800);
    return () => window.clearTimeout(t);
  }, [lockRemainingMs, selectedSlot, en, selectSlot, selectedService?.id, language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const active = Boolean(selectedSlot && lockRemainingMs != null && lockRemainingMs > 0);
    if (!active) return;
    const onBu = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = en ? 'Your reserved time may be released.' : 'Sinu broneeritud aeg võib vabaneda.'; return e.returnValue; };
    window.addEventListener('beforeunload', onBu);
    return () => window.removeEventListener('beforeunload', onBu);
  }, [selectedSlot, lockRemainingMs, en]);

  const jumpToNextAvailable = () => {
    if (!nextAvailableSlot) return;
    const d = new Date(`${nextAvailableSlot.date}T12:00:00`); const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = daysBetween(today, d); const newOffset = Math.max(0, Math.min(maxWeekOffset, Math.floor(diff / 7)));
    setWeekOffset(newOffset); window.requestAnimationFrame(() => { selectDate(d); selectSlot(nextAvailableSlot); dayScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' }); });
  };

  useEffect(() => {
    if (isLoading || currentAvailableSlots.length === 0) return;
    trackFunnelEvent({ event: 'slot_viewed', serviceId: selectedService?.id, metadata: { date: selectedDateKey, slots: currentAvailableSlots.length, available: currentAvailableSlots.length }, language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, selectedDateKey, currentAvailableSlots.length]);

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isTomorrow = (date: Date) => { const tm = new Date(); tm.setDate(tm.getDate() + 1); return date.toDateString() === tm.toDateString(); };

  const price = typeof selectedVariant?.price === 'number' ? selectedVariant.price : selectedService?.price ?? 0;
  const monthLabel = (availableWeekDates[0] ?? weekDates[0])?.toLocaleDateString(en ? 'en-GB' : 'et-EE', { month: 'long', year: 'numeric' });

  const selectedTimeLine = selectedSlot
    ? `${new Date(selectedSlot.date).toLocaleDateString(en ? 'en-GB' : 'et-EE', { weekday: 'short', day: 'numeric', month: 'short' })} · ${selectedSlot.time}`
    : en ? 'Pick a time' : 'Vali aeg';

  const showEmptyDay = !isLoading && currentAvailableSlots.length === 0 && Boolean(nextAvailableSlot);
  const emptyNoSlotsAtAll = !isLoading && availableWeekDates.length === 0;

  return (
    <div className="animate-fade-in w-full pb-[104px] lg:pb-0">
      {/* ─── RESERVATION STRIP — prominent ─── */}
      {lockLine && lockRemainingMs && lockRemainingMs > 0 && (
        <div className={`mb-4 flex items-center justify-between gap-3 rounded-[16px] bg-[#FFF5F9] px-4 py-3 ${lockTickPulse ? 'dt-countdown-pulse' : ''}`}>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c24d86] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#9f456f]" />
            </span>
            <span className="text-[13px] font-semibold text-[#6a3b57]">{lockLine}</span>
          </div>
          <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[18px] font-bold tabular-nums text-[#9f456f] shadow-[0_2px_8px_-4px_rgba(159,69,111,0.12)]">
            {formatMmSs(lockRemainingMs)}
          </span>
        </div>
      )}

      {reservationToast && (
        <div className="mb-4 rounded-2xl bg-[#fff4fb] px-4 py-3 text-sm font-medium text-[#6a3b57]" role="status">{reservationToast}</div>
      )}

      <h2 className="mb-4 font-brand text-[1.35rem] font-semibold tracking-tight text-[#1a1a1a] lg:text-[1.5rem]">
        {t('datetime.choose')}
      </h2>

      {/* ─── Month navigation ─── */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-[14px] border border-[#f0f0f0] bg-[#fafafa] px-4 py-2.5">
        <span className="text-[14px] font-semibold capitalize text-[#1a1a1a]">{monthLabel}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setWeekOffset((p) => Math.max(0, p - 1))} disabled={weekOffset === 0} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#666] transition hover:bg-[#f0f0f0] disabled:opacity-30" aria-label={en ? 'Previous week' : 'Eelmine nädal'}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          {weekOffset > 0 && (
            <button type="button" onClick={() => setWeekOffset(0)} className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[#9f456f] hover:bg-[#fff5f9]">{en ? 'Today' : 'Täna'}</button>
          )}
          <button type="button" onClick={() => setWeekOffset((p) => Math.min(maxWeekOffset, p + 1))} disabled={weekOffset >= maxWeekOffset} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#666] transition hover:bg-[#f0f0f0] disabled:opacity-30" aria-label={en ? 'Next week' : 'Järgmine nädal'}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── Day selector ─── */}
      <div ref={dayScrollRef} className="-mx-1 mb-4 flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1 pt-0.5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        {availableWeekDates.map((date, idx) => {
          const key = toIsoDate(date);
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          const dens = dayDensity(slotsByDate[key]);
          const weekday = date.toLocaleDateString(en ? 'en-GB' : 'et-EE', { weekday: 'short' });
          const badgeToday = isToday(date); const badgeTomorrow = !badgeToday && isTomorrow(date);
          return (
            <button key={idx} type="button" onClick={() => handleDateSelect(date)} className={`flex w-[4.25rem] shrink-0 snap-center flex-col items-center rounded-[14px] px-2 py-2.5 transition-all duration-150 sm:w-[4.5rem] ${
              isSelected ? 'bg-[#FFF5F9] shadow-[0_2px_12px_-6px_rgba(159,69,111,0.18)]' : dens === 'none' ? 'opacity-40' : 'hover:bg-[#fafafa]'
            }`}>
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? 'text-[#b04b80]' : 'text-[#999]'}`}>
                {badgeToday ? (en ? 'Today' : 'Täna') : badgeTomorrow ? (en ? 'Tmrw' : 'Homme') : weekday}
              </span>
              <span className={`mt-0.5 text-[18px] font-bold tabular-nums ${isSelected ? 'text-[#1a1a1a]' : 'text-[#444]'}`}>{date.getDate()}</span>
              <div className="mt-1 flex h-[3px] w-full max-w-[1.25rem] overflow-hidden rounded-full bg-[#eee]">
                {dens === 'full' && <span className="h-full w-full rounded-full bg-[#5cb88a]" />}
                {dens === 'limited' && <span className="h-full w-2/3 rounded-full bg-[#e8c46c]" />}
                {dens === 'none' && <span className="h-full w-full rounded-full bg-[#d8d4d6]" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Availability context */}
      {!lockLine && availabilityContext && !isLoading && currentAvailableSlots.length > 0 && (
        <p className="mb-3 text-[12px] font-medium text-[#999]">{availabilityContext}</p>
      )}

      {/* ─── Time slot grid ─── */}
      <div className={slotAreaShake ? 'dt-slot-shake rounded-2xl' : ''} id="booking-datetime-slot-area">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonBlock key={i} className="h-[56px] rounded-xl" />)}
          </div>
        ) : emptyNoSlotsAtAll ? (
          <div className="rounded-[16px] border border-[#f0f0f0] bg-[#fafafa] px-6 py-10 text-center">
            <p className="font-brand text-lg font-semibold text-[#1a1a1a]">{text('availability_no_slots', t('datetime.noSlots'))}</p>
            {nextAvailableSlot && (
              <>
                <p className="mt-3 text-sm text-[#777]">{en ? 'Next available' : 'Järgmine vaba aeg'}: <span className="font-semibold text-[#9f456f]">{daysBetween(new Date(), new Date(`${nextAvailableSlot.date}T12:00:00`)) === 1 ? en ? `tomorrow at ${nextAvailableSlot.time}` : `homme kell ${nextAvailableSlot.time}` : `${nextAvailableSlot.date} ${nextAvailableSlot.time}`}</span></p>
                <button type="button" onClick={jumpToNextAvailable} className="mt-6 rounded-xl bg-[linear-gradient(135deg,#8f3d62_0%,#9f456f_55%,#7f3559_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(159,69,111,0.4)] transition-transform active:scale-[0.98]">{en ? 'View next available' : 'Vaata järgmist'}</button>
              </>
            )}
          </div>
        ) : showEmptyDay ? (
          <div className="rounded-[16px] border border-[#f0f0f0] bg-[#fafafa] px-6 py-10 text-center">
            <p className="font-brand text-lg font-semibold text-[#1a1a1a]">{en ? 'Fully booked for this day' : 'See päev on broneeritud'}</p>
            {nextAvailableSlot && (
              <p className="mt-2 text-sm text-[#777]">{en ? 'Next available' : 'Järgmine vaba aeg'}{' '}<span className="font-semibold text-[#9f456f]">{daysBetween(new Date(), new Date(`${nextAvailableSlot.date}T12:00:00`)) === 1 ? en ? `tomorrow at ${nextAvailableSlot.time}` : `homme kell ${nextAvailableSlot.time}` : `${nextAvailableSlot.date} ${nextAvailableSlot.time}`}</span></p>
            )}
            <button type="button" onClick={jumpToNextAvailable} className="mt-6 inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#8f3d62_0%,#9f456f_55%,#7f3559_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(159,69,111,0.4)] transition-transform active:scale-[0.98]">{en ? 'View next day' : 'Vaata järgmist päeva'} →</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {currentAvailableSlots.map((slot) => {
              const isSel = selectedSlot?.id === slot.id;
              const dim = Boolean(selectedSlot) && !isSel;
              return (
                <button
                  key={slot.id} type="button" data-datetime-slot
                  onClick={() => handleSlotSelect(slot)}
                  onMouseEnter={() => { if (typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches) hoverStartsRef.current.set(slot.id, Date.now()); }}
                  onMouseLeave={() => { if (typeof window === 'undefined' || !window.matchMedia?.('(hover: hover)').matches) return; const st = hoverStartsRef.current.get(slot.id); if (!st) return; hoverStartsRef.current.delete(slot.id); trackBehaviorEvent('slot_hover', { slotId: slot.id, slotTime: slot.time, hoverDuration: Math.max(0, Date.now() - st) }); }}
                  className={[
                    'relative flex items-center justify-center rounded-[14px] border py-3.5 text-center transition-all duration-150 active:scale-[0.98]',
                    isSel
                      ? 'border-[#d9b8ca] bg-[#fff5f9] shadow-[0_8px_22px_-14px_rgba(159,69,111,0.30)] scale-[1.01] ring-1 ring-[#e7c9d8]'
                      : 'border-[#ece7ea] bg-white hover:scale-[1.015] hover:border-[#e2d6dc] hover:bg-[#fbf9fa]',
                    dim ? 'opacity-55' : '',
                  ].join(' ')}
                  aria-pressed={isSel}
                >
                  {isSel && (
                    <span className="absolute right-1.5 top-1.5 flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[#9f456f]" aria-hidden>
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                  <span className={`text-[15px] font-semibold tabular-nums ${isSel ? 'text-[#9f456f]' : 'text-[#1a1a1a]'}`}>{slot.time}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div ref={mobileScrollNudgeRef} className="h-px w-full shrink-0 lg:hidden" aria-hidden />

      {/* ─── Micro confirmation card ─── */}
      {selectedSlot && !isLoading && (
        <div className={`mt-4 rounded-[16px] border border-[#f0f0f0] bg-[#fafafa] px-4 py-3 transition-opacity duration-200 ${summaryAnimate ? 'dt-summary-animate' : ''}`}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#9f456f]">
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#1a1a1a]">
                {en ? 'Your selection' : 'Sinu valik'}: {selectedTimeLine}
              </p>
              <p className="text-[12px] text-[#888]">{selectedService?.name} · {selectedService?.duration} min · {`€${price}`}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Desktop confirmation strip ─── */}
      <div
        ref={confirmationPanelRef}
        className={`mt-4 hidden lg:block transition-opacity duration-200 ${selectedSlot ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-live="polite"
      >
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedSlot}
          className={`flex h-[52px] w-full items-center justify-center rounded-[14px] text-[15px] font-semibold transition-all duration-200 ${
            selectedSlot
              ? 'bg-[linear-gradient(135deg,#8f3d62_0%,#9f456f_55%,#7f3559_100%)] text-white shadow-[0_10px_28px_-12px_rgba(159,69,111,0.4)] active:scale-[0.98]'
              : 'cursor-not-allowed bg-[#f0f0f0] text-[#bbb]'
          }`}
        >
          {en ? 'Continue' : 'Kinnita valik'}
        </button>
      </div>

      <div ref={continueButtonRef} className="h-1 w-full lg:hidden" aria-hidden />

      {/* ─── Mobile sticky CTA ─── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] h-20 bg-[linear-gradient(180deg,transparent_0%,rgba(248,247,246,0.95)_50%,#f8f7f6_100%)] lg:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-[50] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className={`pointer-events-auto w-full max-w-md rounded-[16px] border border-[#efefef] bg-white p-3 shadow-[0_12px_36px_-16px_rgba(0,0,0,0.10)] transition-transform duration-150 ease-out ${mobileStickyLift ? 'dt-mobile-lift' : ''}`}>
          {selectedSlot && (
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#1a1a1a]">{selectedService?.name ?? '—'}</p>
                <p className="truncate text-[12px] text-[#888]">{selectedTimeLine}</p>
              </div>
              <span className="shrink-0 text-[16px] font-bold tabular-nums text-[#9f456f]">{`€${price}`}</span>
            </div>
          )}
          <button
            id="booking-sticky-primary-action" type="button" disabled={!selectedSlot} onClick={handleContinue}
            className={`h-[48px] w-full rounded-[12px] text-[14px] font-semibold transition-all duration-150 ${
              selectedSlot ? 'bg-[linear-gradient(135deg,#8f3d62_0%,#9f456f_55%,#7f3559_100%)] text-white shadow-[0_8px_24px_-10px_rgba(159,69,111,0.4)] active:scale-[0.98]' : 'cursor-not-allowed bg-[#f0f0f0] text-[#bbb] opacity-60'
            }`}
          >
            {en ? 'Continue' : 'Kinnita valik'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes dtSummaryIn { from { opacity: 0.85; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .dt-summary-animate { animation: dtSummaryIn 160ms ease-out both; }
        @keyframes dtDesktopPulse { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 0 3px rgba(159,69,111,0.08); } }
        .dt-desktop-pulse { animation: dtDesktopPulse 520ms ease-in-out 2; }
        @keyframes dtMobileLift { 0% { transform: translateY(8px); opacity: 0.92; } 100% { transform: translateY(0); opacity: 1; } }
        .dt-mobile-lift { animation: dtMobileLift 160ms ease-out both; }
        @keyframes dtCountdownPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.005); } }
        .dt-countdown-pulse { animation: dtCountdownPulse 650ms ease-in-out both; }
        @keyframes dtSlotShake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
        .dt-slot-shake { animation: dtSlotShake 0.55s ease-in-out; }
        @media (prefers-reduced-motion: reduce) { .dt-summary-animate, .dt-desktop-pulse, .dt-mobile-lift, .dt-countdown-pulse, .dt-slot-shake { animation: none; } }
      `}</style>
    </div>
  );
}

export default DateTimeStep;
