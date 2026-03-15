'use client';

import { memo } from 'react';
import type { TimeSlot as TimeSlotType } from '@/store/booking-types';

interface TimeSlotProps {
  slot: TimeSlotType;
  isSelected: boolean;
  onSelect: (slot: TimeSlotType) => void;
  compact?: boolean;
}

export const TimeSlot = memo(function TimeSlot({ 
  slot, 
  isSelected, 
  onSelect,
  compact = false 
}: TimeSlotProps) {
  const handleClick = () => {
    if (slot.available) {
      onSelect(slot);
    }
  };

  const getSlotBadge = () => {
    if (slot.isFastest) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 8V0L8.11 5.2 4.2 0 0 8h8l4-4zm2 8H9v2h6v-2z" />
          </svg>
          Fastest
        </span>
      );
    }
    if (slot.isPopular) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Popular
        </span>
      );
    }
    if (slot.count && slot.count <= 2) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600">
          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
          {slot.count} left
        </span>
      );
    }
    return null;
  };

  // Base styles - Rounded chips with generous spacing
  const baseStyles = `
    relative flex flex-col items-center justify-center 
    rounded-full border-2 transition-all duration-200 cursor-pointer
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4A59A]
    ${compact ? 'px-4 py-2.5 min-w-[80px]' : 'px-5 py-3 min-w-[90px]'}
  `;

  // State styles - Disabled
  if (!slot.available) {
    return (
      <button
        className={`${baseStyles} border-gray-100 bg-gray-50 cursor-not-allowed opacity-40`}
        disabled
      >
        <span className="text-gray-400 line-through text-sm font-medium">
          {slot.time}
        </span>
      </button>
    );
  }

  // State styles - Selected with growing animation and check icon
  if (isSelected) {
    return (
      <button
        onClick={handleClick}
        className={`${baseStyles} border-[#D4A59A] bg-[#FFF9F5] shadow-lg hover:shadow-xl scale-105`}
        aria-pressed="true"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[#D4A59A] font-bold text-sm">
            {slot.time}
          </span>
          <svg className="w-4 h-4 text-[#D4A59A] animate-scale-in" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </button>
    );
  }

  // State styles - Available (hover state)
  return (
    <button
      onClick={handleClick}
      className={`${baseStyles} border-gray-200 bg-white hover:border-[#D4A59A] hover:bg-[#FFF9F5]/50 hover:shadow-md`}
      aria-pressed="false"
    >
      <span className="text-gray-700 font-semibold text-sm">
        {slot.time}
      </span>
      {getSlotBadge()}
    </button>
  );
});

export default TimeSlot;
