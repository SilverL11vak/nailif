import type { BookingProductSelection } from '@/store/booking-types';

const BOOKING_PRODUCT_INTENT_KEY = 'booking_product_intent_v1';

export type BookingProductIntent = Pick<
  BookingProductSelection,
  'productId' | 'name' | 'unitPrice' | 'quantity' | 'imageUrl' | 'sku'
>;

export function setBookingProductIntent(intent: BookingProductIntent) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(BOOKING_PRODUCT_INTENT_KEY, JSON.stringify(intent));
  } catch {
    // no-op
  }
}

export function consumeBookingProductIntent(): BookingProductIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(BOOKING_PRODUCT_INTENT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(BOOKING_PRODUCT_INTENT_KEY);
    const parsed = JSON.parse(raw) as Partial<BookingProductIntent>;
    if (!parsed || typeof parsed.productId !== 'string' || typeof parsed.name !== 'string' || typeof parsed.unitPrice !== 'number') {
      return null;
    }
    const quantity = Number.isFinite(parsed.quantity) && Number(parsed.quantity) > 0 ? Math.floor(Number(parsed.quantity)) : 1;
    return {
      productId: parsed.productId,
      name: parsed.name,
      unitPrice: parsed.unitPrice,
      quantity,
      imageUrl: parsed.imageUrl ?? null,
      sku: parsed.sku ?? null,
    };
  } catch {
    return null;
  }
}

export function clearBookingProductIntent() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(BOOKING_PRODUCT_INTENT_KEY);
  } catch {
    // no-op
  }
}
