import { sql } from '@/lib/db';
import type { EngineTimeSlot } from '../types';
import {
  BOOKING_DEPOSIT_EUR,
  calculateBookingPricing,
  type BookingPricingInput,
  type BookingPricingTotals,
} from './calculate-booking-pricing';

export { BOOKING_DEPOSIT_EUR, calculateBookingPricing };
export type { BookingPricingInput, BookingPricingTotals };

export interface BookingPricingDbSnapshot {
  service: { id: string; price: number; duration: number };
  addOns: Array<{ id: string; price: number; duration: number }>;
  totals: BookingPricingTotals;
}

export async function recomputeBookingPricingFromDb(input: {
  serviceId: string;
  addOnIds: string[];
  slot: EngineTimeSlot;
}): Promise<BookingPricingTotals> {
  return recomputeBookingPricingFromDbWithSnapshots(input).then((r) => r.totals);
}

export async function recomputeBookingPricingFromDbWithSnapshots(input: {
  serviceId: string;
  addOnIds: string[];
  slot: EngineTimeSlot;
}): Promise<BookingPricingDbSnapshot> {
  // De-dupe to prevent accidental double counting.
  const uniqueAddOnIds = [...new Set(input.addOnIds)];

  const [serviceRow] = await sql<
    Array<{
      id: string;
      duration: number;
      price: number;
    }>
  >`
    SELECT id, duration, price
    FROM services
    WHERE id = ${input.serviceId}
      AND active = TRUE
    LIMIT 1
  `;

  if (!serviceRow) {
    throw new Error('Invalid or inactive service');
  }

  const addOns = uniqueAddOnIds.length
    ? await sql<
        Array<{
          id: string;
          duration: number;
          price: number;
        }>
      >`
        SELECT id, duration, price
        FROM booking_addons
        WHERE id IN ${sql(uniqueAddOnIds)}
          AND active = TRUE
      `
    : [];

  if (addOns.length !== uniqueAddOnIds.length) {
    throw new Error('Invalid or inactive add-ons');
  }

  const totals = calculateBookingPricing({
    service: { price: serviceRow.price, duration: serviceRow.duration },
    slot: input.slot,
    addOns,
  });

  return {
    service: { id: serviceRow.id, price: serviceRow.price, duration: serviceRow.duration },
    addOns,
    totals,
  };
}

