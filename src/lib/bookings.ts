import { sql } from './db';
import type { AddOn, ContactInfo, Service, TimeSlot } from '@/store/booking-types';

export interface BookingInsert {
  service: Service;
  slot: TimeSlot;
  contact: ContactInfo;
  addOns: AddOn[];
  totalPrice: number;
  totalDuration: number;
  source: 'guided' | 'fast';
  status?: string;
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'failed';
  depositAmount?: number;
  stripeSessionId?: string | null;
}

export interface BookingRecord {
  id: string;
  source: 'guided' | 'fast';
  status: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  slotDate: string;
  slotTime: string;
  contactFirstName: string;
  contactLastName: string | null;
  contactPhone: string;
  contactEmail: string | null;
  contactNotes: string | null;
  addOns: AddOn[];
  totalPrice: number;
  totalDuration: number;
  paymentStatus: string;
  depositAmount: number;
  stripeSessionId: string | null;
  createdAt: string;
}

export async function ensureBookingsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      service_duration INTEGER NOT NULL,
      service_price INTEGER NOT NULL,
      slot_id TEXT NOT NULL,
      slot_date DATE NOT NULL,
      slot_time TEXT NOT NULL,
      contact_first_name TEXT NOT NULL,
      contact_last_name TEXT,
      contact_phone TEXT NOT NULL,
      contact_email TEXT,
      contact_notes TEXT,
      add_ons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      total_price INTEGER NOT NULL,
      total_duration INTEGER NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      deposit_amount INTEGER NOT NULL DEFAULT 0,
      stripe_session_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_notes TEXT`;
}

export async function insertBooking(data: BookingInsert) {
  const [row] = await sql<[{ id: number; created_at: string }]>`
    INSERT INTO bookings (
      source,
      status,
      service_id,
      service_name,
      service_duration,
      service_price,
      slot_id,
      slot_date,
      slot_time,
      contact_first_name,
      contact_last_name,
      contact_phone,
      contact_email,
      contact_notes,
      add_ons_json,
      total_price,
      total_duration,
      payment_status,
      deposit_amount,
      stripe_session_id
    ) VALUES (
      ${data.source},
      ${data.status ?? 'confirmed'},
      ${data.service.id},
      ${data.service.name},
      ${data.service.duration},
      ${data.service.price},
      ${data.slot.id},
      ${data.slot.date},
      ${data.slot.time},
      ${data.contact.firstName},
      ${data.contact.lastName ?? null},
      ${data.contact.phone},
      ${data.contact.email ?? null},
      ${data.contact.notes ?? null},
      ${JSON.stringify(data.addOns)},
      ${data.totalPrice},
      ${data.totalDuration},
      ${data.paymentStatus ?? 'unpaid'},
      ${data.depositAmount ?? 0},
      ${data.stripeSessionId ?? null}
    )
    RETURNING id, created_at
  `;

  return {
    id: String(row.id),
    created_at: row.created_at,
  };
}

export async function listBookings(limit = 100): Promise<BookingRecord[]> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.floor(limit))) : 100;

  const rows = await sql<{
    id: number;
    source: 'guided' | 'fast';
    status: string;
    service_name: string;
    service_id: string;
    service_duration: number;
    service_price: number;
    slot_date: string;
    slot_time: string;
    contact_first_name: string;
    contact_last_name: string | null;
    contact_phone: string;
    contact_email: string | null;
    contact_notes: string | null;
    add_ons_json: AddOn[] | string;
    total_price: number;
    total_duration: number;
    payment_status: string;
    deposit_amount: number;
    stripe_session_id: string | null;
    created_at: string;
  }[]>`
    SELECT
      id,
      source,
      status,
      service_name,
      service_id,
      service_duration,
      service_price,
      slot_date::text,
      slot_time,
      contact_first_name,
      contact_last_name,
      contact_phone,
      contact_email,
      contact_notes,
      add_ons_json,
      total_price,
      total_duration,
      payment_status,
      deposit_amount,
      stripe_session_id,
      created_at::text
    FROM bookings
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => {
    let addOns: AddOn[] = [];
    if (Array.isArray(row.add_ons_json)) {
      addOns = row.add_ons_json;
    } else if (typeof row.add_ons_json === 'string') {
      try {
        addOns = JSON.parse(row.add_ons_json) as AddOn[];
      } catch {
        addOns = [];
      }
    }

    return {
      id: String(row.id),
      source: row.source,
      status: row.status,
      serviceName: row.service_name,
      serviceId: row.service_id,
      serviceDuration: row.service_duration,
      servicePrice: row.service_price,
      slotDate: row.slot_date,
      slotTime: row.slot_time,
      contactFirstName: row.contact_first_name,
      contactLastName: row.contact_last_name,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      contactNotes: row.contact_notes,
      addOns,
      totalPrice: row.total_price,
      totalDuration: row.total_duration,
      paymentStatus: row.payment_status,
      depositAmount: row.deposit_amount,
      stripeSessionId: row.stripe_session_id,
      createdAt: row.created_at,
    };
  });
}

export async function setBookingStripeSession(bookingId: string, sessionId: string) {
  await sql`
    UPDATE bookings
    SET stripe_session_id = ${sessionId}
    WHERE id = ${bookingId}::bigint
  `;
}

export async function markBookingPaidBySession(sessionId: string) {
  const [row] = await sql<[{ id: number }]>`
    UPDATE bookings
    SET payment_status = 'paid',
        status = 'confirmed'
    WHERE stripe_session_id = ${sessionId}
    RETURNING id
  `;

  return row ? String(row.id) : null;
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'cancelled' | 'pending_payment'
) {
  const [row] = await sql<[{ id: number; status: string }]>`
    UPDATE bookings
    SET status = ${status}
    WHERE id = ${bookingId}::bigint
    RETURNING id, status
  `;

  return row
    ? {
        id: String(row.id),
        status: row.status,
      }
    : null;
}

export async function updateBookingAdminFields(input: {
  id: string;
  status?: 'confirmed' | 'cancelled' | 'pending_payment';
  contactNotes?: string | null;
}) {
  const [existing] = await sql<[{ id: number; status: string; contact_notes: string | null }]>`
    SELECT id, status, contact_notes
    FROM bookings
    WHERE id = ${input.id}::bigint
    LIMIT 1
  `;

  if (!existing) return null;

  const [row] = await sql<[{ id: number; status: string; contact_notes: string | null }]>`
    UPDATE bookings
    SET
      status = ${input.status ?? existing.status},
      contact_notes = ${typeof input.contactNotes === 'string' ? input.contactNotes : input.contactNotes === null ? null : existing.contact_notes}
    WHERE id = ${input.id}::bigint
    RETURNING id, status, contact_notes
  `;

  return {
    id: String(row.id),
    status: row.status,
    contactNotes: row.contact_notes,
  };
}
