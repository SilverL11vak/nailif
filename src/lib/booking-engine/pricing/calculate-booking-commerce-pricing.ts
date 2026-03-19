import type {
  BookingExtraSelection,
  BookingPricingSnapshot,
  BookingProductSelection,
} from '@/store/booking-types';
import { BOOKING_DEPOSIT_EUR } from './calculate-booking-pricing';

export type BookingCommercePricingInput = {
  baseServicePrice: number;
  baseServiceDuration: number;
  extras?: BookingExtraSelection[];
  products?: BookingProductSelection[];
  depositAmount?: number | null;
  slotSurchargeTotal?: number;
};

function normalizeCurrencyAmount(value: unknown): number {
  return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
}

function normalizeQuantity(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function calculateBookingProductsTotal(products: Pick<BookingProductSelection, 'unitPrice' | 'quantity'>[]): number {
  return products.reduce((sum, product) => {
    return sum + normalizeCurrencyAmount(product.unitPrice) * normalizeQuantity(product.quantity);
  }, 0);
}

export function calculateBookingExtrasTotal(extras: Pick<BookingExtraSelection, 'unitPrice' | 'quantity'>[]): number {
  return extras.reduce((sum, extra) => {
    return sum + normalizeCurrencyAmount(extra.unitPrice) * normalizeQuantity(extra.quantity);
  }, 0);
}

export function calculateBookingExtrasDuration(extras: Pick<BookingExtraSelection, 'durationImpact' | 'quantity'>[]): number {
  return extras.reduce((sum, extra) => {
    return sum + normalizeCurrencyAmount(extra.durationImpact) * normalizeQuantity(extra.quantity);
  }, 0);
}

export function calculateBookingCommercePricing(input: BookingCommercePricingInput): BookingPricingSnapshot {
  const baseServicePrice = normalizeCurrencyAmount(input.baseServicePrice);
  const baseServiceDuration = normalizeCurrencyAmount(input.baseServiceDuration);
  const extras = input.extras ?? [];
  const products = input.products ?? [];
  const extrasTotal = calculateBookingExtrasTotal(extras);
  const extrasDuration = calculateBookingExtrasDuration(extras);
  const slotSurchargeTotal = normalizeCurrencyAmount(input.slotSurchargeTotal);
  const serviceTotal = baseServicePrice + extrasTotal + slotSurchargeTotal;
  const productsTotal = calculateBookingProductsTotal(products);
  const bookingFee = Math.min(
    serviceTotal,
    normalizeCurrencyAmount(input.depositAmount ?? BOOKING_DEPOSIT_EUR),
  );
  const payLaterTotal = Math.max(0, serviceTotal - bookingFee);
  const payNowTotal = bookingFee + productsTotal;
  const grandValue = serviceTotal + productsTotal;

  return {
    baseServicePrice,
    extrasTotal,
    slotSurchargeTotal,
    serviceTotal,
    productsTotal,
    bookingFee,
    depositAmount: bookingFee,
    payNowTotal,
    payLaterTotal,
    grandValue,
    serviceDuration: baseServiceDuration,
    extrasDuration,
    totalDuration: baseServiceDuration + extrasDuration,
  };
}
