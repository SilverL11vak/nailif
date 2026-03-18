'use client';

import { memo } from 'react';
import type { TimeSlot } from '@/store/booking-types';
import { Lock } from 'lucide-react';

export type SlotPillBadge = 'recommended' | 'fastest' | 'popular' | 'midday' | 'limited' | null;

type Props = {
  slot: TimeSlot;
  isSelected: boolean;
  badge: SlotPillBadge;
  labels: {
    recommended: string;
    fastest: string;
    popular: string;
    midday: string;
    limited: string;
    quiet: string;
    available: string;
    selectedLine: string;
  };
  onSelect: (slot: TimeSlot) => void;
  /** Brief pulse after selection */
  justSelected: boolean;
};

function DateTimeSlotPillInner({ slot, isSelected, badge, labels, onSelect, justSelected }: Props) {
  const handleClick = () => {
    if (slot.available) onSelect(slot);
  };

  const hintBelow =
    badge === 'recommended'
      ? labels.recommended
      : badge === 'fastest'
        ? labels.fastest
        : badge === 'popular'
          ? labels.popular
          : badge === 'midday'
            ? labels.midday
            : badge === 'limited'
              ? labels.limited
              : slot.isSos
                ? labels.limited
                : labels.quiet;

  if (!slot.available) {
    return (
      <div
        className="flex min-h-[52px] flex-col items-center justify-center rounded-full border border-[#ece8ea] bg-[#faf9f9] px-3 py-2 opacity-[0.42]"
        aria-disabled
      >
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-[#b5adb0]" strokeWidth={2} aria-hidden />
          <span className="text-[15px] font-semibold tabular-nums text-[#c4bcc0] line-through decoration-[#d4ccd0]">
            {slot.time}
          </span>
        </div>
      </div>
    );
  }

  const recommendedOrLimited = badge === 'recommended' || badge === 'limited';
  const showGlow = recommendedOrLimited && !isSelected;

  if (isSelected) {
    return (
      <button
        type="button"
        data-datetime-slot
        onClick={handleClick}
        aria-pressed="true"
        className={`relative flex min-h-[52px] w-full flex-col items-center justify-center rounded-full bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_52%,#a93d71_100%)] px-3 py-2.5 text-white shadow-[0_10px_28px_-8px_rgba(194,77,134,0.55)] transition-transform duration-[160ms] motion-reduce:transition-none ${
          justSelected ? 'scale-[1.04] shadow-[0_14px_36px_-6px_rgba(194,77,134,0.5)]' : 'scale-100'
        }`}
      >
        <div className="flex w-full items-center justify-center gap-2">
          <span className="text-[17px] font-bold tabular-nums tracking-tight">{slot.time}</span>
          <svg className="h-4 w-4 shrink-0 text-white/95" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {slot.sosSurcharge ? (
          <span className="mt-0.5 text-[10px] font-medium text-white/85">+€{slot.sosSurcharge}</span>
        ) : (
          <span className="mt-0.5 text-[10px] font-medium text-white/85">{labels.selectedLine}</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-datetime-slot
      onClick={handleClick}
      aria-pressed="false"
      className={`group flex min-h-[52px] w-full flex-col items-center justify-center rounded-full border px-3 py-2.5 text-left transition-[transform,box-shadow,border-color] duration-[160ms] motion-reduce:transition-none ${
        showGlow
          ? badge === 'recommended'
            ? 'border-[#e8c4d8] bg-[linear-gradient(180deg,#fffdfb_0%,#fff5f9_100%)] shadow-[0_0_0_1px_rgba(194,77,134,0.12),0_8px_24px_-12px_rgba(194,77,134,0.25)] hover:-translate-y-0.5 hover:shadow-[0_0_20px_-8px_rgba(194,77,134,0.35)]'
            : 'border-[#e8d9a8] bg-[linear-gradient(180deg,#fffefb_0%,#fffbf5_100%)] shadow-[0_6px_20px_-14px_rgba(180,140,60,0.2)] hover:-translate-y-0.5'
          : slot.isSos
            ? 'border-[#e8c4d8] bg-[#fff8fc] hover:-translate-y-0.5 hover:border-[#dcb0cc] hover:shadow-[0_8px_22px_-14px_rgba(194,77,134,0.2)]'
            : 'border-[#e8e2e5] bg-white hover:-translate-y-0.5 hover:border-[#dcc9d4] hover:shadow-[0_10px_26px_-18px_rgba(57,33,52,0.12)] active:scale-[0.98]'
      }`}
    >
      {badge === 'recommended' && (
        <span className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#c24d86]">
          {labels.recommended}
        </span>
      )}
      <span className="text-[17px] font-bold tabular-nums text-[#2f2530]">{slot.time}</span>
      <span
        className={`mt-0.5 text-[10px] font-medium ${
          badge === 'fastest'
            ? 'text-[#2d8a5e]'
            : badge === 'popular'
              ? 'text-[#b04b80]'
              : badge === 'midday'
                ? 'text-[#7a6b8a]'
                : badge === 'limited'
                  ? 'text-[#b8860b]'
                  : 'text-[#8a7a88]'
        }`}
      >
        {hintBelow}
      </span>
      {slot.sosSurcharge ? (
        <span className="mt-0.5 text-[10px] font-semibold text-[#9d5a7a]">+€{slot.sosSurcharge}</span>
      ) : null}
    </button>
  );
}

function propsEqual(prev: Props, next: Props) {
  return (
    prev.slot === next.slot &&
    prev.isSelected === next.isSelected &&
    prev.badge === next.badge &&
    prev.justSelected === next.justSelected &&
    prev.labels === next.labels
  );
}

export const DateTimeSlotPill = memo(DateTimeSlotPillInner, propsEqual);
