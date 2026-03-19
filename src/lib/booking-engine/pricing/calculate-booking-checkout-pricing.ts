import type { BookingPricingSnapshot, BookingProductSelection } from '@/store/booking-types';
import { calculateBookingCommercePricing, calculateBookingProductsTotal } from './calculate-booking-commerce-pricing';

export type BookingCheckoutPricingRecordLike = {
  servicePrice: number;
  totalPrice: number;
  depositAmount: number;
  productsTotalPrice: number;
  pricingSnapshot?: BookingPricingSnapshot | null;
};

export type BookingCheckoutProductLike = Pick<BookingProductSelection, 'unitPrice' | 'quantity'>;

export type BookingCheckoutPricing = {
  baseServicePrice: number;
  serviceExtrasTotal: number;
  serviceTotal: number;
  bookingFee: number;
  depositAmount: number;
  remainingServiceBalance: number;
  productsTotal: number;
  payNowTotal: number;
  payLaterTotal: number;
  grandOrderValue: number;
};

function calculateBookingCheckoutTotals(input: {
  baseServicePrice: number;
  serviceTotal: number;
  depositAmount: number;
  productsTotal: number;
}): BookingCheckoutPricing {
  const pricing = calculateBookingCommercePricing({
    baseServicePrice: input.baseServicePrice,
    baseServiceDuration: 0,
    depositAmount: input.depositAmount,
    products: input.productsTotal > 0 ? [{ productId: 'derived', name: 'Derived', quantity: 1, unitPrice: input.productsTotal }] : [],
    slotSurchargeTotal: Math.max(0, input.serviceTotal - input.baseServicePrice),
  });
  const serviceExtrasTotal = Math.max(0, pricing.serviceTotal - pricing.baseServicePrice);

  return {
    baseServicePrice: pricing.baseServicePrice,
    serviceExtrasTotal,
    serviceTotal: pricing.serviceTotal,
    bookingFee: pricing.bookingFee,
    depositAmount: pricing.depositAmount,
    remainingServiceBalance: pricing.payLaterTotal,
    productsTotal: pricing.productsTotal,
    payNowTotal: pricing.payNowTotal,
    payLaterTotal: pricing.payLaterTotal,
    grandOrderValue: pricing.grandValue,
  };
}

export function calculateBookingCheckoutPricingFromBookingRecord(
  booking: BookingCheckoutPricingRecordLike,
): BookingCheckoutPricing {
  if (booking.pricingSnapshot) {
    const snapshot = booking.pricingSnapshot;
    const bookingFee = Math.max(0, Number(snapshot.bookingFee ?? snapshot.depositAmount ?? 0) || 0);
    const depositAmount = Math.max(0, Number(snapshot.depositAmount ?? bookingFee) || 0);
    const serviceTotal = Math.max(0, Number(snapshot.serviceTotal) || 0);
    const productsTotal = Math.max(0, Number(snapshot.productsTotal) || 0);
    const payNowTotal = Math.max(0, Number(snapshot.payNowTotal) || bookingFee + productsTotal);
    const payLaterTotal = Math.max(0, Number(snapshot.payLaterTotal) || serviceTotal - bookingFee);
    return {
      baseServicePrice: Math.max(0, Number(snapshot.baseServicePrice) || 0),
      serviceExtrasTotal: Math.max(0, Number(snapshot.extrasTotal) || 0) + Math.max(0, Number(snapshot.slotSurchargeTotal) || 0),
      serviceTotal,
      bookingFee,
      depositAmount,
      remainingServiceBalance: payLaterTotal,
      productsTotal,
      payNowTotal,
      payLaterTotal,
      grandOrderValue: Math.max(0, Number(snapshot.grandValue) || serviceTotal + productsTotal),
    };
  }

  return calculateBookingCheckoutTotals({
    baseServicePrice: booking.servicePrice,
    serviceTotal: booking.totalPrice,
    depositAmount: booking.depositAmount,
    productsTotal: booking.productsTotalPrice,
  });
}

export function calculateBookingCheckoutPricingFromStore(input: {
  baseServicePrice: number;
  serviceTotal: number;
  depositAmount: number;
  products?: BookingCheckoutProductLike[];
  productsTotal?: number;
}): BookingCheckoutPricing {
  const productsTotal = input.products
    ? calculateBookingProductsTotal(input.products)
    : Math.max(0, Number(input.productsTotal ?? 0));

  return calculateBookingCheckoutTotals({
    baseServicePrice: input.baseServicePrice,
    serviceTotal: input.serviceTotal,
    depositAmount: input.depositAmount,
    productsTotal,
  });
}

