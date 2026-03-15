'use client';

import { useEffect, useMemo, useState } from 'react';
import { ServiceSelector } from './ServiceSelector';
import { TimeSlot } from './TimeSlot';
import { FastBookingSheet } from './FastBookingSheet';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import type { Service, TimeSlot as TimeSlotType } from '@/store/booking-types';

export function HeroBookingWidget() {
  const { t } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlotType[]>([]);

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
      try {
        const response = await fetch('/api/slots?upcoming=1&limit=6', { cache: 'no-store' });
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
    if (!nextSlot) return t('widget.noSlotsAvailable');
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
    const formatted = new Date(`${nextSlot.date}T00:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return `${formatted} ${t('confirm.at')} ${nextSlot.time}`;
  };

  return (
    <div
      id="hero-booking"
      className="relative overflow-hidden rounded-[30px] border border-[#f0dbe7] bg-[linear-gradient(180deg,#fffdfd_0%,#fff5fb_100%)] p-6 shadow-[0_34px_56px_-34px_rgba(109,69,97,0.48),0_16px_30px_-24px_rgba(109,69,97,0.32)] lg:p-8"
    >
      <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(215,157,192,0.28)_0%,rgba(215,157,192,0)_70%)]" />
      <div className="pointer-events-none absolute inset-x-8 bottom-3 h-12 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(207,124,172,0.22)_0%,rgba(207,124,172,0)_70%)] blur-sm" />

      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full bg-[linear-gradient(145deg,#f9dfee,#e5b7d3)] shadow-[0_10px_24px_-14px_rgba(133,72,117,0.46)]">
            <div className="absolute inset-[3px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff9fd,_#e7b8d4_70%,#cf86b2_100%)]" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#ba7ca2]">Premium Nail Care</p>
            <p className="text-sm font-semibold text-[#3f2b3a]">Booking with Sandra</p>
          </div>
        </div>
        <span className="rounded-full border border-[#f0dfe9] bg-white/85 px-3 py-1 text-[11px] font-medium text-[#7f6275]">
          Mustamae Studio
        </span>
      </div>

      <p className="mb-4 text-center text-sm font-medium text-[#826878]">Designed for easy booking</p>

      <div className="mb-6 flex items-center gap-2 rounded-full border border-[#eddce7] bg-white/80 px-3 py-2 text-sm text-[#7b6776]">
        <span className="h-2 w-2 rounded-full bg-[#c05f8f] animate-pulse" />
        <span className="font-medium">{t('widget.nextAvailable')} {getNextAvailableText()}</span>
      </div>

      <div className="mb-6">
        <ServiceSelector onSelect={handleServiceSelect} selectedService={selectedService} />
      </div>

      <div className="mb-6">
        <p className="mb-3 text-sm font-medium text-[#634f60]">{t('widget.selectTime')}</p>
        <div className="flex flex-wrap gap-2">
          {availableSlots.slice(0, 3).map((slot) => (
            <TimeSlot
              key={slot.id}
              slot={slot}
              isSelected={selectedSlot?.id === slot.id}
              onSelect={handleSlotSelect}
              compact
            />
          ))}
          {availableSlots.length === 0 && (
            <p className="text-sm text-[#856f80]">{t('widget.noSlotsAvailable')}</p>
          )}
        </div>
      </div>

      <button
        onClick={handleSecureSlot}
        disabled={!selectedService}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-semibold transition-all duration-200
          ${selectedService
            ? 'bg-[#c24d86] text-white shadow-[0_24px_34px_-24px_rgba(141,60,108,0.62)] hover:-translate-y-0.5 hover:bg-[#a93d71] hover:shadow-[0_28px_38px_-24px_rgba(141,60,108,0.68)] active:scale-[0.99]'
            : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {selectedService ? t('widget.secureThisSlot') : t('widget.selectService')}
      </button>

      <p className="mt-2 text-center text-xs text-[#856f80]">
        Secure with a 10 EUR deposit. Remaining balance is paid in studio.
      </p>

      <div className="mt-6 flex items-center justify-center gap-3 border-t border-[#f1e3ec] pt-6 text-xs text-[#7f6275]">
        <span>{t('trust.rating')} ({t('trust.clients')})</span>
        <span>|</span>
        <span>Medical-grade hygiene</span>
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
