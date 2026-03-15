import { sql } from './db';
import type { TimeSlot } from '@/store/booking-types';

export interface SlotRecord {
  id: string;
  date: string;
  time: string;
  available: boolean;
  count: number;
  isPopular: boolean;
  isFastest: boolean;
  isSos: boolean;
  sosSurcharge: number | null;
  sosLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SlotInput {
  date: string;
  time: string;
  available?: boolean;
  count?: number;
  isPopular?: boolean;
  isFastest?: boolean;
  isSos?: boolean;
  sosSurcharge?: number | null;
  sosLabel?: string | null;
}

interface SlotUpdateInput {
  id: string;
  available?: boolean;
  count?: number;
  isPopular?: boolean;
  isFastest?: boolean;
  isSos?: boolean;
  sosSurcharge?: number | null;
  sosLabel?: string | null;
}

const DEFAULT_SLOT_TIMES = ['09:00', '10:00', '11:00', '12:30', '14:00', '15:30', '17:00'];

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeString(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function normalizeCount(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 1;
  return Math.max(0, Math.floor(value));
}

function mapRowToSlot(row: {
  id: number;
  slot_date: string;
  slot_time: string;
  available: boolean;
  capacity: number;
  is_popular: boolean;
  is_fastest: boolean;
  is_sos: boolean;
  sos_surcharge: number | null;
  sos_label: string | null;
  created_at: string;
  updated_at: string;
}): SlotRecord {
  return {
    id: String(row.id),
    date: row.slot_date,
    time: row.slot_time,
    available: row.available,
    count: row.capacity,
    isPopular: row.is_popular,
    isFastest: row.is_fastest,
    isSos: row.is_sos,
    sosSurcharge: row.sos_surcharge,
    sosLabel: row.sos_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toBookingTimeSlot(slot: SlotRecord): TimeSlot {
  return {
    id: slot.id,
    date: slot.date,
    time: slot.time,
    available: slot.available,
    count: slot.count,
    isPopular: slot.isPopular,
    isFastest: slot.isFastest,
    isSos: slot.isSos,
    sosSurcharge: slot.sosSurcharge ?? undefined,
    sosLabel: slot.sosLabel ?? undefined,
  };
}

export async function ensureSlotsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS time_slots (
      id BIGSERIAL PRIMARY KEY,
      slot_date DATE NOT NULL,
      slot_time TEXT NOT NULL,
      available BOOLEAN NOT NULL DEFAULT TRUE,
      capacity INTEGER NOT NULL DEFAULT 1,
      is_popular BOOLEAN NOT NULL DEFAULT FALSE,
      is_fastest BOOLEAN NOT NULL DEFAULT FALSE,
      is_sos BOOLEAN NOT NULL DEFAULT FALSE,
      sos_surcharge INTEGER,
      sos_label TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (slot_date, slot_time)
    )
  `;

  await sql`ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 1`;
  await sql`ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS is_popular BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS is_fastest BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS is_sos BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS sos_surcharge INTEGER`;
  await sql`ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS sos_label TEXT`;
  await sql`ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

  const [countRow] = await sql<[{ count: string }]>`SELECT COUNT(*)::text AS count FROM time_slots`;
  if (Number(countRow?.count ?? 0) > 0) {
    return;
  }

  const dates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return toDateString(date);
  });

  for (const date of dates) {
    for (const time of DEFAULT_SLOT_TIMES) {
      await sql`
        INSERT INTO time_slots (
          slot_date,
          slot_time,
          available,
          capacity,
          is_popular,
          is_fastest
        ) VALUES (
          ${date},
          ${time},
          TRUE,
          1,
          ${time === '10:00' || time === '14:00'},
          ${time === '09:00' || time === '15:30'}
        )
        ON CONFLICT (slot_date, slot_time) DO NOTHING
      `;
    }
  }
}

export async function listSlotsInRange(input: {
  from: string;
  to: string;
  includeUnavailable?: boolean;
}): Promise<SlotRecord[]> {
  if (!isDateString(input.from) || !isDateString(input.to)) {
    throw new Error('Invalid date range');
  }

  const rows = await sql<{
    id: number;
    slot_date: string;
    slot_time: string;
    available: boolean;
    capacity: number;
    is_popular: boolean;
    is_fastest: boolean;
    is_sos: boolean;
    sos_surcharge: number | null;
    sos_label: string | null;
    created_at: string;
    updated_at: string;
  }[]>`
    SELECT
      id,
      slot_date::text,
      slot_time,
      available,
      capacity,
      is_popular,
      is_fastest,
      is_sos,
      sos_surcharge,
      sos_label,
      created_at::text,
      updated_at::text
    FROM time_slots
    WHERE slot_date BETWEEN ${input.from}::date AND ${input.to}::date
      AND (${input.includeUnavailable ?? false} OR available = TRUE)
    ORDER BY slot_date ASC, slot_time ASC
  `;

  return rows.map(mapRowToSlot);
}

export async function listSlotsForDate(date: string, includeUnavailable = false): Promise<SlotRecord[]> {
  if (!isDateString(date)) {
    throw new Error('Invalid date');
  }
  return listSlotsInRange({ from: date, to: date, includeUnavailable });
}

export async function listUpcomingAvailableSlots(limit = 8): Promise<SlotRecord[]> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 8;
  const today = toDateString(new Date());

  const rows = await sql<{
    id: number;
    slot_date: string;
    slot_time: string;
    available: boolean;
    capacity: number;
    is_popular: boolean;
    is_fastest: boolean;
    is_sos: boolean;
    sos_surcharge: number | null;
    sos_label: string | null;
    created_at: string;
    updated_at: string;
  }[]>`
    SELECT
      id,
      slot_date::text,
      slot_time,
      available,
      capacity,
      is_popular,
      is_fastest,
      is_sos,
      sos_surcharge,
      sos_label,
      created_at::text,
      updated_at::text
    FROM time_slots
    WHERE available = TRUE
      AND slot_date >= ${today}::date
    ORDER BY slot_date ASC, slot_time ASC
    LIMIT ${safeLimit}
  `;

  return rows.map(mapRowToSlot);
}

export async function upsertSlot(input: SlotInput): Promise<SlotRecord> {
  if (!isDateString(input.date)) {
    throw new Error('Invalid date');
  }
  if (!isTimeString(input.time)) {
    throw new Error('Invalid time');
  }

  const [row] = await sql<{
    id: number;
    slot_date: string;
    slot_time: string;
    available: boolean;
    capacity: number;
    is_popular: boolean;
    is_fastest: boolean;
    is_sos: boolean;
    sos_surcharge: number | null;
    sos_label: string | null;
    created_at: string;
    updated_at: string;
  }[]>`
    INSERT INTO time_slots (
      slot_date,
      slot_time,
      available,
      capacity,
      is_popular,
      is_fastest,
      is_sos,
      sos_surcharge,
      sos_label,
      updated_at
    ) VALUES (
      ${input.date}::date,
      ${input.time},
      ${input.available ?? true},
      ${normalizeCount(input.count)},
      ${Boolean(input.isPopular)},
      ${Boolean(input.isFastest)},
      ${Boolean(input.isSos)},
      ${typeof input.sosSurcharge === 'number' ? Math.max(0, Math.floor(input.sosSurcharge)) : null},
      ${input.sosLabel ?? null},
      NOW()
    )
    ON CONFLICT (slot_date, slot_time) DO UPDATE SET
      available = EXCLUDED.available,
      capacity = EXCLUDED.capacity,
      is_popular = EXCLUDED.is_popular,
      is_fastest = EXCLUDED.is_fastest,
      is_sos = EXCLUDED.is_sos,
      sos_surcharge = EXCLUDED.sos_surcharge,
      sos_label = EXCLUDED.sos_label,
      updated_at = NOW()
    RETURNING
      id,
      slot_date::text,
      slot_time,
      available,
      capacity,
      is_popular,
      is_fastest,
      is_sos,
      sos_surcharge,
      sos_label,
      created_at::text,
      updated_at::text
  `;

  return mapRowToSlot(row);
}

export async function updateSlot(input: SlotUpdateInput): Promise<SlotRecord | null> {
  if (!input.id) {
    throw new Error('Slot id is required');
  }

  const [existing] = await sql<{
    id: number;
    slot_date: string;
    slot_time: string;
    available: boolean;
    capacity: number;
    is_popular: boolean;
    is_fastest: boolean;
    is_sos: boolean;
    sos_surcharge: number | null;
    sos_label: string | null;
    created_at: string;
    updated_at: string;
  }[]>`
    SELECT
      id,
      slot_date::text,
      slot_time,
      available,
      capacity,
      is_popular,
      is_fastest,
      is_sos,
      sos_surcharge,
      sos_label,
      created_at::text,
      updated_at::text
    FROM time_slots
    WHERE id = ${Number(input.id)}::bigint
    LIMIT 1
  `;

  if (!existing) {
    return null;
  }

  const [row] = await sql<{
    id: number;
    slot_date: string;
    slot_time: string;
    available: boolean;
    capacity: number;
    is_popular: boolean;
    is_fastest: boolean;
    is_sos: boolean;
    sos_surcharge: number | null;
    sos_label: string | null;
    created_at: string;
    updated_at: string;
  }[]>`
    UPDATE time_slots
    SET
      available = ${typeof input.available === 'boolean' ? input.available : existing.available},
      capacity = ${typeof input.count === 'number' ? normalizeCount(input.count) : existing.capacity},
      is_popular = ${typeof input.isPopular === 'boolean' ? input.isPopular : existing.is_popular},
      is_fastest = ${typeof input.isFastest === 'boolean' ? input.isFastest : existing.is_fastest},
      is_sos = ${typeof input.isSos === 'boolean' ? input.isSos : existing.is_sos},
      sos_surcharge = ${
        typeof input.sosSurcharge === 'number'
          ? Math.max(0, Math.floor(input.sosSurcharge))
          : input.sosSurcharge === null
            ? null
            : existing.sos_surcharge
      },
      sos_label = ${typeof input.sosLabel === 'string' ? input.sosLabel : input.sosLabel === null ? null : existing.sos_label},
      updated_at = NOW()
    WHERE id = ${Number(input.id)}::bigint
    RETURNING
      id,
      slot_date::text,
      slot_time,
      available,
      capacity,
      is_popular,
      is_fastest,
      is_sos,
      sos_surcharge,
      sos_label,
      created_at::text,
      updated_at::text
  `;

  return mapRowToSlot(row);
}

export async function deleteSlot(id: string) {
  if (!id) {
    throw new Error('Slot id is required');
  }
  await sql`DELETE FROM time_slots WHERE id = ${Number(id)}::bigint`;
}
