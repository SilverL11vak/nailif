import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Service, 
  TimeSlot, 
  ContactInfo, 
  AddOn, 
  BookingStatus, 
  BookingMode, 
  BookingStep 
} from './booking-types';

interface BookingState {
  // Mode selection
  mode: BookingMode;
  
  // Service selection
  selectedService: Service | null;
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
  
  // Contact info
  contactInfo: ContactInfo | null;
  
  // Add-ons
  selectedAddOns: AddOn[];
  
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
  
  // Actions - Mode
  setMode: (mode: BookingMode) => void;
  
  // Actions - Selection
  selectService: (service: Service) => void;
  selectDate: (date: Date) => void;
  selectSlot: (slot: TimeSlot) => void;
  setContactInfo: (info: ContactInfo) => void;
  
  // Actions - Add-ons
  toggleAddOn: (addOn: AddOn) => void;
  clearAddOns: () => void;
  
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
}

// Initial add-ons data (would come from API in production)
const initialAddOns: AddOn[] = [
  {
    id: 'cuticle-care',
    name: 'Cuticle Care',
    duration: 10,
    price: 8,
    description: 'Keeps nails healthy between visits',
    selected: false,
  },
  {
    id: 'hand-massage',
    name: 'Hand Massage',
    duration: 15,
    price: 12,
    description: 'Relaxing massage for stressed hands',
    selected: false,
  },
  {
    id: 'nail-strengthener',
    name: 'Nail Strengthening',
    duration: 10,
    price: 8,
    description: 'Extra strength for weak nails',
    selected: false,
  },
  {
    id: 'aftercare-kit',
    name: 'Aftercare Kit',
    duration: 0,
    price: 15,
    description: 'Take home care products',
    selected: false,
  },
];

const initialState = {
  mode: 'guided' as BookingMode,
  selectedService: null,
  selectedDate: null,
  selectedSlot: null,
  contactInfo: null,
  selectedAddOns: initialAddOns,
  currentStep: 1 as BookingStep,
  status: 'idle' as BookingStatus,
  error: null,
  fastBooking: {
    isActive: false,
  },
  totalPrice: 0,
  totalDuration: 0,
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setMode: (mode) => set({ mode }),

      selectService: (service) => {
        set({ selectedService: service });
        get().calculateTotals();
      },

      selectDate: (date) => set({ selectedDate: date }),

      selectSlot: (slot) => set({ selectedSlot: slot }),

      setContactInfo: (info) => set({ contactInfo: info }),

      toggleAddOn: (addOn) => {
        const currentAddOns = get().selectedAddOns;
        const updatedAddOns = currentAddOns.map((a) =>
          a.id === addOn.id ? { ...a, selected: !a.selected } : a
        );
        set({ selectedAddOns: updatedAddOns });
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
        set({
          fastBooking: {
            isActive: true,
            preSelectedService: service,
            preSelectedSlot: slot,
          },
          selectedService: service,
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
          selectedAddOns: initialAddOns,
        });
      },

      calculateTotals: () => {
        const { selectedService, selectedAddOns } = get();
        
        if (!selectedService) {
          set({ totalPrice: 0, totalDuration: 0 });
          return;
        }

        let price = selectedService.price;
        let duration = selectedService.duration;

        selectedAddOns.forEach((addOn) => {
          if (addOn.selected) {
            price += addOn.price;
            duration += addOn.duration;
          }
        });

        set({ totalPrice: price, totalDuration: duration });
      },
    }),
    {
      name: 'nailify-booking',
      partialize: (state) => ({
        // Only persist contact info for returning users
        contactInfo: state.contactInfo,
        selectedService: state.selectedService,
      }),
    }
  )
);

// Selectors for optimized re-renders
export const useSelectedService = () => useBookingStore((state) => state.selectedService);
export const useSelectedSlot = () => useBookingStore((state) => state.selectedSlot);
export const useBookingStatus = () => useBookingStore((state) => state.status);
export const useFastBooking = () => useBookingStore((state) => state.fastBooking);
export const useTotals = () => useBookingStore((state) => ({
  price: state.totalPrice,
  duration: state.totalDuration,
}));
export const useSelectedAddOns = () => useBookingStore((state) => 
  state.selectedAddOns.filter((a) => a.selected)
);
