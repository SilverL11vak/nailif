import type {
  AddOn,
  BookingCheckoutMode,
  BookingCommerceSession,
  BookingPaymentStatus,
  BookingPricingSnapshot,
  BookingProductSelection,
  BookingStatus,
  BookingMode,
  ContactInfo,
  Service,
  ServiceVariant,
  TimeSlot,
} from '@/store/booking-types';
import { TALLINN_TIMEZONE } from '@/lib/timezone';
import { BOOKING_DEPOSIT_EUR } from '../pricing/calculate-booking-pricing';
import { calculateBookingCommercePricing } from '../pricing/calculate-booking-commerce-pricing';

export function createBookingSlotKey(date: string | null, time: string | null, technicianId?: string | null) {
  if (!date || !time) return null;
  return `${TALLINN_TIMEZONE}:${date}:${time}:${technicianId ?? 'any'}`;
}

export function resolveBookingCheckoutMode(products: BookingProductSelection[]): BookingCheckoutMode {
  return products.length > 0 ? 'booking_with_products' : 'booking_only';
}

export function buildBookingPricingSnapshot(input: {
  service: Service | null;
  variant: ServiceVariant | null;
  addOns: AddOn[];
  products: BookingProductSelection[];
  slot: TimeSlot | null;
}): BookingPricingSnapshot {
  const effectiveService = input.variant ?? input.service;
  const baseServicePrice = typeof effectiveService?.price === 'number' ? effectiveService.price : 0;
  const baseServiceDuration = typeof effectiveService?.duration === 'number' ? effectiveService.duration : 0;
  const extras = input.addOns
    .filter((addOn) => addOn.selected)
    .map((addOn) => ({
      id: addOn.id,
      name: addOn.name,
      unitPrice: addOn.price,
      quantity: 1,
      durationImpact: addOn.duration,
    }));
  const slotSurchargeTotal =
    input.slot?.isSos && typeof input.slot.sosSurcharge === 'number' ? input.slot.sosSurcharge : 0;
  const depositAmount = BOOKING_DEPOSIT_EUR;

  return calculateBookingCommercePricing({
    baseServicePrice,
    baseServiceDuration,
    extras,
    products: input.products,
    depositAmount,
    slotSurchargeTotal,
  });
}

export function buildBookingCommerceSession(input: {
  selectedService: Service | null;
  selectedVariant: ServiceVariant | null;
  selectedAddOns: AddOn[];
  selectedProducts: BookingProductSelection[];
  selectedSlot: TimeSlot | null;
  selectedDate: Date | null;
  contactInfo: ContactInfo | null;
  mode: BookingMode;
  status: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
  sessionId?: string | null;
  draftId?: string | null;
}): BookingCommerceSession {
  const pricing = buildBookingPricingSnapshot({
    service: input.selectedService,
    variant: input.selectedVariant,
    addOns: input.selectedAddOns,
    products: input.selectedProducts,
    slot: input.selectedSlot,
  });
  const selectedDate = input.selectedSlot?.date ?? (input.selectedDate ? input.selectedDate.toISOString().slice(0, 10) : null);
  const selectedTime = input.selectedSlot?.time ?? null;

  return {
    service: {
      serviceId: input.selectedService?.id ?? null,
      serviceName: input.selectedService?.name ?? null,
      variantId: input.selectedVariant?.id ?? null,
      variantName: input.selectedVariant?.name ?? null,
      serviceDuration: pricing.serviceDuration,
      baseServicePrice: pricing.baseServicePrice,
      depositAmount: pricing.depositAmount,
    },
    extras: input.selectedAddOns
      .filter((addOn) => addOn.selected)
      .map((addOn) => ({
        id: addOn.id,
        name: addOn.name,
        unitPrice: addOn.price,
        quantity: 1,
        durationImpact: addOn.duration,
      })),
    products: input.selectedProducts,
    appointment: {
      selectedDate,
      selectedTime,
      slotKey: createBookingSlotKey(selectedDate, selectedTime, null),
      timezone: 'Europe/Tallinn',
      technicianId: null,
    },
    customer: input.contactInfo,
    pricing,
    checkout: {
      mode: resolveBookingCheckoutMode(input.selectedProducts),
      paymentStatus: input.paymentStatus ?? 'unpaid',
      bookingStatus: input.status,
      flow: input.mode,
      sessionId: input.sessionId ?? null,
      draftId: input.draftId ?? null,
    },
  };
}
