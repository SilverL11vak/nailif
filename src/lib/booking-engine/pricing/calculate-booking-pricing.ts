import type { EngineTimeSlot } from '../types';
import { calculateBookingCommercePricing } from './calculate-booking-commerce-pricing';

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
  const pricing = calculateBookingCommercePricing({
    baseServicePrice: input.service.price,
    baseServiceDuration: input.service.duration,
    extras: input.addOns.map((addOn) => ({
      id: '',
      name: '',
      unitPrice: addOn.price,
      quantity: 1,
      durationImpact: addOn.duration,
    })),
    slotSurchargeTotal: input.slot.isSos && typeof input.slot.sosSurcharge === 'number' ? input.slot.sosSurcharge : 0,
    depositAmount: BOOKING_DEPOSIT_EUR,
  });

  return {
    totalPrice: pricing.serviceTotal,
    totalDuration: pricing.totalDuration,
    depositAmount: pricing.depositAmount,
    remainingAmount: pricing.payLaterTotal,
  };
}

