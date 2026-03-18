import type { EngineTimeSlot } from '../types';

// Central source of truth for the booking deposit (in EUR).
export const BOOKING_DEPOSIT_EUR = 10;

export interface BookingPricingInput {
  service: { price: number; duration: number };
  slot: EngineTimeSlot;
  addOns: Array<{ price: number; duration: number }>;
}

export interface BookingPricingTotals {
  totalPrice: number;
  totalDuration: number;
  depositAmount: number;
  remainingAmount: number;
}

export function calculateBookingPricing(input: BookingPricingInput): BookingPricingTotals {
  let price = input.service.price;
  let duration = input.service.duration;

  for (const addOn of input.addOns) {
    price += addOn.price;
    duration += addOn.duration;
  }

  // SOS adds a surcharge to price (not duration).
  if (input.slot.isSos && typeof input.slot.sosSurcharge === 'number') {
    price += input.slot.sosSurcharge;
  }

  const depositAmount = BOOKING_DEPOSIT_EUR;
  const remainingAmount = Math.max(0, price - depositAmount);

  return {
    totalPrice: price,
    totalDuration: duration,
    depositAmount,
    remainingAmount,
  };
}

