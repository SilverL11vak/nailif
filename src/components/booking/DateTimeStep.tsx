'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';
import type { TimeSlot } from '@/store/booking-types';
import TimeSlotComponent from './TimeSlot';
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';

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

export function DateTimeStep() {
  const { t, language } = useTranslation();
  const { text } = useBookingContent();
  const searchParams = useSearchParams();
  const selectedDate = useBookingStore((state) => state.selectedDate);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectDate = useBookingStore((state) => state.selectDate);
  const selectSlot = useBookingStore((state) => state.selectSlot);
  const nextStep = useBookingStore((state) => state.nextStep);

  const [isLoading, setIsLoading] = useState(false);
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([]);
  const [recommendedSlots, setRecommendedSlots] = useState<TimeSlot[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, TimeSlot[]>>({});
  const [showSelectedMsg, setShowSelectedMsg] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const continueButtonRef = useRef<HTMLDivElement>(null);
  const preferredTimeRef = useRef(searchParams.get('time'));
  const initialSelectedDateRef = useRef<Date | null>(selectedDate);
  const initialSelectedSlotIdRef = useRef<string | null>(selectedSlot?.id ?? null);
  const maxWeekOffset = 12;

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

        const preferredSlot = preferredTimeRef.current ? daySlots.find((slot) => slot.available && slot.time === preferredTimeRef.current) : null;
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

  const handleDateSelect = (date: Date) => {
    selectDate(date);
    const daySlots = slotsByDate[toIsoDate(date)] ?? [];
    const preferredSlot = preferredTimeRef.current ? daySlots.find((slot) => slot.available && slot.time === preferredTimeRef.current) : null;
    if (preferredSlot) {
      selectSlot(preferredSlot);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    selectSlot(slot);
    setShowSelectedMsg(true);
    setTimeout(() => setShowSelectedMsg(false), 1200);
  };

  const handleContinue = () => {
    if (selectedSlot) {
      nextStep();
      continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const hasAvailableSlots = (date: Date) => (slotsByDate[toIsoDate(date)] ?? []).some((slot) => slot.available);
  const monthLabel = weekDates[0]?.toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', { month: 'long', year: 'numeric' });

  return (
    <div className="animate-fade-in">
      <div className="mb-7 text-center">
        <p className="mb-2 text-[11px] uppercase tracking-[0.26em] text-[#b77f9f]">Samm 2</p>
        <h2 className="mb-2 text-2xl font-semibold text-[#2f2622]">{t('datetime.choose')}</h2>
        <p className="text-[#745f6e]">{t('datetime.pickTime')}</p>
        <p className="mt-2 text-sm text-[#7f6677]">
          {language === 'en' ? 'Choose a day first, then pick a time.' : 'Vali koigepealt paev, siis kellaaeg.'}
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-[#efdfe8] bg-white px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-[#6f5769]">{monthLabel}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((prev) => Math.max(0, prev - 4))}
              disabled={weekOffset === 0}
              className="rounded-full border border-[#e7d7e1] px-3 py-1.5 text-xs text-[#6f5769] disabled:opacity-40"
            >
              {language === 'en' ? 'Prev month' : 'Eelmine kuu'}
            </button>
            <button
              onClick={() => setWeekOffset((prev) => Math.min(maxWeekOffset, prev + 4))}
              disabled={weekOffset >= maxWeekOffset}
              className="rounded-full border border-[#e7d7e1] px-3 py-1.5 text-xs text-[#6f5769] disabled:opacity-40"
            >
              {language === 'en' ? 'Next month' : 'Järgmine kuu'}
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
            disabled={weekOffset === 0}
            className="rounded-full border border-[#e7d7e1] px-3 py-1.5 text-xs text-[#6f5769] disabled:opacity-40"
          >
            {language === 'en' ? 'Prev week' : 'Eelmine nädal'}
          </button>
          <button
            onClick={() => setWeekOffset((prev) => Math.min(maxWeekOffset, prev + 1))}
            disabled={weekOffset >= maxWeekOffset}
            className="rounded-full border border-[#e7d7e1] px-3 py-1.5 text-xs text-[#6f5769] disabled:opacity-40"
          >
            {language === 'en' ? 'Next week' : 'Järgmine nädal'}
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="rounded-full border border-[#e7d7e1] px-3 py-1.5 text-xs text-[#6f5769]"
          >
            {language === 'en' ? 'This week' : 'See nädal'}
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-5 gap-2 sm:flex sm:overflow-x-auto sm:pb-2">
        {weekDates.map((date, index) => {
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          const hasSlots = hasAvailableSlots(date);
          const weekday = date.toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', { weekday: 'short' });

          return (
            <button
              key={index}
              onClick={() => handleDateSelect(date)}
              className={`flex h-[5.1rem] w-[4.2rem] flex-shrink-0 flex-col items-center justify-center rounded-[20px] border transition-all duration-200 ${
                isSelected
                  ? 'border-[#d9a9c4] bg-[#fff5fb] shadow-[0_14px_22px_-18px_rgba(116,47,93,0.34)]'
                  : hasSlots
                    ? 'border-[#ecdde7] bg-white hover:border-[#d5b1c8]'
                    : 'border-[#f1e6ee] bg-[#fff8fc]'
              }`}
            >
              <span className={`text-[11px] font-medium ${isSelected ? 'text-[#8c5f79]' : 'text-[#75657a]'}`}>
                {isToday(date) ? (language === 'en' ? 'Today' : 'Täna') : weekday}
              </span>
              <span className={`text-xl font-semibold ${isSelected ? 'text-[#a0497b]' : 'text-[#4a3344]'}`}>{date.getDate()}</span>
              <span className={`mt-1 h-1.5 w-1.5 rounded-full ${hasSlots ? 'bg-[#82a671]' : 'bg-[#d4c1cd]'}`} />
            </button>
          );
        })}
      </div>

      {recommendedSlots.length > 0 && (
        <div className="mb-4 rounded-2xl border border-[#ecdce6] bg-[#fff7fc] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9d6c89]">
            {language === 'en' ? 'Recommended times' : 'Soovitatud ajad'}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {recommendedSlots.map((slot) => (
              <button
                key={`recommended-${slot.id}`}
                type="button"
                onClick={() => {
                  selectDate(new Date(`${slot.date}T00:00:00`));
                  handleSlotSelect(slot);
                }}
                className="rounded-xl border border-[#e7d8e2] bg-white px-3 py-2 text-left transition hover:border-[#d3a8c2] hover:bg-[#fff6fb]"
              >
                  <p className="text-xs font-semibold text-[#7d6275]">
                  {new Date(`${slot.date}T00:00:00`).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
                  <p className="text-base font-semibold text-[#5f4358]">{slot.time}</p>
                  <p className="mt-1 text-[11px] text-[#7f6677]">
                  {slot.isSos
                    ? language === 'en'
                      ? 'Urgent slot'
                      : 'Kiire aeg'
                    : slot.isPopular
                      ? language === 'en'
                        ? 'Popular time'
                        : 'Populaarne aeg'
                      : language === 'en'
                        ? 'Good fit'
                        : 'Hea sobivus'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {showSelectedMsg && selectedSlot && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#d7e7db] bg-[#f2f8f4] px-3 py-2 text-sm text-[#4f6f59]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{language === 'en' ? 'Time selected. Let us continue.' : 'Aeg valitud. Liigume edasi.'}</span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-[#4d3a53]">{language === 'en' ? 'Available times' : 'Vabad kellaajad'}</h3>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {currentSlots.map((slot) => (
              <TimeSlotComponent key={slot.id} slot={slot} isSelected={selectedSlot?.id === slot.id} onSelect={handleSlotSelect} />
            ))}
          </div>
        )}

        {!isLoading && currentSlots.length === 0 && (
          <div className="rounded-xl border border-[#eee0e9] bg-[#fff8fc] px-4 py-6 text-center text-[#745f6e]">
            <p>{text('availability_no_slots', t('datetime.noSlots'))}</p>
            <p className="text-sm">{text('availability_try_another', t('datetime.tryAnother'))}</p>
            {nextAvailableSlot && (
              <p className="mt-2 text-sm font-medium text-[#9d6e8a]">
                {language === 'en' ? 'Next free time:' : 'Järgmine vaba aeg:'}{' '}
                {new Date(`${nextAvailableSlot.date}T00:00:00`).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                {nextAvailableSlot.time}
              </p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selectedSlot}
        className={`cta-premium w-full rounded-2xl py-5 text-base font-semibold transition-all duration-200 ${
          selectedSlot
            ? 'bg-[#c24d86] text-white shadow-[0_22px_34px_-24px_rgba(116,47,93,0.64)] hover:-translate-y-0.5 hover:bg-[#a93d71] hover:shadow-[0_26px_38px_-24px_rgba(116,47,93,0.72)] active:scale-[0.99]'
            : 'cursor-not-allowed bg-gray-100 text-gray-400'
        }`}
      >
        {selectedSlot ? text('availability_continue', language === 'en' ? 'Continue confidently' : 'Jätkan enesekindlalt') : text('availability_select_for_continue', language === 'en' ? 'Select time to continue' : 'Vali aeg jätkamiseks')}
      </button>

      <div ref={continueButtonRef} />
    </div>
  );
}

export default DateTimeStep;
