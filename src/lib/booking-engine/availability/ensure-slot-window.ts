import { sql } from '@/lib/db';

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Ensure `time_slots` rows exist for the requested calendar window.
 * This never overwrites admin-managed availability flags; it only inserts missing (slot_date, slot_time) rows.
 */
export async function ensureSlotWindow(from: string, to: string): Promise<void> {
  if (!isDateString(from) || !isDateString(to)) {
    throw new Error('Invalid slot window dates');
  }

  await sql`
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
    )
    SELECT
      d::date AS slot_date,
      t.slot_time,
      TRUE AS available,
      1 AS capacity,
      (t.slot_time IN ('10:00', '14:00')) AS is_popular,
      (t.slot_time IN ('09:00', '15:30')) AS is_fastest,
      FALSE AS is_sos,
      NULL::int AS sos_surcharge,
      NULL::text AS sos_label,
      NOW() AS updated_at
    FROM generate_series(${from}::date, ${to}::date, INTERVAL '1 day') d
    CROSS JOIN (
      VALUES
        ('09:00'::text),
        ('10:00'::text),
        ('11:00'::text),
        ('12:30'::text),
        ('14:00'::text),
        ('15:30'::text),
        ('17:00'::text)
    ) AS t(slot_time)
    ON CONFLICT (slot_date, slot_time) DO NOTHING
  `;
}

