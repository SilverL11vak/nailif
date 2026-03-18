'use client';

import { memo } from 'react';
import type { TimeSlot as TimeSlotType } from '@/store/booking-types';
import { useTranslation } from '@/lib/i18n';

interface TimeSlotProps {
  slot: TimeSlotType;
  isSelected: boolean;
  onSelect: (slot: TimeSlotType) => void;
  compact?: boolean;
}

export const TimeSlot = memo(function TimeSlot({ slot, isSelected, onSelect, compact = false }: TimeSlotProps) {
  const { language } = useTranslation();

  const handleClick = () => {
    if (slot.available) onSelect(slot);
  };

  const getSlotBadge = () => {
    if (slot.isSos) {
      return { label: language === 'en' ? 'Urgent slot' : 'Kiire aeg', className: 'text-[#9a5b80]' };
    }
    if (slot.isPopular) {
      return { label: language === 'en' ? 'Popular' : 'Populaarne', className: 'text-[#6f7f59]' };
    }
    if (slot.count && slot.count <= 2) {
      return { label: language === 'en' ? 'Almost full' : 'Peaaegu tais', className: 'text-[#b17a98]' };
    }
    return null;
  };
  const slotBadge = getSlotBadge();

  const baseStyles = `
    relative flex w-full min-w-0 flex-col items-start justify-center rounded-2xl border text-left transition-all duration-140 cursor-pointer
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d1a999]
    ${compact ? 'px-4 py-3.5' : 'px-4 py-3.5 sm:px-5'}
  `;

  if (!slot.available) {
    return (
      <button className={`${baseStyles} cursor-not-allowed border-gray-100 bg-gray-50 opacity-40`} disabled>
        <span className="text-sm font-medium text-gray-400 line-through">{slot.time}</span>
      </button>
    );
  }

  if (isSelected) {
    return (
      <button
        onClick={handleClick}
        className={`${baseStyles} scale-[1.02] active:scale-[1.01] ${
          slot.isSos
            ? 'border-[#c87da6] bg-[#fff1f8] shadow-[0_20px_30px_-18px_rgba(149,63,112,0.6)]'
            : 'border-[#d7b0c7] bg-[#fff7fb] shadow-[0_20px_30px_-18px_rgba(116,47,93,0.45)]'
        }`}
        aria-pressed="true"
      >
        <div className="flex w-full items-start justify-between gap-3">
          <div>
            <span className={`block text-base font-semibold leading-none ${slot.isSos ? 'text-[#b05387]' : 'text-[#5f4358]'}`}>{slot.time}</span>
            {!compact && (
              <span className={`mt-1 block text-[11px] font-medium ${slot.isSos ? 'text-[#8a5675]' : 'text-[#8d6d5e]'}`}>
                {slot.isSos ? (language === 'en' ? 'Urgent selected' : 'Kiire aeg valitud') : language === 'en' ? 'Selected time' : 'Valitud aeg'}
              </span>
            )}
          </div>
          <svg className={`mt-0.5 h-4 w-4 ${slot.isSos ? 'text-[#b05387]' : 'text-[#c24d86]'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        {slot.sosSurcharge ? (
          <span className="mt-1 inline-flex items-center rounded-full bg-[#fff0f7] px-2 py-0.5 text-[10px] font-medium text-[#9a5b80]">
            +{slot.sosSurcharge}€
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`${baseStyles} ${
        slot.isSos
          ? 'border-[#e8bfd4] bg-[#fff6fb] hover:-translate-y-0.5 hover:border-[#c87da6] hover:bg-[#fff0f7] hover:shadow-[0_18px_26px_-18px_rgba(149,63,112,0.55)] active:scale-[0.99]'
          : 'border-[#eadde7] bg-white hover:-translate-y-0.5 hover:border-[#d7b0c7] hover:bg-[#fff7fb] hover:shadow-[0_18px_26px_-18px_rgba(116,47,93,0.45)] active:scale-[0.99]'
      }`}
      aria-pressed="false"
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div>
          <span className="block text-base font-semibold leading-none text-[#4d3347]">{slot.time}</span>
          <span className={`mt-1 block text-[11px] font-medium ${slotBadge?.className ?? 'text-[#7d6275]'}`}>
            {slotBadge?.label ?? (language === 'en' ? 'Available now' : 'Vaba aeg')}
          </span>
        </div>
        {slot.sosSurcharge ? (
          <span className="inline-flex items-center rounded-full bg-[#fff0f7] px-2 py-0.5 text-[10px] font-medium text-[#9a5b80]">
            +{slot.sosSurcharge}€
          </span>
        ) : null}
      </div>
    </button>
  );
});

export default TimeSlot;
