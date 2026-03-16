import { NextResponse } from 'next/server';
import {
  ensureBookingsTable,
  insertBooking,
  listBookings,
  updateBookingAdminFields,
  type BookingInsert,
} from '@/lib/bookings';
import { getAdminFromCookies } from '@/lib/admin-auth';

function isValidPayload(payload: unknown): payload is BookingInsert {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as Partial<BookingInsert>;
  if (!data.service || !data.slot || !data.contact) return false;
  if (!Array.isArray(data.addOns)) return false;
  if (typeof data.totalPrice !== 'number' || typeof data.totalDuration !== 'number') return false;
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

    await ensureBookingsTable();
    const bookings = await listBookings(limit);

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
