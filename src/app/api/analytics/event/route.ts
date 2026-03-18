import { NextResponse } from 'next/server';
import {
  endAnalyticsSession,
  insertAnalyticsEvent,
  markSlotClicksConverted,
  type AnalyticsEventType,
} from '@/lib/analytics';

const ENDING_EVENTS = new Set<AnalyticsEventType>(['booking_success', 'booking_abandon', 'booking_payment_fail']);

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      sessionId?: string;
      eventType?: AnalyticsEventType | string;
      serviceId?: string;
      slotId?: string;
      step?: number;
      metadata?: unknown;
    };
    if (!payload?.sessionId || typeof payload.sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }
    if (!payload?.eventType || typeof payload.eventType !== 'string') {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    const eventType = payload.eventType as AnalyticsEventType;
    await insertAnalyticsEvent({
      sessionId: payload.sessionId,
      eventType,
      step: typeof payload.step === 'number' ? payload.step : null,
      serviceId: typeof payload.serviceId === 'string' ? payload.serviceId : null,
      slotId: typeof payload.slotId === 'string' ? payload.slotId : null,
      metadata: payload.metadata ?? null,
    });

    if (eventType === 'booking_success') {
      await markSlotClicksConverted({ sessionId: payload.sessionId });
      await endAnalyticsSession({ sessionId: payload.sessionId, reason: 'success' });
    } else if (eventType === 'booking_payment_fail') {
      await endAnalyticsSession({ sessionId: payload.sessionId, reason: 'payment_fail' });
    } else if (eventType === 'booking_abandon') {
      const reason =
        typeof payload.metadata === 'object' &&
        payload.metadata !== null &&
        'reason' in payload.metadata &&
        typeof (payload.metadata as Record<string, unknown>).reason === 'string'
          ? String((payload.metadata as Record<string, unknown>).reason)
          : 'abandon';
      await endAnalyticsSession({ sessionId: payload.sessionId, reason });
    } else if (ENDING_EVENTS.has(eventType)) {
      await endAnalyticsSession({ sessionId: payload.sessionId, reason: eventType });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn('POST /api/analytics/event error:', error);
    return NextResponse.json({ ok: true });
  }
}

