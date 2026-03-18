import type { EngineTimeSlot, SlotStatus } from '../types';

export function resolveSlotStatus(input: { hasActiveBooking: boolean; slotAvailable: boolean; isSos: boolean }): SlotStatus {
  // Priority rules:
  // 1) Any non-cancelled booking => booked (even if time_slots.available=true)
  if (input.hasActiveBooking) return 'booked';

  // 2) time_slots.available=false => blocked
  if (!input.slotAvailable) return 'blocked';

  // 3) time_slots.is_sos=true and slotAvailable=true => sos
  if (input.isSos) return 'sos';

  // 4) Default => free
  return 'free';
}

export function isSlotBookable(status: SlotStatus): boolean {
  return status === 'free' || status === 'sos';
}

export function toEngineAvailability(input: {
  id: string;
  date: string;
  time: string;
  capacity: number;
  isPopular: boolean;
  isFastest: boolean;
  isSos: boolean;
  sosSurcharge?: number | null;
  sosLabel?: string | null;
  hasActiveBooking: boolean;
  slotAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}): EngineTimeSlot {
  const status = resolveSlotStatus({
    hasActiveBooking: input.hasActiveBooking,
    slotAvailable: input.slotAvailable,
    isSos: input.isSos,
  });

  const available = isSlotBookable(status);

  return {
    id: input.id,
    date: input.date,
    time: input.time,
    status,
    available,
    capacity: input.capacity,
    count: available ? input.capacity : 0,
    isPopular: input.isPopular,
    isFastest: input.isFastest,
    isSos: input.isSos,
    sosSurcharge: input.isSos ? input.sosSurcharge ?? undefined : undefined,
    sosLabel: input.isSos ? input.sosLabel ?? null : null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

