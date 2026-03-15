import { sql } from './db';
import { ensureBookingsTable } from './bookings';
import { ensureCatalogTables } from './catalog';
import { ensureOrdersTable } from './orders';
import { ensureSlotsTable } from './slots';

export interface AdminDashboardStats {
  services: number;
  products: number;
  bookings: number;
  orders: number;
  availableSlotsNext7Days: number;
  freeSlotsToday: number;
  todayBookings: Array<{
    id: string;
    clientName: string;
    serviceName: string;
    slotTime: string;
    status: string;
    paymentStatus: string;
  }>;
  nextBooking: {
    id: string;
    clientName: string;
    serviceName: string;
    slotDate: string;
    slotTime: string;
    status: string;
  } | null;
  nextFreeSlot: {
    slotDate: string;
    slotTime: string;
  } | null;
  revenueToday: number;
  revenueThisWeek: number;
  bookingChangeVsLastWeek: number;
  sosSlotsToday: number;
  nextSosSlot: {
    slotDate: string;
    slotTime: string;
    surcharge: number | null;
    label: string | null;
  } | null;
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeString(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await ensureCatalogTables();
  await ensureBookingsTable();
  await ensureOrdersTable();
  await ensureSlotsTable();

  const today = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);

  const [[services], [products], [bookings], [orders], [availableSlots], [freeSlotsToday], [sosSlotsToday]] =
    await Promise.all([
    sql<[{ count: string }]>`SELECT COUNT(*)::text AS count FROM services`,
    sql<[{ count: string }]>`SELECT COUNT(*)::text AS count FROM products`,
    sql<[{ count: string }]>`SELECT COUNT(*)::text AS count FROM bookings`,
    sql<[{ count: string }]>`SELECT COUNT(*)::text AS count FROM orders`,
    sql<[{ count: string }]>`
      SELECT COUNT(*)::text AS count
      FROM time_slots
      WHERE available = TRUE
        AND slot_date BETWEEN ${toDateString(today)}::date AND ${toDateString(end)}::date
    `,
      sql<[{ count: string }]>`
      SELECT COUNT(*)::text AS count
      FROM time_slots
      WHERE available = TRUE
        AND slot_date = ${toDateString(today)}::date
    `,
      sql<[{ count: string }]>`
      SELECT COUNT(*)::text AS count
      FROM time_slots
      WHERE available = TRUE
        AND is_sos = TRUE
        AND slot_date = ${toDateString(today)}::date
    `,
    ]);

  const todayBookings = await sql<{
    id: number;
    contact_first_name: string;
    contact_last_name: string | null;
    service_name: string;
    slot_time: string;
    status: string;
    payment_status: string;
  }[]>`
    SELECT
      id,
      contact_first_name,
      contact_last_name,
      service_name,
      slot_time,
      status,
      payment_status
    FROM bookings
    WHERE slot_date = ${toDateString(today)}::date
    ORDER BY slot_time ASC
  `;

  const [nextBookingRow] = await sql<{
    id: number;
    contact_first_name: string;
    contact_last_name: string | null;
    service_name: string;
    slot_date: string;
    slot_time: string;
    status: string;
  }[]>`
    SELECT
      id,
      contact_first_name,
      contact_last_name,
      service_name,
      slot_date::text,
      slot_time,
      status
    FROM bookings
    WHERE slot_date >= ${toDateString(today)}::date
      AND status <> 'cancelled'
    ORDER BY slot_date ASC, slot_time ASC
    LIMIT 1
  `;

  const now = new Date();
  const todayString = toDateString(now);
  const nowTime = toTimeString(now);

  const [nextFreeSlotRow] = await sql<{ slot_date: string; slot_time: string }[]>`
    SELECT slot_date::text, slot_time
    FROM time_slots
    WHERE available = TRUE
      AND (
        slot_date > ${todayString}::date
        OR (slot_date = ${todayString}::date AND slot_time >= ${nowTime})
      )
    ORDER BY slot_date ASC, slot_time ASC
    LIMIT 1
  `;

  const [nextSosSlotRow] = await sql<
    { slot_date: string; slot_time: string; sos_surcharge: number | null; sos_label: string | null }[]
  >`
    SELECT slot_date::text, slot_time, sos_surcharge, sos_label
    FROM time_slots
    WHERE available = TRUE
      AND is_sos = TRUE
      AND (
        slot_date > ${todayString}::date
        OR (slot_date = ${todayString}::date AND slot_time >= ${nowTime})
      )
    ORDER BY slot_date ASC, slot_time ASC
    LIMIT 1
  `;

  const [revenueTodayRow] = await sql<{ sum: string | null }[]>`
    SELECT SUM(amount_total)::text AS sum
    FROM orders
    WHERE status = 'paid'
      AND DATE(COALESCE(paid_at, created_at)) = CURRENT_DATE
  `;

  const [revenueWeekRow] = await sql<{ sum: string | null }[]>`
    SELECT SUM(amount_total)::text AS sum
    FROM orders
    WHERE status = 'paid'
      AND DATE(COALESCE(paid_at, created_at)) >= DATE_TRUNC('week', CURRENT_DATE)::date
      AND DATE(COALESCE(paid_at, created_at)) < (DATE_TRUNC('week', CURRENT_DATE)::date + INTERVAL '7 days')
  `;

  const [bookingTrend] = await sql<{ current_week: string; previous_week: string }[]>`
    SELECT
      COUNT(*) FILTER (
        WHERE slot_date >= DATE_TRUNC('week', CURRENT_DATE)::date
          AND slot_date < (DATE_TRUNC('week', CURRENT_DATE)::date + INTERVAL '7 days')
      )::text AS current_week,
      COUNT(*) FILTER (
        WHERE slot_date >= (DATE_TRUNC('week', CURRENT_DATE)::date - INTERVAL '7 days')
          AND slot_date < DATE_TRUNC('week', CURRENT_DATE)::date
      )::text AS previous_week
    FROM bookings
  `;

  return {
    services: Number(services.count),
    products: Number(products.count),
    bookings: Number(bookings.count),
    orders: Number(orders.count),
    availableSlotsNext7Days: Number(availableSlots.count),
    freeSlotsToday: Number(freeSlotsToday.count),
    todayBookings: todayBookings.map((booking) => ({
      id: String(booking.id),
      clientName: `${booking.contact_first_name} ${booking.contact_last_name ?? ''}`.trim(),
      serviceName: booking.service_name,
      slotTime: booking.slot_time,
      status: booking.status,
      paymentStatus: booking.payment_status,
    })),
    nextBooking: nextBookingRow
      ? {
          id: String(nextBookingRow.id),
          clientName: `${nextBookingRow.contact_first_name} ${nextBookingRow.contact_last_name ?? ''}`.trim(),
          serviceName: nextBookingRow.service_name,
          slotDate: nextBookingRow.slot_date,
          slotTime: nextBookingRow.slot_time,
          status: nextBookingRow.status,
        }
      : null,
    nextFreeSlot: nextFreeSlotRow
      ? {
          slotDate: nextFreeSlotRow.slot_date,
          slotTime: nextFreeSlotRow.slot_time,
        }
      : null,
    revenueToday: Number(revenueTodayRow?.sum ?? 0),
    revenueThisWeek: Number(revenueWeekRow?.sum ?? 0),
    bookingChangeVsLastWeek: Number(bookingTrend.current_week) - Number(bookingTrend.previous_week),
    sosSlotsToday: Number(sosSlotsToday.count),
    nextSosSlot: nextSosSlotRow
      ? {
          slotDate: nextSosSlotRow.slot_date,
          slotTime: nextSosSlotRow.slot_time,
          surcharge: nextSosSlotRow.sos_surcharge,
          label: nextSosSlotRow.sos_label,
        }
      : null,
  };
}
