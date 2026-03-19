import { sql } from '@/lib/db';
import { getServiceOrVariantPricing } from '@/lib/catalog';
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
  serviceVariantId?: string | null;
  addOnIds: string[];
  slot: EngineTimeSlot;
}): Promise<BookingPricingTotals> {
  return recomputeBookingPricingFromDbWithSnapshots(input).then((r) => r.totals);
}

export async function recomputeBookingPricingFromDbWithSnapshots(input: {
  serviceId: string;
  serviceVariantId?: string | null;
  addOnIds: string[];
  slot: EngineTimeSlot;
}): Promise<BookingPricingDbSnapshot> {
  const uniqueAddOnIds = [...new Set(input.addOnIds)];

  const serviceRow = await getServiceOrVariantPricing(input.serviceId, input.serviceVariantId ?? undefined);
  if (!serviceRow) {
    throw new Error('Invalid or inactive service or variant');
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
          AND service_id = ${input.serviceId}
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
