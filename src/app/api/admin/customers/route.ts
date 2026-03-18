import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { ensureCustomersTables, backfillCustomersBatch, normalizeEmail, normalizePhone } from '@/lib/customers';
import { ensureBookingsTable } from '@/lib/bookings';
import { ensureOrdersTable } from '@/lib/orders';
import { sql } from '@/lib/db';

type SortKey = 'updated' | 'spendDesc' | 'lastBookingDesc' | 'nextBookingAsc';

function toBool(v: string | null) {
  if (!v) return false;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureCustomersTables();
    await ensureBookingsTable();
    await ensureOrdersTable();

    // Gradual safe backfill so new CRM becomes useful immediately.
    await backfillCustomersBatch({ bookingsLimit: 200, ordersLimit: 200 });

    const { searchParams } = new URL(request.url);
    const qRaw = (searchParams.get('q') ?? '').trim();
    const sort = (searchParams.get('sort') as SortKey | null) ?? 'updated';

    const filterRepeat = toBool(searchParams.get('repeat'));
    const filterVip = toBool(searchParams.get('vip'));
    const filterInactive = toBool(searchParams.get('inactive'));
    const filterUpcoming = toBool(searchParams.get('upcoming'));
    const filterProductBuyer = toBool(searchParams.get('productBuyer'));
    const filterCancelsOften = toBool(searchParams.get('cancelsOften'));

    const qEmail = normalizeEmail(qRaw);
    const qPhone = normalizePhone(qRaw);
    const qLike = qRaw ? `%${qRaw.toLowerCase()}%` : null;

    const rows = await sql<{
      id: string;
      full_name: string;
      email: string | null;
      phone: string | null;
      preferred_language: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
      lifetime_value_cents: string;
      total_paid_bookings: number;
      total_paid_orders: number;
      last_paid_at: string | null;
      last_booking_at: string | null;
      next_booking_at: string | null;
      last_order_at: string | null;
      cancelled_bookings: number;
      product_spend: number;
    }[]>`
      WITH booking_meta AS (
        SELECT
          customer_id,
          MAX(CASE WHEN status <> 'cancelled' THEN (slot_date::text || 'T' || slot_time || ':00') ELSE NULL END) AS last_booking_at,
          MIN(CASE WHEN status <> 'cancelled' AND slot_date >= CURRENT_DATE THEN (slot_date::text || 'T' || slot_time || ':00') ELSE NULL END) AS next_booking_at,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_bookings
        FROM bookings
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ),
      order_meta AS (
        SELECT
          customer_id,
          MAX(created_at)::text AS last_order_at,
          COALESCE(SUM(amount_total) FILTER (WHERE status = 'paid' AND order_type = 'product_purchase'), 0)::int AS product_spend
        FROM orders
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      )
      SELECT
        c.id,
        c.full_name,
        c.email,
        c.phone,
        c.preferred_language,
        c.notes,
        c.created_at::text,
        c.updated_at::text,
        c.lifetime_value_cents::text,
        c.total_paid_bookings::int,
        c.total_paid_orders::int,
        c.last_paid_at::text,
        bm.last_booking_at,
        bm.next_booking_at,
        om.last_order_at,
        COALESCE(bm.cancelled_bookings, 0)::int AS cancelled_bookings,
        COALESCE(om.product_spend, 0)::int AS product_spend
      FROM customers c
      LEFT JOIN booking_meta bm ON bm.customer_id = c.id
      LEFT JOIN order_meta om ON om.customer_id = c.id
      WHERE (
        ${qRaw ? sql`(lower(c.full_name) LIKE ${qLike} OR lower(COALESCE(c.email,'')) LIKE ${qLike} OR lower(COALESCE(c.phone,'')) LIKE ${qLike})` : sql`TRUE`}
        OR ${qEmail ? sql`c.email_normalized = ${qEmail}` : sql`FALSE`}
        OR ${qPhone ? sql`c.phone_normalized = ${qPhone}` : sql`FALSE`}
      )
      ORDER BY
        ${sort === 'spendDesc'
          ? sql`c.lifetime_value_cents DESC, c.updated_at DESC`
          : sort === 'lastBookingDesc'
            ? sql`bm.last_booking_at DESC NULLS LAST, c.updated_at DESC`
            : sort === 'nextBookingAsc'
              ? sql`bm.next_booking_at ASC NULLS LAST, c.updated_at DESC`
              : sql`c.updated_at DESC`}
      LIMIT 600
    `;

    const customers = rows
      .map((r) => {
        const totalSpend = Number(r.lifetime_value_cents) || 0;
        const totalBookings = Number(r.total_paid_bookings) || 0;
        const totalOrders = Number(r.total_paid_orders) || 0;
        const cancelled = Number(r.cancelled_bookings) || 0;
        const cancelRate = totalBookings > 0 ? cancelled / totalBookings : 0;
        const repeat = totalBookings >= 2;
        const vip = totalSpend >= 250 || totalBookings >= 6;
        const inactive =
          !r.next_booking_at &&
          (r.last_booking_at ? Date.now() - new Date(r.last_booking_at).getTime() > 1000 * 60 * 60 * 24 * 90 : false);
        const productBuyer = totalOrders > 0 && (Number(r.product_spend) || 0) > 0;
        const cancelsOften = totalBookings >= 3 && cancelRate >= 0.34;

        const flags = [
          totalBookings <= 1 && totalOrders <= 1 ? 'New client' : null,
          repeat ? 'Repeat client' : null,
          vip ? 'VIP' : null,
          cancelsOften ? 'Cancels often' : null,
          productBuyer ? 'Product buyer' : null,
          inactive ? 'Inactive' : null,
        ].filter(Boolean) as string[];

        return {
          id: r.id,
          fullName: r.full_name,
          email: r.email,
          phone: r.phone,
          preferredLanguage: (r.preferred_language as 'et' | 'en' | null) ?? null,
          notes: r.notes,
          totalSpend,
          totalBookings,
          totalOrders,
          lastBookingAt: r.last_booking_at,
          nextBookingAt: r.next_booking_at,
          cancelRate,
          flags,
        };
      })
      .filter((c) => {
        if (filterRepeat && !c.flags.includes('Repeat client')) return false;
        if (filterVip && !c.flags.includes('VIP')) return false;
        if (filterInactive && !c.flags.includes('Inactive')) return false;
        if (filterUpcoming && !c.nextBookingAt) return false;
        if (filterProductBuyer && !c.flags.includes('Product buyer')) return false;
        if (filterCancelsOften && !c.flags.includes('Cancels often')) return false;
        return true;
      });

    return NextResponse.json({ ok: true, customers });
  } catch (error) {
    console.error('GET /api/admin/customers error:', error);
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 });
  }
}

