import type { BookingView, EngineTimeSlot } from '../types';
import { ensureSlotWindow } from './ensure-slot-window';
import { toEngineAvailability } from './resolve-slot-status';
import { getCurrentTimeInTallinn, getTodayInTallinn } from '@/lib/timezone';
import { ensureBookingsTable } from '@/lib/bookings';
import { sql } from '@/lib/db';

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const TALLINN_TIMEZONE = 'Europe/Tallinn';

function formatTallinnYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TALLINN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDaysTallinnYmd(ymd: string, days: number): string {
  if (!isDateString(ymd)) throw new Error('Invalid ymd');
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatTallinnYmd(dt);
}

export async function listResolvedSlotsInRange(input: {
  from: string;
  to: string;
  view?: BookingView;
  includeUnavailable?: boolean;
}): Promise<EngineTimeSlot[]> {
  const view: BookingView = input.view ?? 'public';
  const includeUnavailable = input.includeUnavailable ?? false;

  if (!isDateString(input.from) || !isDateString(input.to)) {
    throw new Error('Invalid slot range');
  }

  await ensureBookingsTable();
  // Slot-date/time comparisons are done using the same `(slot_date, slot_time)` keys
  // everywhere in the engine, so booked/blocked resolution stays deterministic.
  await ensureSlotWindow(input.from, input.to);

  const rows = await sql<{
    id: number;
    slot_date: string;
    slot_time: string;
    slot_available: boolean;
    capacity: number;
    is_popular: boolean;
    is_fastest: boolean;
    is_sos: boolean;
    sos_surcharge: number | null;
    sos_label: string | null;
    has_active_booking: boolean;
    created_at: string;
    updated_at: string;
  }[]>`
    WITH booked AS (
      -- Deduplicate bookings by slot date+time so one time_slots row
      -- maps to exactly one resolved slot status.
      -- Expired pending_payment bookings (>30 min old) are treated as abandoned
      -- and do NOT block slots.
      SELECT DISTINCT slot_date, slot_time
      FROM bookings
      WHERE slot_date BETWEEN ${input.from}::date AND ${input.to}::date
        AND (
          status IN ('confirmed', 'completed')
          OR (status = 'pending_payment' AND created_at > NOW() - INTERVAL '30 minutes')
        )
    )
    SELECT
      ts.id,
      ts.slot_date::text AS slot_date,
      ts.slot_time,
      ts.available AS slot_available,
      ts.capacity,
      ts.is_popular,
      ts.is_fastest,
      ts.is_sos,
      ts.sos_surcharge,
      ts.sos_label,
      (b.slot_date IS NOT NULL) AS has_active_booking,
      ts.created_at::text AS created_at,
      ts.updated_at::text AS updated_at
    FROM time_slots ts
    LEFT JOIN booked b
      ON b.slot_date = ts.slot_date
     AND b.slot_time = ts.slot_time
    WHERE ts.slot_date BETWEEN ${input.from}::date AND ${input.to}::date
    ORDER BY ts.slot_date ASC, ts.slot_time ASC
  `;

  let resolved: EngineTimeSlot[] = rows.map((row) =>
    toEngineAvailability({
      id: String(row.id),
      date: row.slot_date,
      time: row.slot_time,
      capacity: row.capacity,
      isPopular: row.is_popular,
      isFastest: row.is_fastest,
      isSos: row.is_sos,
      sosSurcharge: row.sos_surcharge,
      sosLabel: row.sos_label,
      hasActiveBooking: row.has_active_booking,
      slotAvailable: row.slot_available,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  );

  // Remove past slots for public/booking views.
  if (view !== 'admin') {
    const today = getTodayInTallinn();
    const currentTime = getCurrentTimeInTallinn(); // HH:MM
    resolved = resolved.filter((s) => {
      if (s.date > today) return true;
      if (s.date === today && s.time > currentTime) return true;
      return false;
    });
  }

  if (!includeUnavailable) {
    resolved = resolved.filter((s) => s.status === 'free' || s.status === 'sos');
  }

  return resolved;
}

export async function listResolvedUpcomingSlots(input: { limit: number }): Promise<EngineTimeSlot[]> {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(input.limit)));

  const today = getTodayInTallinn();
  // Over-fetch window so `limit=1` is always correct even after filtering/blocked slots.
  // Admin availability stays separate.
  const to = addDaysTallinnYmd(today, 60);

  const slots = await listResolvedSlotsInRange({
    from: today,
    to,
    view: 'public',
    includeUnavailable: false,
  });

  return slots.slice(0, safeLimit);
}

