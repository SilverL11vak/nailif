// Types for the booking system

/** Sub-service (variant) under a main service: own price, duration, optional deposit. */
export interface ServiceVariant {
  id: string;
  serviceId: string;
  name: string;
  nameEt?: string;
  nameEn?: string;
  price: number;
  duration: number;
  depositAmount?: number | null;
  isActive: boolean;
  orderIndex: number;
}

export interface Service {
  id: string;
  name: string;
  nameEt?: string;
  nameEn?: string;
  duration: number; // in minutes (used when no variants)
  price: number; // used when no variants
  description?: string;
  descriptionEt?: string;
  descriptionEn?: string;
  resultDescription?: string;
  resultDescriptionEt?: string;
  resultDescriptionEn?: string;
  longevityDescription?: string;
  longevityDescriptionEt?: string;
  longevityDescriptionEn?: string;
  suitabilityNote?: string;
  suitabilityNoteEt?: string;
  suitabilityNoteEn?: string;
  imageUrl?: string | null;
  isPopular?: boolean;
  category: string;
  categoryId?: string;
  categoryName?: string;
  categoryNameEt?: string;
  categoryNameEn?: string;
  allowAddOns?: boolean;
  /** When present, customer must choose one variant before slot selection. */
  variants?: ServiceVariant[];
}

/** Effective bookable item: either a service (no variants) or a selected variant. */
export interface BookableItem {
  id: string;
  name: string;
  price: number;
  duration: number;
  serviceId: string;
  variantId?: string;
}

export interface TimeSlot {
  id: string;
  time: string; // "14:30"
  date: string; // "2026-03-18"
  available: boolean;
  isBooked?: boolean;
  count?: number; // For "2 left" display
  isPopular?: boolean; // Show star badge
  isFastest?: boolean; // Show lightning badge
  isSos?: boolean;
  sosSurcharge?: number;
  sosLabel?: string | null;
  smartScore?: number;
  isRecommended?: boolean;
  isLastMinuteBoost?: boolean;
  smartReason?: string | null;
}

export interface ContactInfo {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  notes?: string;
  inspirationImage?: string;
  currentNailImage?: string;
  inspirationNote?: string;
}

export interface AddOn {
  id: string;
  serviceId?: string | null;
  name: string;
  duration: number; // minutes to add
  price: number;
  description?: string;
  selected: boolean;
}

export interface NailStyle {
  id: string;
  name: string;
  slug: string;
  description?: string;
  // Service that best matches this style
  recommendedServiceId: string;
  // For visual reference in booking summary
  emoji?: string;
}

export interface Booking {
  id: string;
  service: Service;
  slot: TimeSlot;
  contact: ContactInfo;
  addOns: AddOn[];
  totalPrice: number;
  totalDuration: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export type BookingStatus = 'idle' | 'selecting' | 'confirming' | 'success' | 'error';
export type BookingMode = 'fast' | 'guided';
export type BookingStep = 1 | 2 | 3 | 4 | 5;
export type BookingCheckoutMode = 'booking_only' | 'booking_with_products';
export type BookingPaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed';
export type ProductDeliveryMethod = 'pickup_visit' | 'home_delivery';

export interface BookingProductSelection {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  deliveryMethod?: ProductDeliveryMethod;
  sku?: string | null;
  imageUrl?: string | null;
}

export interface BookingExtraSelection {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  durationImpact: number;
}

export interface BookingServiceSelectionSnapshot {
  serviceId: string | null;
  serviceName: string | null;
  variantId: string | null;
  variantName: string | null;
  serviceDuration: number;
  baseServicePrice: number;
  depositAmount: number;
}

export interface BookingAppointmentSnapshot {
  selectedDate: string | null;
  selectedTime: string | null;
  slotKey: string | null;
  timezone: 'Europe/Tallinn';
  technicianId: string | null;
}

export interface BookingPricingSnapshot {
  baseServicePrice: number;
  extrasTotal: number;
  slotSurchargeTotal: number;
  serviceTotal: number;
  productsTotal: number;
  bookingFee: number;
  depositAmount: number;
  payNowTotal: number;
  payLaterTotal: number;
  grandValue: number;
  serviceDuration: number;
  extrasDuration: number;
  totalDuration: number;
}

export interface BookingCheckoutSnapshot {
  mode: BookingCheckoutMode;
  paymentStatus: BookingPaymentStatus;
  bookingStatus: BookingStatus;
  flow: BookingMode;
  sessionId: string | null;
  draftId: string | null;
}

export interface BookingCommerceSession {
  service: BookingServiceSelectionSnapshot;
  extras: BookingExtraSelection[];
  products: BookingProductSelection[];
  appointment: BookingAppointmentSnapshot;
  customer: ContactInfo | null;
  pricing: BookingPricingSnapshot;
  checkout: BookingCheckoutSnapshot;
}
