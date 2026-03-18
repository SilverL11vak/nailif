import type { TimeSlot } from '@/store/booking-types';
import { resolveEarliestUpcomingBookableSlot } from './booking-engine/availability/earliest-slot';

/**
 * Resolve the earliest upcoming (future) available slot in Europe/Tallinn.
 *
 * Assumes slot formats are normalized:
 * - `slot.date` is `YYYY-MM-DD`
 * - `slot.time` is `HH:MM` (24h, zero-padded)
 */
export function resolveEarliestUpcomingSlot(slots: TimeSlot[]): TimeSlot | null {
  // Delegate to the centralized booking-engine helper (Tallinn-aware + deterministic ordering).
  return resolveEarliestUpcomingBookableSlot(slots as unknown as any) as TimeSlot | null;
}

