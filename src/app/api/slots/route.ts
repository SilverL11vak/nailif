import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import {
  deleteSlot,
  ensureSlotsTable,
  toBookingTimeSlot,
  updateSlot,
  upsertSlot,
} from '@/lib/slots';
import { ensureBookingContentTables, listBookingContent } from '@/lib/booking-content';
import { getLocaleFromPathname } from '@/lib/i18n/locale-path';
import { listResolvedSlotsInRange, listResolvedUpcomingSlots } from '@/lib/booking-engine/availability/availability-engine';
import type { TimeSlot } from '@/store/booking-types';

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function parseToggle(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function enrichSmartSlots(
  slots: TimeSlot[],
  options: {
    urgencyBoost: boolean;
    smartReorder: boolean;
    gapSensitivity: number;
    preferredDuration: number;
  }
) {
  const now = Date.now();
  const byDate = new Map<string, TimeSlot[]>();
  for (const slot of slots) {
    if (!byDate.has(slot.date)) byDate.set(slot.date, []);
    byDate.get(slot.date)?.push(slot);
  }
  for (const [, daySlots] of byDate) {
    daySlots.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  }

  const dayAvailability = new Map<string, number>();
  for (const [date, daySlots] of byDate) {
    dayAvailability.set(
      date,
      daySlots.reduce((count, item) => count + (item.available ? 1 : 0), 0)
    );
  }

  const enriched = slots.map((slot) => {
    let score = 0;
    if (slot.available) score += 12;
    if (slot.isPopular || slot.isFastest) score += 10;
    if (slot.isSos) score += 20;

    const slotTs = new Date(`${slot.date}T${slot.time}:00`).getTime();
    const diffHours = (slotTs - now) / (1000 * 60 * 60);
    const isLastMinuteBoost =
      options.urgencyBoost && slot.available && diffHours >= 0 && diffHours <= 48 && !slot.isSos;
    if (isLastMinuteBoost) score += 18;

    const daySlots = byDate.get(slot.date) ?? [];
    const index = daySlots.findIndex((item) => item.id === slot.id);
    if (index >= 0 && slot.available) {
      const prev = daySlots[index - 1];
      const next = daySlots[index + 1];
      const prevUnavailable = prev ? !prev.available : false;
      const nextUnavailable = next ? !next.available : false;
      if (prevUnavailable && nextUnavailable) {
        score += 8 + options.gapSensitivity * 4;
      }
    }

    const dayFree = dayAvailability.get(slot.date) ?? 0;
    if (dayFree > 0 && dayFree <= 3) {
      score += 6;
    }

    if (options.preferredDuration >= 75) {
      const minutes = toMinutes(slot.time);
      if (minutes >= 10 * 60 && minutes <= 16 * 60) score += 4;
    } else if (options.preferredDuration > 0) {
      const minutes = toMinutes(slot.time);
      if (minutes >= 12 * 60 && minutes <= 18 * 60) score += 3;
    }

    return {
      ...slot,
      smartScore: score,
      isLastMinuteBoost,
      smartReason: slot.isSos ? 'sos' : isLastMinuteBoost ? 'last-minute' : score >= 28 ? 'best-fit' : null,
    };
  });

  const recommended = enriched
    .filter((slot) => slot.available)
    .sort((a, b) => (b.smartScore ?? 0) - (a.smartScore ?? 0))
    .slice(0, 3)
    .map((slot) => ({ ...slot, isRecommended: true }));

  const recommendedIds = new Set(recommended.map((slot) => slot.id));
  const merged = enriched.map((slot) => (recommendedIds.has(slot.id) ? { ...slot, isRecommended: true } : slot));

  if (options.smartReorder) {
    merged.sort((a, b) => {
      if ((a.smartScore ?? 0) === (b.smartScore ?? 0)) return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
      return (b.smartScore ?? 0) - (a.smartScore ?? 0);
    });
  } else {
    merged.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }

  return { slots: merged, recommended };
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

    const locale = (searchParams.get('lang') as 'et' | 'en' | null) ?? getLocaleFromPathname(new URL(request.url).pathname) ?? 'et';
    const smart = searchParams.get('smart') === '1';
    const upcoming = searchParams.get('upcoming') === '1';

    let urgencyBoost = true;
    let smartReorder = true;
    let gapSensitivity = 2;
    const preferredDuration = Number(searchParams.get('serviceDuration') ?? 0);
    if (smart) {
      await ensureBookingContentTables();
      const content = await listBookingContent(locale);
      urgencyBoost = parseToggle(content.smart_settings_urgency_boost, true);
      smartReorder = parseToggle(content.smart_settings_reorder, true);
      const sensitivity = Number(content.smart_settings_gap_sensitivity ?? '2');
      gapSensitivity = Number.isFinite(sensitivity) ? Math.min(Math.max(Math.round(sensitivity), 1), 3) : 2;
    }
    if (upcoming) {
      const limit = Number(searchParams.get('limit') ?? 8);
      const slots = await listResolvedUpcomingSlots({ limit });
      const smartPayload = smart
        ? enrichSmartSlots(slots as unknown as TimeSlot[], { urgencyBoost, smartReorder, gapSensitivity, preferredDuration })
        : null;
      return NextResponse.json(
        {
          ok: true,
          slots: (smartPayload?.slots ?? slots) as unknown as TimeSlot[],
          recommendedTimes: smartPayload?.recommended ?? [],
        },
        admin
          ? undefined
          : {
              headers: {
                // Availability must be consistent with bookings/blocks immediately
                // (homepage hero uses `limit=1` and should never show booked slots).
                'Cache-Control': 'no-store',
              },
            }
      );
    }

    const date = searchParams.get('date');
    if (date) {
      const slots = await listResolvedSlotsInRange({
        from: date,
        to: date,
        view: admin ? 'admin' : 'booking',
        includeUnavailable: admin || smart,
      });
      const smartPayload = smart
        ? enrichSmartSlots(slots as unknown as TimeSlot[], { urgencyBoost, smartReorder, gapSensitivity, preferredDuration })
        : null;
      return NextResponse.json(
        {
          ok: true,
          slots: (smartPayload?.slots ?? slots) as unknown as TimeSlot[],
          recommendedTimes: smartPayload?.recommended ?? [],
        },
        admin
          ? undefined
          : {
              headers: {
                // Slot availability depends on bookings/blocks; avoid stale cache.
                'Cache-Control': 'no-store',
              },
            }
      );
    }

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from && to) {
      const slots = await listResolvedSlotsInRange({
        from,
        to,
        view: admin ? 'admin' : 'booking',
        includeUnavailable: admin || smart,
      });
      const smartPayload = smart
        ? enrichSmartSlots(slots as unknown as TimeSlot[], { urgencyBoost, smartReorder, gapSensitivity, preferredDuration })
        : null;
      return NextResponse.json(
        {
          ok: true,
          slots: (smartPayload?.slots ?? slots) as unknown as TimeSlot[],
          recommendedTimes: smartPayload?.recommended ?? [],
        },
        admin
          ? undefined
          : {
              headers: {
                // Slot availability depends on bookings/blocks; avoid stale cache.
                'Cache-Control': 'no-store',
              },
            }
      );
    }

    const days = Number(searchParams.get('days') ?? 7);
    const safeDays = Number.isFinite(days) ? Math.min(Math.max(1, Math.floor(days)), 31) : 7;
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + (safeDays - 1));

    const slots = await listResolvedSlotsInRange({
      from: toDateString(start),
      to: toDateString(end),
      view: admin ? 'admin' : 'booking',
      includeUnavailable: admin || smart,
    });
    const smartPayload = smart
      ? enrichSmartSlots(slots as unknown as TimeSlot[], { urgencyBoost, smartReorder, gapSensitivity, preferredDuration })
      : null;

    return NextResponse.json(
      {
        ok: true,
        slots: (smartPayload?.slots ?? slots) as unknown as TimeSlot[],
        recommendedTimes: smartPayload?.recommended ?? [],
      },
      admin
        ? undefined
        : {
            headers: {
              // Slot availability depends on bookings/blocks; avoid stale cache.
              'Cache-Control': 'no-store',
            },
          }
    );
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
