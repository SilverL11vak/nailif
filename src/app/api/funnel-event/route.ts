import { NextResponse } from 'next/server';
import { getAnalyticsEnabled } from '@/lib/app-settings';
import { insertFunnelEvent, type FunnelEventName } from '@/lib/funnel-analytics';

function toText(v: unknown, max = 120) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function isValidEventName(v: unknown): v is FunnelEventName {
  return (
    v === 'booking_cta_click' ||
    v === 'service_selected' ||
    v === 'slot_viewed' ||
    v === 'slot_clicked' ||
    v === 'slot_abandoned' ||
    v === 'payment_started' ||
    v === 'payment_success'
  );
}

export async function POST(request: Request) {
  try {
    if (!(await getAnalyticsEnabled())) return NextResponse.json({ ok: true });
    const payload = (await request.json()) as {
      event?: unknown;
      bookingId?: unknown;
      serviceId?: unknown;
      slotId?: unknown;
      device?: unknown;
      language?: unknown;
      metadata?: unknown;
    };

    if (!isValidEventName(payload?.event)) {
      return NextResponse.json({ ok: true });
    }

    await insertFunnelEvent({
      eventName: payload.event,
      bookingId: toText(payload.bookingId),
      serviceId: toText(payload.serviceId),
      slotId: toText(payload.slotId),
      device: toText(payload.device, 40),
      language: toText(payload.language, 12),
      metadata: payload.metadata ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Never block UI
    console.warn('POST /api/funnel-event error:', error);
    return NextResponse.json({ ok: true });
  }
}

