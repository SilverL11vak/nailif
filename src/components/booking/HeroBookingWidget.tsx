'use client';

import { useEffect, useMemo, useState } from 'react';
import { ServiceSelector } from './ServiceSelector';
import { TimeSlot } from './TimeSlot';
import { FastBookingSheet } from './FastBookingSheet';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';
import type { Service, TimeSlot as TimeSlotType } from '@/store/booking-types';

export function HeroBookingWidget() {
  const { t, language } = useTranslation();
  const { text } = useBookingContent();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlotType[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  const {
    selectedService,
    selectedSlot,
    selectService,
    selectSlot,
    activateFastBooking,
    calculateTotals
  } = useBookingStore();

  const nextSlot = useMemo(() => {
    if (availableSlots.length === 0) return null;
    return [...availableSlots].sort((a, b) => `${a.date}-${a.time}`.localeCompare(`${b.date}-${b.time}`))[0];
  }, [availableSlots]);

  useEffect(() => {
    let mounted = true;
    const loadSlots = async () => {
      setSlotsLoading(true);
      try {
        const response = await fetch('/api/slots?upcoming=1&limit=6');
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

  const handleSlotSelect = (slot: TimeSlotType) => {
    selectSlot(slot);
    if (selectedService) {
      setIsSheetOpen(true);
    }
  };

  const handleServiceSelect = (service: Service) => {
    selectService(service);
    calculateTotals();
  };

  const handleSecureSlot = () => {
    if (selectedService && selectedSlot) {
      activateFastBooking(selectedService, selectedSlot);
      setIsSheetOpen(true);
    } else if (selectedService && nextSlot) {
      selectSlot(nextSlot);
      activateFastBooking(selectedService, nextSlot);
      setIsSheetOpen(true);
    }
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
  };

  const getNextAvailableText = () => {
    if (!nextSlot) return text('availability_no_slots', t('widget.noSlotsAvailable'));
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    if (nextSlot.date === todayDate) {
      return `${t('widget.todayAt')} ${nextSlot.time}`;
    }
    if (nextSlot.date === tomorrowDate) {
      return `${t('widget.tomorrowAt')} ${nextSlot.time}`;
    }
    const formatted = new Date(`${nextSlot.date}T00:00:00`).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return `${formatted} ${t('confirm.at')} ${nextSlot.time}`;
  };

  return (
    <div
      id="hero-booking-widget"
      className="relative overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_50%,#fff5f9_100%)] p-6 lg:p-8"
    >
      <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(215,157,192,0.22)_0%,transparent_70%)]" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(207,124,172,0.15)_0%,transparent_70%)] blur-sm" aria-hidden />

      {/* 1. Identity row */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full bg-[linear-gradient(145deg,#f9dfee,#e5b7d3)] shadow-[0_10px_24px_-14px_rgba(133,72,117,0.46)]">
            <div className="absolute inset-[3px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff9fd,_#e7b8d4_70%,#cf86b2_100%)]" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] opacity-75 text-[#ba7ca2]">{t('widget.identityEyebrow')}</p>
            <p className="text-sm font-semibold text-[#3f2b3a]">{t('widget.identityTitle')}</p>
          </div>
        </div>
        <span className="rounded-full border border-[#f0dfe9] bg-white/85 px-3 py-1 text-[11px] font-medium text-[#7f6275]">
          {t('widget.identityStudio')}
        </span>
      </div>

      <p className="mb-5 text-center text-sm font-medium text-[#826878]">{t('widget.designedEasy')}</p>

      {/* 2. Next available — premium pill badge with pulse dot */}
      <div className="mb-6 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#fff5fa_0%,#ffe8f2_50%,#ffddee_100%)] px-4 py-2.5 shadow-[0_4px_16px_-8px_rgba(180,90,130,0.25)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c24d86] opacity-60" aria-hidden />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c24d86]" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-[#5c3d52]">
            {text('availability_next_available', t('widget.nextAvailable'))} {getNextAvailableText()}
          </span>
        </div>
      </div>

      {/* 3. Service selector */}
      <div className="mb-6">
        <ServiceSelector onSelect={handleServiceSelect} selectedService={selectedService} />
      </div>

      {/* 4. Slot options — tappable cards, horizontal scroll on mobile */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-medium text-[#634f60]">{t('widget.selectTime')}</p>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
          {slotsLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <div key={`slot-skeleton-${index}`} className="premium-skeleton-card h-12 min-w-[100px] flex-1 rounded-xl md:min-w-0" />
            ))}
          {!slotsLoading && availableSlots.slice(0, 3).map((slot) => (
            <TimeSlot
              key={slot.id}
              slot={slot}
              isSelected={selectedSlot?.id === slot.id}
              onSelect={handleSlotSelect}
              compact
            />
          ))}
          {!slotsLoading && availableSlots.length === 0 && (
            <p className="text-sm text-[#856f80]">{text('availability_no_slots', t('widget.noSlotsAvailable'))}</p>
          )}
        </div>
      </div>

      {/* 5. Primary booking CTA — gradient, shine, press */}
      <button
        onClick={handleSecureSlot}
        disabled={!selectedService}
        className={`relative w-full overflow-hidden rounded-2xl py-4 font-semibold uppercase tracking-wider transition-all duration-200
          ${selectedService
            ? 'bg-[linear-gradient(135deg,#d4669e_0%,#c24d86_45%,#a93d71_100%)] text-white shadow-[0_20px_40px_-16px_rgba(139,51,100,0.5)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-16px_rgba(139,51,100,0.55)] active:scale-[0.98] active:shadow-[0_16px_32px_-16px_rgba(139,51,100,0.45)]'
            : 'cursor-not-allowed bg-[#ececec] text-[#999]/60 border border-[#e0e0e0]'
          }`}
      >
        {selectedService && (
          <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shine_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ width: '60%' }} aria-hidden />
        )}
        <span className="relative flex items-center justify-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {selectedService ? t('widget.secureThisSlot') : t('widget.selectService')}
        </span>
      </button>

      <p className="mt-2 text-center text-xs text-[#856f80]">
        {t('widget.depositNotice')}
      </p>

      <div className="mt-6 flex items-center justify-center gap-3 border-t border-[#f1e3ec] pt-6 text-xs text-[#7f6275]">
        <span>{t('trust.rating')} ({t('trust.clients')})</span>
        <span>|</span>
        <span>{t('widget.hygiene')}</span>
      </div>

      {selectedService && selectedSlot && (
        <FastBookingSheet
          isOpen={isSheetOpen}
          onClose={handleCloseSheet}
          service={selectedService}
          slot={selectedSlot}
        />
      )}
    </div>
  );
}

export default HeroBookingWidget;
