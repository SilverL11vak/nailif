import { NextResponse } from 'next/server';
import {
  ensureBookingsTable,
  insertBooking,
  listBookings,
  listBookingsCompact,
  updateBookingAdminFields,
  deleteBooking,
  type BookingInsert,
} from '@/lib/bookings';
import { getAdminFromCookies } from '@/lib/admin-auth';

function isValidPayload(payload: unknown): payload is BookingInsert {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as Partial<BookingInsert>;
  if (!data.service || !data.slot || !data.contact) return false;
  if (!Array.isArray(data.addOns)) return false;
  if (!Array.isArray(data.products)) return false;
  if (typeof data.totalPrice !== 'number' || typeof data.totalDuration !== 'number') return false;
  if (typeof data.productsTotalPrice !== 'number') return false;
  if (data.source !== 'guided' && data.source !== 'fast') return false;
  return true;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!isValidPayload(payload)) {
      return NextResponse.json({ error: 'Invalid booking payload' }, { status: 400 });
    }

    await ensureBookingsTable();
    const result = await insertBooking(payload);

    return NextResponse.json({
      ok: true,
      bookingId: result.id,
      createdAt: result.created_at,
    });
  } catch (error) {
    console.error('POST /api/bookings error:', error);
    return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : 100;
    const compact = url.searchParams.get('compact') === '1';

    await ensureBookingsTable();
    const bookings = compact ? await listBookingsCompact(limit) : await listBookings(limit);

    return NextResponse.json({
      ok: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as Partial<{
      id: string;
      status: string;
      paymentStatus: string;
      stripeSessionId: string;
      slotDate: string;
      slotTime: string;
      serviceId: string;
      serviceName: string;
      serviceDuration: number;
      servicePrice: number;
      totalPrice: number;
      totalDuration: number;
      contactNotes: string | null;
    }>;
    if (!payload.id) {
      return NextResponse.json({ error: 'Booking id is required' }, { status: 400 });
    }
    if (
      payload.status &&
      payload.status !== 'confirmed' &&
      payload.status !== 'cancelled' &&
      payload.status !== 'pending_payment' &&
      payload.status !== 'completed'
    ) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (
      payload.paymentStatus &&
      payload.paymentStatus !== 'unpaid' &&
      payload.paymentStatus !== 'pending' &&
      payload.paymentStatus !== 'paid' &&
      payload.paymentStatus !== 'failed'
    ) {
      return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
    }

    // Security: When setting paymentStatus to 'paid', require Stripe session verification
    // This prevents admins from fraudulently marking payments as paid without actual Stripe payment
    if (payload.paymentStatus === 'paid') {
      // Check if already reconciled via the stripe/confirm endpoint
      const { sql } = await import('@/lib/db');
      const [existing] = await sql<[{ manually_reconciled: boolean; stripe_session_id: string | null }]>`
        SELECT manually_reconciled, stripe_session_id FROM bookings WHERE id = ${payload.id}::bigint LIMIT 1
      `;

      if (!existing) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }

      // Allow if already manually reconciled (via stripe/confirm endpoint)
      if (existing.manually_reconciled) {
        // Already verified, allow status update
      } else if (!payload.stripeSessionId && !existing.stripe_session_id) {
        // No Stripe session - require manual reconciliation via /api/stripe/confirm instead
        return NextResponse.json(
          { error: 'Cannot mark as paid without Stripe verification. Use /api/stripe/confirm endpoint or provide stripeSessionId.' },
          { status: 403 }
        );
      } else if (payload.stripeSessionId || existing.stripe_session_id) {
        // Has Stripe session - for now we trust the session exists
        // In production, could verify with Stripe API here
        // The manual reconciliation endpoint is the preferred method
        return NextResponse.json(
          { error: 'Use /api/stripe/confirm endpoint to mark payments as paid. This ensures Stripe verification.' },
          { status: 403 }
        );
      }
    }

    if (payload.slotDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.slotDate)) {
      return NextResponse.json({ error: 'Invalid slot date' }, { status: 400 });
    }
    if (payload.slotTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(payload.slotTime)) {
      return NextResponse.json({ error: 'Invalid slot time' }, { status: 400 });
    }

    await ensureBookingsTable();
    const updated = await updateBookingAdminFields({
      id: payload.id,
      status: payload.status as 'confirmed' | 'cancelled' | 'pending_payment' | 'completed' | undefined,
      paymentStatus: payload.paymentStatus as 'unpaid' | 'pending' | 'paid' | 'failed' | undefined,
      slotDate: typeof payload.slotDate === 'string' ? payload.slotDate : undefined,
      slotTime: typeof payload.slotTime === 'string' ? payload.slotTime : undefined,
      serviceId: typeof payload.serviceId === 'string' ? payload.serviceId : undefined,
      serviceName: typeof payload.serviceName === 'string' ? payload.serviceName : undefined,
      serviceDuration: typeof payload.serviceDuration === 'number' ? payload.serviceDuration : undefined,
      servicePrice: typeof payload.servicePrice === 'number' ? payload.servicePrice : undefined,
      totalPrice: typeof payload.totalPrice === 'number' ? payload.totalPrice : undefined,
      totalDuration: typeof payload.totalDuration === 'number' ? payload.totalDuration : undefined,
      contactNotes:
        typeof payload.contactNotes === 'string' || payload.contactNotes === null
          ? payload.contactNotes
          : undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, booking: updated });
  } catch (error) {
    console.error('PATCH /api/bookings error:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Booking id is required' }, { status: 400 });
    }

    const deleted = await deleteBooking(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/bookings error:', error);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}
