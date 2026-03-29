import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type {
  Service,
  ServiceVariant,
  TimeSlot,
  ContactInfo,
  AddOn,
  BookingProductSelection,
  BookingStatus,
  BookingMode,
  BookingStep,
  NailStyle,
  BookingCommerceSession,
  BookingPricingSnapshot,
  BookingCheckoutMode,
} from './booking-types';
import type { EngineTimeSlot } from '@/lib/booking-engine/types';
import { calculateBookingPricing } from '@/lib/booking-engine/pricing/calculate-booking-pricing';
import {
  buildBookingCommerceSession,
  resolveBookingCheckoutMode,
} from '@/lib/booking-engine/session/booking-commerce-session';

interface BookingState {
  // Mode selection
  mode: BookingMode;

  // Service selection (parent service + optional variant)
  selectedService: Service | null;
  selectedVariant: ServiceVariant | null;
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
  
  // Gallery style selection (from deep link)
  selectedStyle: NailStyle | null;
  
  // Contact info
  contactInfo: ContactInfo | null;
  
  // Add-ons
  selectedAddOns: AddOn[];

  // Retail products added to the booking/checkout.
  selectedProducts: BookingProductSelection[];
  
  // Flow status
  currentStep: BookingStep;
  status: BookingStatus;
  error: string | null;
  
  // Fast path specific
  fastBooking: {
    isActive: boolean;
    preSelectedService?: Service;
    preSelectedSlot?: TimeSlot;
  };
  
  // Computed values
  totalPrice: number;
  totalDuration: number;
  pricing: BookingPricingSnapshot;
  checkoutMode: BookingCheckoutMode;
  
  // Actions - Mode
  setMode: (mode: BookingMode) => void;
  
  // Actions - Selection
  selectService: (service: Service) => void;
  setSelectedVariant: (variant: ServiceVariant | null) => void;
  selectDate: (date: Date) => void;
  selectSlot: (slot: TimeSlot | null) => void;
  setContactInfo: (info: ContactInfo) => void;
  setSelectedStyle: (style: NailStyle | null) => void;
  
  // Actions - Add-ons
  setAddOns: (addOns: AddOn[]) => void;
  toggleAddOn: (addOn: AddOn) => void;
  clearAddOns: () => void;

  // Actions - Products
  addProductToBooking: (product: Omit<BookingProductSelection, 'quantity'> & { quantity?: number }) => void;
  removeProductFromBooking: (productId: string) => void;
  setProductQuantity: (productId: string, quantity: number) => void;
  setProductDeliveryMethod: (productId: string, deliveryMethod: 'pickup_visit' | 'home_delivery') => void;
  
  // Actions - Flow
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: BookingStep) => void;
  setStatus: (status: BookingStatus) => void;
  setError: (error: string | null) => void;
  
  // Actions - Fast booking
  activateFastBooking: (service: Service, slot: TimeSlot) => void;
  deactivateFastBooking: () => void;
  
  // Actions - Reset
  reset: () => void;
  
  // Computed helpers
  calculateTotals: () => void;
  getSession: () => BookingCommerceSession;
  getServiceSummary: () => BookingCommerceSession['service'];
  getProductsSummary: () => BookingCommerceSession['products'];
  getPricingSummary: () => BookingPricingSnapshot;
  getCheckoutBreakdown: () => BookingCommerceSession['checkout'] & { pricing: BookingPricingSnapshot };
  getAppointmentSummary: () => BookingCommerceSession['appointment'];
  getCanProceedToPayment: () => boolean;
}

const initialState = {
  mode: 'guided' as BookingMode,
  selectedService: null,
  selectedVariant: null,
  selectedDate: null,
  selectedSlot: null,
  selectedStyle: null,
  contactInfo: null,
  selectedAddOns: [] as AddOn[],
  selectedProducts: [] as BookingProductSelection[],
  currentStep: 1 as BookingStep,
  status: 'idle' as BookingStatus,
  error: null,
  fastBooking: {
    isActive: false,
  },
  totalPrice: 0,
  totalDuration: 0,
  pricing: {
    baseServicePrice: 0,
    extrasTotal: 0,
    slotSurchargeTotal: 0,
    serviceTotal: 0,
    productsTotal: 0,
    bookingFee: 0,
    depositAmount: 0,
    payNowTotal: 0,
    payLaterTotal: 0,
    grandValue: 0,
    serviceDuration: 0,
    extrasDuration: 0,
    totalDuration: 0,
  } as BookingPricingSnapshot,
  checkoutMode: 'booking_only' as BookingCheckoutMode,
};

const safeBookingStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
      return;
    } catch (error) {
      const isQuotaError =
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      if (!isQuotaError) return;
      try {
        localStorage.removeItem(name);
      } catch {
        // ignore
      }
      try {
        localStorage.setItem(name, value);
      } catch {
        // If still failing, silently skip persistence to keep UI functional.
      }
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

function compactServiceForPersist(service: Service | null): Service | null {
  if (!service) return null;
  return {
    id: service.id,
    name: service.name,
    nameEt: service.nameEt,
    nameEn: service.nameEn,
    duration: service.duration,
    price: service.price,
    category: service.category,
    allowAddOns: service.allowAddOns,
    isPopular: service.isPopular,
  };
}

function compactVariantForPersist(variant: ServiceVariant | null): ServiceVariant | null {
  if (!variant) return null;
  return {
    id: variant.id,
    serviceId: variant.serviceId,
    name: variant.name,
    nameEt: variant.nameEt,
    nameEn: variant.nameEn,
    price: variant.price,
    duration: variant.duration,
    depositAmount: variant.depositAmount,
    isActive: variant.isActive,
    orderIndex: variant.orderIndex,
  };
}

function compactSlotForPersist(slot: TimeSlot | null): TimeSlot | null {
  if (!slot) return null;
  return {
    id: slot.id,
    time: slot.time,
    date: slot.date,
    available: slot.available,
    isBooked: slot.isBooked,
    count: slot.count,
    isPopular: slot.isPopular,
    isFastest: slot.isFastest,
    isSos: slot.isSos,
    sosSurcharge: slot.sosSurcharge,
    sosLabel: slot.sosLabel,
    smartScore: slot.smartScore,
    isRecommended: slot.isRecommended,
    isLastMinuteBoost: slot.isLastMinuteBoost,
    smartReason: slot.smartReason,
  };
}

function compactAddOnsForPersist(addOns: AddOn[]): AddOn[] {
  return addOns.map((addOn) => ({
    id: addOn.id,
    serviceId: addOn.serviceId ?? null,
    name: addOn.name,
    duration: addOn.duration,
    price: addOn.price,
    selected: addOn.selected,
  }));
}

function compactProductsForPersist(products: BookingProductSelection[]): BookingProductSelection[] {
  return products.map((product) => ({
    productId: product.productId,
    name: product.name,
    unitPrice: product.unitPrice,
    quantity: product.quantity,
    deliveryMethod: product.deliveryMethod ?? 'pickup_visit',
    sku: product.sku ?? null,
  }));
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setMode: (mode) => set({ mode }),

      selectService: (service) => {
        const clearedAddOns = get().selectedAddOns.map((a) => ({ ...a, selected: false }));
        set({ selectedService: service, selectedVariant: null, selectedAddOns: clearedAddOns });
        get().calculateTotals();
      },

      setSelectedVariant: (variant) => {
        set({ selectedVariant: variant });
        get().calculateTotals();
      },

      selectDate: (date) => set({ selectedDate: date }),

      selectSlot: (slot) => {
        set({ selectedSlot: slot });
        get().calculateTotals();
      },

      setSelectedStyle: (style) => set({ selectedStyle: style }),

      setContactInfo: (info) => set({ contactInfo: info }),

      toggleAddOn: (addOn) => {
        const currentAddOns = get().selectedAddOns;
        const updatedAddOns = currentAddOns.map((a) =>
          a.id === addOn.id ? { ...a, selected: !a.selected } : a
        );
        set({ selectedAddOns: updatedAddOns });
        get().calculateTotals();
      },

      setAddOns: (addOns) => {
        const selectedById = new Set(get().selectedAddOns.filter((item) => item.selected).map((item) => item.id));
        const normalized = addOns.map((item) => ({
          ...item,
          selected: selectedById.has(item.id),
        }));
        set({ selectedAddOns: normalized });
        get().calculateTotals();
      },

      clearAddOns: () => {
        const clearedAddOns = get().selectedAddOns.map((a) => ({
          ...a,
          selected: false,
        }));
        set({ selectedAddOns: clearedAddOns });
        get().calculateTotals();
      },

      addProductToBooking: (product) => {
        const quantity = product.quantity ?? 1;
        if (!product.productId || typeof quantity !== 'number' || quantity <= 0) return;
        const current = get().selectedProducts;
        const existing = current.find((p) => p.productId === product.productId);
        if (existing) {
          set({
            selectedProducts: current.map((p) =>
              p.productId === product.productId
                ? { ...p, quantity: p.quantity + Math.max(1, Math.floor(quantity)) }
                : p
            ),
          });
          get().calculateTotals();
          return;
        }
        set({
          selectedProducts: [
            ...current,
            {
              productId: product.productId,
              name: product.name,
              unitPrice: product.unitPrice,
              quantity: Math.max(1, Math.floor(quantity)),
              deliveryMethod: product.deliveryMethod ?? 'pickup_visit',
              imageUrl: product.imageUrl ?? null,
            },
          ],
        });
        get().calculateTotals();
      },

      removeProductFromBooking: (productId) => {
        set({ selectedProducts: get().selectedProducts.filter((p) => p.productId !== productId) });
        get().calculateTotals();
      },

      setProductQuantity: (productId, quantity) => {
        const q = Math.floor(quantity);
        if (!Number.isFinite(q) || q <= 0) {
          set({ selectedProducts: get().selectedProducts.filter((p) => p.productId !== productId) });
          return;
        }
        set({
          selectedProducts: get().selectedProducts.map((p) => (p.productId === productId ? { ...p, quantity: q } : p)),
        });
        get().calculateTotals();
      },

      setProductDeliveryMethod: (productId, deliveryMethod) => {
        set({
          selectedProducts: get().selectedProducts.map((p) =>
            p.productId === productId ? { ...p, deliveryMethod } : p
          ),
        });
      },

      nextStep: () => {
        const currentStep = get().currentStep;
        if (currentStep < 5) {
          set({ currentStep: (currentStep + 1) as BookingStep });
        }
      },

      prevStep: () => {
        const currentStep = get().currentStep;
        if (currentStep > 1) {
          set({ currentStep: (currentStep - 1) as BookingStep });
        }
      },

      setStep: (step) => set({ currentStep: step }),

      setStatus: (status) => set({ status }),

      setError: (error) => set({ error }),

      activateFastBooking: (service, slot) => {
        const clearedAddOns = get().selectedAddOns.map((a) => ({ ...a, selected: false }));
        set({
          fastBooking: {
            isActive: true,
            preSelectedService: service,
            preSelectedSlot: slot,
          },
          selectedService: service,
          selectedVariant: null,
          selectedAddOns: clearedAddOns,
          selectedSlot: slot,
          mode: 'fast',
        });
        get().calculateTotals();
      },

      deactivateFastBooking: () => {
        set({
          fastBooking: {
            isActive: false,
          },
          mode: 'guided',
        });
      },

      reset: () => {
        set({
          ...initialState,
          selectedAddOns: [],
          selectedProducts: [],
        });
      },

      calculateTotals: () => {
        const { selectedService, selectedVariant, selectedAddOns, selectedSlot, selectedProducts } = get();

        if (!selectedService) {
          set({
            totalPrice: 0,
            totalDuration: 0,
            pricing: initialState.pricing,
            checkoutMode: resolveBookingCheckoutMode(selectedProducts),
          });
          return;
        }

        const effective = selectedVariant ?? selectedService;
        const engineSlot: EngineTimeSlot | null = selectedSlot
          ? {
              id: selectedSlot.id,
              date: selectedSlot.date,
              time: selectedSlot.time,
              available: Boolean(selectedSlot.available),
              status: selectedSlot.isSos ? 'sos' : selectedSlot.available ? 'free' : 'blocked',
              capacity: selectedSlot.count ?? 1,
              count: selectedSlot.count ?? (selectedSlot.available ? 1 : 0),
              isPopular: Boolean(selectedSlot.isPopular),
              isFastest: Boolean(selectedSlot.isFastest),
              isSos: Boolean(selectedSlot.isSos),
              sosSurcharge: typeof selectedSlot.sosSurcharge === 'number' ? selectedSlot.sosSurcharge : undefined,
              sosLabel: selectedSlot.sosLabel ?? null,
            }
          : null;

        const selectedAddOnsResolved = selectedAddOns
          .filter((a) => a.selected)
          .map((a) => ({
            price: a.price,
            duration: a.duration,
          }));

        const totals = calculateBookingPricing({
          service: {
            price: typeof effective.price === 'number' ? effective.price : selectedService.price,
            duration: typeof effective.duration === 'number' ? effective.duration : selectedService.duration,
          },
          slot: engineSlot ?? ({
            id: 'unknown',
            date: '',
            time: '',
            available: true,
            status: 'free',
            capacity: 1,
            count: 1,
            isPopular: false,
            isFastest: false,
            isSos: false,
          } as EngineTimeSlot),
          addOns: selectedAddOnsResolved,
        });

        const session = buildBookingCommerceSession({
          selectedService,
          selectedVariant,
          selectedAddOns,
          selectedProducts,
          selectedSlot,
          selectedDate: get().selectedDate,
          contactInfo: get().contactInfo,
          mode: get().mode,
          status: get().status,
          paymentStatus: 'unpaid',
        });

        set({
          totalPrice: totals.totalPrice,
          totalDuration: totals.totalDuration,
          pricing: session.pricing,
          checkoutMode: session.checkout.mode,
        });
      },
      getSession: () => {
        const state = get();
        return buildBookingCommerceSession({
          selectedService: state.selectedService,
          selectedVariant: state.selectedVariant,
          selectedAddOns: state.selectedAddOns,
          selectedProducts: state.selectedProducts,
          selectedSlot: state.selectedSlot,
          selectedDate: state.selectedDate,
          contactInfo: state.contactInfo,
          mode: state.mode,
          status: state.status,
          paymentStatus: 'unpaid',
        });
      },
      getServiceSummary: () => get().getSession().service,
      getProductsSummary: () => get().getSession().products,
      getPricingSummary: () => get().getSession().pricing,
      getCheckoutBreakdown: () => {
        const session = get().getSession();
        return { ...session.checkout, pricing: session.pricing };
      },
      getAppointmentSummary: () => get().getSession().appointment,
      getCanProceedToPayment: () => {
        const session = get().getSession();
        return Boolean(
          session.service.serviceId &&
          session.appointment.selectedDate &&
          session.appointment.selectedTime &&
          session.customer?.firstName &&
          session.customer?.phone
        );
      },
    }),
    {
      name: 'nailify-booking',
      storage: createJSONStorage(() => safeBookingStorage),
      onRehydrateStorage: () => (state) => {
        state?.calculateTotals();
      },
      partialize: (state) =>
        ({
          contactInfo: state.contactInfo
            ? {
                ...state.contactInfo,
                inspirationImage: undefined,
                currentNailImage: undefined,
              }
            : null,
          selectedService: compactServiceForPersist(state.selectedService),
          selectedVariant: compactVariantForPersist(state.selectedVariant),
          selectedSlot: compactSlotForPersist(state.selectedSlot),
          selectedAddOns: compactAddOnsForPersist(state.selectedAddOns),
          selectedProducts: compactProductsForPersist(state.selectedProducts),
        }) as BookingState,
    }
  )
);

// Selectors for optimized re-renders
export const useSelectedService = () => useBookingStore((state) => state.selectedService);
export const useSelectedVariant = () => useBookingStore((state) => state.selectedVariant);
export const useSelectedSlot = () => useBookingStore((state) => state.selectedSlot);
export const useSelectedProducts = () => useBookingStore((state) => state.selectedProducts);
export const useBookingStatus = () => useBookingStore((state) => state.status);
export const useFastBooking = () => useBookingStore((state) => state.fastBooking);
export const useTotals = () => {
  const price = useBookingStore((state) => state.totalPrice);
  const duration = useBookingStore((state) => state.totalDuration);
  return { price, duration };
};
export const useBookingSession = () => useBookingStore((state) => state.getSession());
export const usePricingSummary = () => useBookingStore((state) => state.getPricingSummary());
export const useCheckoutBreakdown = () => useBookingStore((state) => state.getCheckoutBreakdown());
export const useAppointmentSummary = () => useBookingStore((state) => state.getAppointmentSummary());
export const useCanProceedToPayment = () => useBookingStore((state) => state.getCanProceedToPayment());
export const useSelectedAddOns = () => {
  const addOns = useBookingStore((state) => state.selectedAddOns);
  return addOns.filter((item) => item.selected);
};
