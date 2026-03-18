import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { ensureCustomersTables, backfillCustomersBatch } from '@/lib/customers';
import { ensureBookingsTable } from '@/lib/bookings';
import { ensureOrdersTable } from '@/lib/orders';
import { sql } from '@/lib/db';

function money(n: number) {
  return `€${Math.round(n)}`;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureCustomersTables();
    await ensureBookingsTable();
    await ensureOrdersTable();
    await backfillCustomersBatch({ bookingsLimit: 200, ordersLimit: 200 });

    const { id } = await context.params;
    const [customer] = await sql<{
      id: string;
      full_name: string;
      email: string | null;
      email_normalized: string | null;
      phone: string | null;
      preferred_language: string | null;
      notes: string | null;
      lifetime_value_cents: string;
      total_paid_bookings: number;
      total_paid_orders: number;
      total_paid_cents: string;
      first_paid_at: string | null;
      last_paid_at: string | null;
      created_at: string;
      updated_at: string;
    }[]>`
      SELECT
        id,
        full_name,
        email,
        email_normalized,
        phone,
        preferred_language,
        notes,
        lifetime_value_cents::text,
        total_paid_bookings::int,
        total_paid_orders::int,
        total_paid_cents::text,
        first_paid_at::text,
        last_paid_at::text,
        created_at::text,
        updated_at::text
      FROM customers
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const bookings = await sql<{
      id: number;
      status: string;
      payment_status: string;
      service_name: string;
      service_duration: number;
      total_price: number;
      slot_date: string;
      slot_time: string;
      created_at: string;
    }[]>`
      SELECT
        id,
        status,
        payment_status,
        service_name,
        service_duration,
        total_price,
        slot_date::text,
        slot_time,
        created_at::text
      FROM bookings
      WHERE customer_id = ${id}
      ORDER BY slot_date DESC, slot_time DESC
      LIMIT 1000
    `;

    const orders = await sql<{
      id: number;
      order_type: string;
      status: string;
      amount_total: number;
      created_at: string;
      paid_at: string | null;
    }[]>`
      SELECT
        id,
        order_type,
        status,
        amount_total,
        created_at::text,
        paid_at::text
      FROM orders
      WHERE customer_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1000
    `;

    const now = Date.now();
    const completedBookings = bookings.filter((b) => b.payment_status === 'paid' || b.status === 'completed');
    const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');
    const upcomingBookings = bookings.filter((b) => b.status !== 'cancelled' && b.slot_date >= new Date().toISOString().slice(0, 10));

    const serviceSpend = completedBookings.reduce((s, b) => s + (Number(b.total_price) || 0), 0);
    const productSpend = orders
      .filter((o) => o.status === 'paid' && o.order_type === 'product_purchase')
      .reduce((s, o) => s + (Number(o.amount_total) || 0), 0);
    const totalSpend = Number(customer.total_paid_cents ?? customer.lifetime_value_cents ?? 0) || serviceSpend + productSpend;

    const lastBooking = bookings.find((b) => b.status !== 'cancelled') ?? null;
    const nextBooking =
      [...upcomingBookings].sort((a, b) => `${a.slot_date} ${a.slot_time}`.localeCompare(`${b.slot_date} ${b.slot_time}`))[0] ?? null;

    const totalBookings = Number(customer.total_paid_bookings) || bookings.filter((b) => b.status !== 'cancelled').length;
    const cancellationRate = totalBookings > 0 ? cancelledBookings.length / totalBookings : 0;
    const repeat = totalBookings >= 2;
    const vip = totalSpend >= 250 || totalBookings >= 6;
    const inactive =
      !nextBooking &&
      (lastBooking ? now - new Date(`${lastBooking.slot_date}T12:00:00`).getTime() > 1000 * 60 * 60 * 24 * 90 : false);
    const productBuyer = productSpend > 0;
    const cancelsOften = totalBookings >= 3 && cancellationRate >= 0.34;

    // Simple BI: most booked service + preferred hour bucket
    const serviceCounts = new Map<string, number>();
    const hourCounts = new Map<number, number>();
    for (const b of bookings.filter((x) => x.status !== 'cancelled')) {
      serviceCounts.set(b.service_name, (serviceCounts.get(b.service_name) ?? 0) + 1);
      const hour = Number(b.slot_time.slice(0, 2));
      if (Number.isFinite(hour)) hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }
    const mostBookedService =
      [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const preferredHour =
      [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Average rebooking interval (days between consecutive non-cancelled bookings)
    const completedDates = bookings
      .filter((b) => b.status !== 'cancelled')
      .map((b) => new Date(`${b.slot_date}T12:00:00`).getTime())
      .sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < completedDates.length; i++) {
      intervals.push(Math.round((completedDates[i] - completedDates[i - 1]) / (1000 * 60 * 60 * 24)));
    }
    const avgRebookInterval = intervals.length ? Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length) : null;

    const insights = {
      repeatClient: repeat,
      vip,
      cancelsOften,
      inactive,
      productBuyer,
      cancellationRate,
      averageSpend: totalBookings > 0 ? Math.round(serviceSpend / Math.max(1, totalBookings)) : null,
      lifetimeValue: totalSpend,
      mostBookedService,
      preferredHour,
      avgRebookIntervalDays: avgRebookInterval,
      forecastLine: `If remaining slots are filled, today's revenue may reach ${money(totalSpend)}.`,
    };

    const flags = [
      totalBookings <= 1 && orders.length <= 1 ? 'New client' : null,
      repeat ? 'Repeat client' : null,
      vip ? 'VIP / High value' : null,
      cancelsOften ? 'Cancels often' : null,
      productBuyer ? 'Product buyer' : null,
      inactive ? 'Inactive' : null,
    ].filter(Boolean);

    return NextResponse.json({
      ok: true,
      customer: {
        id: customer.id,
        fullName: customer.full_name,
        email: customer.email,
        phone: customer.phone,
        preferredLanguage: (customer.preferred_language as 'et' | 'en' | null) ?? null,
        notes: customer.notes,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
      },
      summary: {
        totalSpend,
        serviceSpend,
        productSpend,
        totalBookings,
        totalOrders: Number(customer.total_paid_orders) || orders.length,
        lastBooking,
        nextBooking,
      },
      bookings,
      orders,
      flags,
      insights,
    });
  } catch (error) {
    console.error('GET /api/admin/customers/[id] error:', error);
    return NextResponse.json({ error: 'Failed to load customer' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureCustomersTables();
    const { id } = await context.params;
    const payload = (await request.json()) as { notes?: string | null; preferredLanguage?: 'et' | 'en' | null };
    const notes = typeof payload.notes === 'string' ? payload.notes : payload.notes === null ? null : undefined;
    const preferredLanguage =
      payload.preferredLanguage === 'et' || payload.preferredLanguage === 'en' ? payload.preferredLanguage : undefined;

    await sql`
      UPDATE customers
      SET
        notes = COALESCE(${notes ?? null}, notes),
        preferred_language = COALESCE(${preferredLanguage ?? null}, preferred_language),
        updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/admin/customers/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

