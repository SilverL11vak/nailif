import type { EngineTimeSlot } from '../types';
import { getCurrentTimeInTallinn, getTodayInTallinn } from '../../timezone';
import { isSlotBookable } from './resolve-slot-status';

export function resolveEarliestUpcomingBookableSlot(slots: EngineTimeSlot[]): EngineTimeSlot | null {
  // Tallinn-based "upcoming" filtering:
  // - today slots are only considered upcoming if `slot.time > currentTallinnTime` (strictly greater).
  // - ordering is deterministic by `date` then `time` (both are `YYYY-MM-DD` and `HH:MM`).
  const bookable = slots.filter((s) => {
    const status = s.status;
    if (status) return isSlotBookable(status);
    // Fallback for callers that may not yet include `status` in slot objects.
    return s.available === true;
  });
  if (bookable.length === 0) return null;

  const today = getTodayInTallinn();
  const currentTime = getCurrentTimeInTallinn(); // HH:MM

  const upcoming = bookable.filter((s) => {
    if (s.date > today) return true;
    if (s.date === today && s.time > currentTime) return true;
    return false;
  });

  if (upcoming.length === 0) return null;

  return upcoming
    .slice()
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))[0];
}

