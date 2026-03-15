'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import type { TimeSlot } from '@/store/booking-types';
import TimeSlotComponent from './TimeSlot';
import { useSearchParams } from 'next/navigation';

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateTimeStep() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const selectedDate = useBookingStore((state) => state.selectedDate);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const selectDate = useBookingStore((state) => state.selectDate);
  const selectSlot = useBookingStore((state) => state.selectSlot);
  const nextStep = useBookingStore((state) => state.nextStep);

  const [isLoading, setIsLoading] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, TimeSlot[]>>({});
  const [showPreselectedMsg, setShowPreselectedMsg] = useState(false);
  const continueButtonRef = useRef<HTMLDivElement>(null);
  const initialSelectedDateRef = useRef(selectedDate);
  const initialSelectedSlotRef = useRef(selectedSlot);
  const preferredTimeRef = useRef(searchParams.get('time'));

  const dates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
      }),
    []
  );

  useEffect(() => {
    let mounted = true;
    const loadSlots = async () => {
      setIsLoading(true);
      const start = toIsoDate(dates[0]);
      const end = toIsoDate(dates[dates.length - 1]);

      try {
        const response = await fetch(
          `/api/slots?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`,
          { cache: 'no-store' }
        );
        if (!response.ok) throw new Error('Failed to load slots');

        const data = (await response.json()) as { slots?: TimeSlot[] };
        const loaded = data.slots ?? [];
        const map: Record<string, TimeSlot[]> = {};

        for (const date of dates) {
          map[toIsoDate(date)] = [];
        }
        for (const slot of loaded) {
          if (!map[slot.date]) map[slot.date] = [];
          map[slot.date].push(slot);
        }
        for (const key of Object.keys(map)) {
          map[key] = map[key].sort((a, b) => a.time.localeCompare(b.time));
        }

        if (!mounted) return;
        setSlotsByDate(map);

        const dateToUse = initialSelectedDateRef.current || dates[0];
        const selectedDateKey = toIsoDate(dateToUse);
        selectDate(dateToUse);
        const daySlots = map[selectedDateKey] ?? [];
        setSlots(daySlots);

        const selectedStillAvailable = daySlots.some(
          (slot) => slot.id === initialSelectedSlotRef.current?.id && slot.available
        );
        if (!selectedStillAvailable) {
          const preferredSlot = preferredTimeRef.current
            ? daySlots.find((slot) => slot.available && slot.time === preferredTimeRef.current)
            : null;
          const firstAvailable = preferredSlot ?? daySlots.find((slot) => slot.available);
          if (firstAvailable) {
            selectSlot(firstAvailable);
            setShowPreselectedMsg(true);
            setTimeout(() => setShowPreselectedMsg(false), 3000);
          }
        }
      } catch (error) {
        console.error('DateTimeStep slots load error:', error);
        if (mounted) {
          setSlotsByDate({});
          setSlots([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSlots();
    return () => {
      mounted = false;
    };
  }, [dates, selectDate, selectSlot]);

  const handleDateSelect = (date: Date) => {
    selectDate(date);
    const daySlots = slotsByDate[toIsoDate(date)] ?? [];
    setSlots(daySlots);

    const preferredSlot = preferredTimeRef.current
      ? daySlots.find((slot) => slot.available && slot.time === preferredTimeRef.current)
      : null;
    const firstAvailable = preferredSlot ?? daySlots.find((slot) => slot.available);
    if (firstAvailable) {
      selectSlot(firstAvailable);
      setShowPreselectedMsg(true);
      setTimeout(() => setShowPreselectedMsg(false), 3000);
    }
  };

  const handleContinue = () => {
    if (selectedSlot) {
      nextStep();
      continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const hasAvailableSlots = (date: Date) => (slotsByDate[toIsoDate(date)] ?? []).some((slot) => slot.available);
  const hasSosSlots = slots.some((slot) => slot.available && slot.isSos);

  return (
    <div className="animate-fade-in">
      <div className="mb-7 text-center">
        <p className="mb-2 text-[11px] uppercase tracking-[0.26em] text-[#b08979]">Step 2</p>
        <h2 className="mb-2 text-2xl font-semibold text-gray-800">{t('datetime.choose')}</h2>
        <p className="text-gray-500">{t('datetime.pickTime')}</p>
        <p className="mt-2 text-sm text-[#8c7568]">Approximate appointment time, tailored around your selected service.</p>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-full bg-[#faf4ef] px-4 py-2 text-sm text-[#8d6d5e] ring-1 ring-[#efe2da]">
        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{t('datetime.earliestAvailable')}</span>
      </div>

      <div className="mb-6 rounded-[24px] border border-[#eedfd6] bg-[linear-gradient(180deg,#fffaf7_0%,#fbf4ef_100%)] p-4 shadow-[0_18px_30px_-28px_rgba(72,49,35,0.45)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f2dfd6] text-[#b58373]">N</div>
          <div>
            <p className="mb-1 text-sm font-medium text-gray-800">{t('datetime.yourNailsWillThankYou')}</p>
            <p className="text-xs text-gray-500">Designed for easy booking. Calm timing, no back-and-forth.</p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {dates.map((date, index) => {
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          const isEarliest = index === 0 && hasAvailableSlots(date);
          const hasSlots = hasAvailableSlots(date);

          return (
            <button
              key={index}
              onClick={() => hasSlots && handleDateSelect(date)}
              disabled={!hasSlots}
              className={`
                flex h-20 w-16 flex-shrink-0 flex-col items-center justify-center rounded-[22px] border transition-all duration-200
                ${isSelected
                  ? 'border-[#d7b0a1] bg-[#fffaf7] shadow-[0_16px_24px_-18px_rgba(72,49,35,0.42)]'
                  : hasSlots
                    ? isEarliest
                      ? 'border-[#ead9cf] bg-[#fbf5f0] hover:border-[#d9beaf] hover:shadow-[0_16px_24px_-20px_rgba(72,49,35,0.38)]'
                      : 'border-[#efe5de] bg-white hover:border-[#d9beaf]'
                    : 'cursor-not-allowed border-gray-50 bg-gray-50 opacity-40'}
              `}
            >
              {isEarliest && <span className="mb-0.5 text-[10px] font-semibold text-[#a78576]">{t('datetime.earliest')}</span>}
              <span className={`text-xs font-medium ${isSelected ? 'text-[#b58373]' : hasSlots ? 'text-gray-500' : 'text-gray-300'}`}>
                {isToday(date) ? t('datetime.today') : formatDate(date).split(' ')[0]}
              </span>
              <span className={`text-xl font-semibold ${isSelected ? 'text-[#b58373]' : hasSlots ? 'text-gray-800' : 'text-gray-300'}`}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-gray-700">{t('datetime.availableTimes')}</h3>

        {hasSosSlots && (
          <div className="mb-3 rounded-xl border border-[#f2d8e7] bg-[#fff5fb] px-3 py-2 text-sm text-[#8b4f71]">
            SOS kiire aeg saadaval. Vajadusel lisandub express lisatasu.
          </div>
        )}

        {showPreselectedMsg && selectedSlot && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#f6efe9] px-3 py-2 text-sm text-[#8d6d5e]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{t('datetime.preselected')}</span>
          </div>
        )}

        {selectedSlot?.isSos && (
          <div className="mb-3 rounded-xl border border-[#efcfe0] bg-[#fff2f9] px-3 py-2 text-sm text-[#8b4f71]">
            SOS valik: {selectedSlot.sosLabel || 'Kiire aeg'}{' '}
            {selectedSlot.sosSurcharge ? `(+${selectedSlot.sosSurcharge}EUR)` : '(lisatasuta)'}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {slots.map((slot) => (
              <TimeSlotComponent
                key={slot.id}
                slot={slot}
                isSelected={selectedSlot?.id === slot.id}
                onSelect={selectSlot}
              />
            ))}
          </div>
        )}

        {!isLoading && slots.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            <p>{t('datetime.noSlots')}</p>
            <p className="text-sm">{t('datetime.tryAnother')}</p>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-2xl bg-[#faf6f3] p-3 text-sm text-[#7d685d] ring-1 ring-[#efe3dc]">
        <svg className="h-4 w-4 flex-shrink-0 text-[#b58373]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{t('datetime.freeReschedule')}</span>
      </div>

      <button
        onClick={handleContinue}
        disabled={!selectedSlot}
        className={`
          w-full rounded-2xl py-4 font-semibold transition-all duration-200
          ${selectedSlot
            ? 'bg-[#b58373] text-white shadow-[0_18px_26px_-20px_rgba(72,49,35,0.9)] hover:bg-[#a87463] active:scale-[0.99]'
            : 'cursor-not-allowed bg-gray-100 text-gray-400'}
        `}
      >
        {selectedSlot ? t('datetime.continue') : t('datetime.selectTime')}
      </button>

      <div ref={continueButtonRef} />
    </div>
  );
}

export default DateTimeStep;
