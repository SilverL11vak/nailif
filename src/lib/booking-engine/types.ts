export type SlotStatus = 'free' | 'blocked' | 'booked' | 'sos';

// Slot representation used by the booking engine.
// Note: `available` is derived from `status` and is the single boolean the UI can rely on.
export interface EngineTimeSlot {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)

  // Single source of availability truth for UI:
  // - `true` only for `free` and `sos`
  // - `false` for `blocked` and `booked`
  available: boolean;
  status: SlotStatus;

  capacity: number;
  count: number; // "how many seats left" (capacity for available slots, else 0)

  isPopular: boolean;
  isFastest: boolean;
  isSos: boolean;
  sosSurcharge?: number;
  sosLabel?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export type BookingView = 'public' | 'booking' | 'admin';

