import { NextResponse } from 'next/server';
import { insertSlotClick } from '@/lib/analytics';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { sessionId?: string; slotId?: string };
    if (!payload?.sessionId || typeof payload.sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }
    if (!payload?.slotId || typeof payload.slotId !== 'string') {
      return NextResponse.json({ error: 'slotId is required' }, { status: 400 });
    }

    await insertSlotClick({ sessionId: payload.sessionId, slotId: payload.slotId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn('POST /api/analytics/slot-click error:', error);
    return NextResponse.json({ ok: true });
  }
}

