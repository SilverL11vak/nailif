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
      return (
        <span className="text-[11px] font-medium text-[#8f5d78]">
          {language === 'en' ? 'Urgent slot' : 'Kiire aeg'}
          {slot.sosSurcharge ? ` +${slot.sosSurcharge} EUR` : ''}
        </span>
      );
    }
    if (slot.isPopular) {
      return <span className="text-[11px] font-medium text-[#6f7f59]">{language === 'en' ? 'Popular' : 'Populaarne'}</span>;
    }
    if (slot.count && slot.count <= 2) {
      return <span className="text-[11px] font-medium text-[#a77656]">{language === 'en' ? 'Almost full' : 'Peaaegu tais'}</span>;
    }
    return null;
  };

  const baseStyles = `
    relative flex flex-col items-center justify-center rounded-2xl border transition-all duration-200 cursor-pointer
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d1a999]
    ${compact ? 'min-w-[92px] px-4 py-3' : 'min-w-[112px] px-5 py-4'}
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
            : 'border-[#d7b0a1] bg-[#fffaf7] shadow-[0_20px_30px_-18px_rgba(72,49,35,0.55)]'
        }`}
        aria-pressed="true"
      >
        <div className="relative flex items-center gap-1.5">
          <span className={`text-sm font-bold ${slot.isSos ? 'text-[#b05387]' : 'text-[#b58373]'}`}>{slot.time}</span>
          <svg className={`h-4 w-4 ${slot.isSos ? 'text-[#b05387]' : 'text-[#b58373]'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        {!compact && (
          <span className={`relative mt-1 text-[11px] font-medium ${slot.isSos ? 'text-[#8a5675]' : 'text-[#8d6d5e]'}`}>
            {slot.isSos ? (language === 'en' ? 'Urgent slot selected' : 'Kiire aeg valitud') : language === 'en' ? 'Selected' : 'Valitud'}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`${baseStyles} ${
        slot.isSos
          ? 'border-[#e8bfd4] bg-[#fff6fb] hover:-translate-y-0.5 hover:border-[#c87da6] hover:shadow-[0_18px_26px_-18px_rgba(149,63,112,0.55)] active:scale-[0.98]'
          : 'border-[#e9ddd6] bg-white hover:-translate-y-0.5 hover:border-[#d7b0a1] hover:bg-[#fffaf7] hover:shadow-[0_18px_26px_-18px_rgba(72,49,35,0.6)] active:scale-[0.98]'
      }`}
      aria-pressed="false"
    >
      <span className="text-sm font-semibold text-gray-700">{slot.time}</span>
      {getSlotBadge()}
    </button>
  );
});

export default TimeSlot;
