'use client';

import { memo } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { TimeSlot as TimeSlotType } from '@/store/booking-types';

interface TimeSlotProps {
  slot: TimeSlotType;
  isSelected: boolean;
  onSelect: (slot: TimeSlotType) => void;
  compact?: boolean;
}

export const TimeSlot = memo(function TimeSlot({ slot, isSelected, onSelect, compact = false }: TimeSlotProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (slot.available) {
      onSelect(slot);
    }
  };

  const getSlotBadge = () => {
    if (slot.isSos) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#b05387]">
          <span>SOS</span>
          {slot.sosLabel || 'Kiire aeg'}
          {slot.sosSurcharge ? ` +${slot.sosSurcharge}EUR` : ''}
        </span>
      );
    }
    if (slot.isFastest) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#a67e6d]">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 8V0L8.11 5.2 4.2 0 0 8h8l4-4zm2 8H9v2h6v-2z" />
          </svg>
          {t('slot.fastest')}
        </span>
      );
    }
    if (slot.isPopular) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#7d8a67]">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {t('slot.popular')}
        </span>
      );
    }
    if (slot.count && slot.count <= 2) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#c27d54]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c27d54]" />
          {slot.count} {t('slot.left')}
        </span>
      );
    }
    return null;
  };

  const baseStyles = `
    relative flex flex-col items-center justify-center rounded-full border transition-all duration-200 cursor-pointer
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d1a999]
    ${compact ? 'min-w-[80px] px-4 py-2.5' : 'min-w-[92px] px-5 py-3'}
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
        className={`${baseStyles} scale-[1.03] ${
          slot.isSos
            ? 'border-[#c87da6] bg-[#fff1f8] shadow-[0_16px_24px_-18px_rgba(149,63,112,0.55)] ring-1 ring-[#f8ddec]'
            : 'border-[#d7b0a1] bg-[#fffaf7] shadow-[0_16px_24px_-18px_rgba(72,49,35,0.48)] ring-1 ring-[#f3e4dc]'
        }`}
        aria-pressed="true"
      >
        <span className="absolute inset-0 animate-pulse rounded-full bg-[radial-gradient(circle_at_center,rgba(214,177,160,0.22),transparent_62%)]" />
        <div className="relative flex items-center gap-1.5">
          <span className={`text-sm font-bold ${slot.isSos ? 'text-[#b05387]' : 'text-[#b58373]'}`}>{slot.time}</span>
          <svg
            className={`h-4 w-4 animate-bounce ${slot.isSos ? 'text-[#b05387]' : 'text-[#b58373]'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {!compact && (
          <span className={`relative mt-1 text-[11px] font-medium ${slot.isSos ? 'text-[#8a5675]' : 'text-[#8d6d5e]'}`}>
            {slot.isSos ? 'Kiire aeg valitud.' : 'Nice choice.'}
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
          ? 'border-[#e8bfd4] bg-[#fff6fb] hover:-translate-y-0.5 hover:border-[#c87da6] hover:shadow-[0_14px_18px_-18px_rgba(149,63,112,0.5)]'
          : 'border-[#e9ddd6] bg-white hover:-translate-y-0.5 hover:border-[#d7b0a1] hover:bg-[#fffaf7] hover:shadow-[0_14px_18px_-18px_rgba(72,49,35,0.55)]'
      }`}
      aria-pressed="false"
    >
      <span className="text-sm font-semibold text-gray-700">{slot.time}</span>
      {getSlotBadge()}
    </button>
  );
});

export default TimeSlot;
