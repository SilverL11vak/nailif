import type { BookingRecord } from '@/lib/bookings';

export type BookingBreakdown = {
  basePrice: number;
  extrasTotal: number;
  finalTotal: number;
  depositAmount: number;
  remainingAmount: number;
};

/**
 * Single source of pricing math for the booking UI surfaces.
 * Business rules:
 * - finalTotal = basePrice + sum(selected extra services)
 * - remainingAmount = max(0, finalTotal - depositAmount)
 *
 * IMPORTANT: This helper must be used instead of duplicating price/remaining calculations in UI pages.
 */
export function calculateBookingBreakdown(booking: BookingRecord): BookingBreakdown {
  if (booking.pricingSnapshot) {
    return {
      basePrice: booking.pricingSnapshot.baseServicePrice,
      extrasTotal: booking.pricingSnapshot.extrasTotal + booking.pricingSnapshot.slotSurchargeTotal,
      finalTotal: booking.pricingSnapshot.serviceTotal,
      depositAmount: booking.pricingSnapshot.depositAmount,
      remainingAmount: booking.pricingSnapshot.payLaterTotal,
    };
  }

  const basePrice = Number(booking.servicePrice) || 0;
  const extrasTotal = Array.isArray(booking.addOns)
    ? booking.addOns.reduce((sum, a) => sum + (typeof a.price === 'number' ? a.price : 0), 0)
    : 0;
  const finalTotal = basePrice + extrasTotal;
  const depositAmount = Number(booking.depositAmount) || 0;
  const remainingAmount = Math.max(0, finalTotal - depositAmount);

  return { basePrice, extrasTotal, finalTotal, depositAmount, remainingAmount };
}

// Alias to match product language ("booking total").
export const calculateBookingTotal = calculateBookingBreakdown;

