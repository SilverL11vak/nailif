// Types for the booking system

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  description?: string;
  isPopular?: boolean;
  category: 'manicure' | 'pedicure' | 'extensions' | 'nail-art';
}

export interface TimeSlot {
  id: string;
  time: string; // "14:30"
  date: string; // "2026-03-18"
  available: boolean;
  count?: number; // For "2 left" display
  isPopular?: boolean; // Show star badge
  isFastest?: boolean; // Show lightning badge
}

export interface ContactInfo {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface AddOn {
  id: string;
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
