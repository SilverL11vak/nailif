import type { BookingInsert } from '@/lib/bookings';
import type { ProductDeliveryMethod } from '@/store/booking-types';
import type { EngineTimeSlot } from '../types';
import { listResolvedSlotsInRange } from '../availability/availability-engine';
import { recomputeBookingPricingFromDbWithSnapshots, type BookingPricingDbSnapshot } from '../pricing/pricing-engine';
import { getProductsByIds } from '@/lib/catalog';

type BookingValidationOk = {
  ok: true;
  resolvedSlot: EngineTimeSlot;
  pricingSnapshot: BookingPricingDbSnapshot;
  // Use validated service price/duration for correct DB snapshots.
  serviceForInsert: BookingInsert['service'];
  productsForInsert: BookingInsert['products'];
  productsTotalPrice: number;
};

type BookingValidationError = {
  ok: false;
  status: number;
  code: 'invalid_slot' | 'slot_unavailable' | 'pricing_mismatch' | 'invalid_pricing_inputs' | 'invalid_payload';
  message: string;
};

export type BookingValidationResult = BookingValidationOk | BookingValidationError;

function isBookableStatus(status: EngineTimeSlot['status']): boolean {
  return status === 'free' || status === 'sos';
}

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export async function validateBookingCheckout(payload: BookingInsert): Promise<BookingValidationResult> {
  if (!payload?.service?.id || !payload?.slot?.date || !payload?.slot?.time || !payload?.contact) {
    return { ok: false, status: 400, code: 'invalid_payload', message: 'Invalid booking payload' };
  }

  if (!isDateString(payload.slot.date) || !isTimeString(payload.slot.time)) {
    return { ok: false, status: 400, code: 'invalid_slot', message: 'Invalid slot date/time' };
  }

  // 1) Re-check slot availability using the Availability Engine.
  const resolvedSlots = await listResolvedSlotsInRange({
    from: payload.slot.date,
    to: payload.slot.date,
    view: 'booking',
    includeUnavailable: true,
  });

  const resolvedSlot = resolvedSlots.find((s) => s.time === payload.slot.time) ?? null;
  if (!resolvedSlot) {
    return { ok: false, status: 409, code: 'invalid_slot', message: 'Selected slot is no longer valid' };
  }

  if (!isBookableStatus(resolvedSlot.status)) {
    return { ok: false, status: 409, code: 'slot_unavailable', message: 'Selected slot is no longer available' };
  }

  // 2) Recompute pricing from DB and validate totals (variant when present).
  const addOnIds = (payload.addOns ?? [])
    .map((a) => a.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const serviceVariantId = (payload.service as { variantId?: string }).variantId ?? undefined;

  let pricingSnapshot: BookingPricingDbSnapshot;
  try {
    pricingSnapshot = await recomputeBookingPricingFromDbWithSnapshots({
      serviceId: payload.service.id,
      serviceVariantId,
      addOnIds,
      slot: resolvedSlot,
    });
  } catch {
    return { ok: false, status: 400, code: 'invalid_pricing_inputs', message: 'Invalid service or add-ons' };
  }

  // Validate payload totals match the server-authoritative recomputation.
  if (pricingSnapshot.totals.totalPrice !== payload.totalPrice || pricingSnapshot.totals.totalDuration !== payload.totalDuration) {
    console.warn('[booking-validator] pricing_mismatch (totals)', {
      server: { totalPrice: pricingSnapshot.totals.totalPrice, totalDuration: pricingSnapshot.totals.totalDuration },
      client: { totalPrice: payload.totalPrice, totalDuration: payload.totalDuration },
    });
    return { ok: false, status: 409, code: 'pricing_mismatch', message: 'Booking totals have changed. Please refresh.' };
  }

  // Ensure service price/duration snapshots are not manipulated.
  if (payload.service.price !== pricingSnapshot.service.price || payload.service.duration !== pricingSnapshot.service.duration) {
    console.warn('[booking-validator] pricing_mismatch (service)', {
      server: { price: pricingSnapshot.service.price, duration: pricingSnapshot.service.duration },
      client: { price: payload.service.price, duration: payload.service.duration },
    });
    return { ok: false, status: 409, code: 'pricing_mismatch', message: 'Service pricing has changed. Please refresh.' };
  }

  const serviceForInsert: BookingInsert['service'] = {
    ...payload.service,
    price: pricingSnapshot.service.price,
    duration: pricingSnapshot.service.duration,
  };

  // 3) Validate products from the authoritative catalog and compute product totals.
  if (!Array.isArray(payload.products)) {
    return { ok: false, status: 400, code: 'invalid_payload', message: 'Invalid products selection' };
  }

  const locale = payload.locale;
  const productQuantities = payload.products
    .filter((p) => p && typeof p.productId === 'string' && p.productId.length > 0)
    .map((p) => ({
      productId: p.productId,
      quantity: Math.floor(typeof p.quantity === 'number' ? p.quantity : 1),
      deliveryMethod: (p.deliveryMethod === 'home_delivery' ? 'home_delivery' : 'pickup_visit') as ProductDeliveryMethod,
    }))
    .filter((p) => p.quantity > 0);

  if (productQuantities.length !== payload.products.length) {
    return { ok: false, status: 400, code: 'invalid_payload', message: 'Invalid products quantities' };
  }

  const uniqueProductIds = [...new Set(productQuantities.map((p) => p.productId))];
  const productRows = await getProductsByIds(uniqueProductIds, locale);
  if (productRows.length !== uniqueProductIds.length) {
    return { ok: false, status: 400, code: 'invalid_pricing_inputs', message: 'Invalid products in booking' };
  }

  const productsById = new Map(productRows.map((p) => [p.id, p]));
  const productsForInsert: BookingInsert['products'] = productQuantities.map((p) => {
    const row = productsById.get(p.productId);
    if (!row) {
      // Defensive fallback; should not happen because we validated lengths above.
      return { productId: p.productId, name: '', unitPrice: 0, quantity: p.quantity, imageUrl: null };
    }

    return {
      productId: row.id,
      name: row.name,
      unitPrice: row.price,
      quantity: p.quantity,
      deliveryMethod: p.deliveryMethod,
      imageUrl: row.imageUrl ?? null,
    };
  });

  const productsTotalPrice = productsForInsert.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0);

  if (typeof payload.productsTotalPrice !== 'number' || payload.productsTotalPrice !== productsTotalPrice) {
    console.warn('[booking-validator] pricing_mismatch (products)', {
      server: productsTotalPrice,
      client: payload.productsTotalPrice,
    });
    return { ok: false, status: 409, code: 'pricing_mismatch', message: 'Products totals have changed. Please refresh.' };
  }

  return {
    ok: true,
    resolvedSlot,
    pricingSnapshot,
    serviceForInsert,
    productsForInsert,
    productsTotalPrice,
  };
}

