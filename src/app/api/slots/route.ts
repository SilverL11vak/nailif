import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import {
  deleteSlot,
  ensureSlotsTable,
  listSlotsForDate,
  listSlotsInRange,
  listUpcomingAvailableSlots,
  toBookingTimeSlot,
  updateSlot,
  upsertSlot,
} from '@/lib/slots';

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  try {
    await ensureSlotsTable();
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get('admin') === '1';

    if (admin) {
      const adminUser = await getAdminFromCookies();
      if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const upcoming = searchParams.get('upcoming') === '1';
    if (upcoming) {
      const limit = Number(searchParams.get('limit') ?? 8);
      const slots = await listUpcomingAvailableSlots(limit);
      return NextResponse.json({
        ok: true,
        slots: slots.map(toBookingTimeSlot),
      });
    }

    const date = searchParams.get('date');
    if (date) {
      const slots = await listSlotsForDate(date, admin);
      return NextResponse.json({
        ok: true,
        slots: slots.map(toBookingTimeSlot),
      });
    }

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from && to) {
      const slots = await listSlotsInRange({ from, to, includeUnavailable: admin });
      return NextResponse.json({
        ok: true,
        slots: slots.map(toBookingTimeSlot),
      });
    }

    const days = Number(searchParams.get('days') ?? 7);
    const safeDays = Number.isFinite(days) ? Math.min(Math.max(1, Math.floor(days)), 31) : 7;
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + (safeDays - 1));

    const slots = await listSlotsInRange({
      from: toDateString(start),
      to: toDateString(end),
      includeUnavailable: admin,
    });

    return NextResponse.json({
      ok: true,
      slots: slots.map(toBookingTimeSlot),
    });
  } catch (error) {
    console.error('GET /api/slots error:', error);
    return NextResponse.json({ error: 'Failed to load slots' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureSlotsTable();
    const payload = (await request.json()) as Partial<{
      date: string;
      time: string;
      available: boolean;
      count: number;
      isPopular: boolean;
      isFastest: boolean;
      isSos: boolean;
      sosSurcharge: number | null;
      sosLabel: string | null;
    }>;

    if (!payload.date || !payload.time) {
      return NextResponse.json({ error: 'Date and time are required' }, { status: 400 });
    }

    const slot = await upsertSlot({
      date: payload.date,
      time: payload.time,
      available: payload.available ?? true,
      count: payload.count ?? 1,
      isPopular: payload.isPopular ?? false,
      isFastest: payload.isFastest ?? false,
      isSos: payload.isSos ?? false,
      sosSurcharge:
        typeof payload.sosSurcharge === 'number' || payload.sosSurcharge === null
          ? payload.sosSurcharge
          : null,
      sosLabel: payload.sosLabel ?? null,
    });

    return NextResponse.json({ ok: true, slot: toBookingTimeSlot(slot) });
  } catch (error) {
    console.error('POST /api/slots error:', error);
    return NextResponse.json({ error: 'Failed to save slot' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureSlotsTable();
    const payload = (await request.json()) as Partial<{
      id: string;
      available: boolean;
      count: number;
      isPopular: boolean;
      isFastest: boolean;
      isSos: boolean;
      sosSurcharge: number | null;
      sosLabel: string | null;
    }>;

    if (!payload.id) {
      return NextResponse.json({ error: 'Slot id is required' }, { status: 400 });
    }

    const slot = await updateSlot({
      id: payload.id,
      available: payload.available,
      count: payload.count,
      isPopular: payload.isPopular,
      isFastest: payload.isFastest,
      isSos: payload.isSos,
      sosSurcharge:
        typeof payload.sosSurcharge === 'number' || payload.sosSurcharge === null
          ? payload.sosSurcharge
          : undefined,
      sosLabel: typeof payload.sosLabel === 'string' || payload.sosLabel === null ? payload.sosLabel : undefined,
    });

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, slot: toBookingTimeSlot(slot) });
  } catch (error) {
    console.error('PATCH /api/slots error:', error);
    return NextResponse.json({ error: 'Failed to update slot' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureSlotsTable();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Slot id is required' }, { status: 400 });
    }

    await deleteSlot(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/slots error:', error);
    return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 });
  }
}
