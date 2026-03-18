import { NextResponse } from 'next/server';
import { insertAnalyticsSessionStart } from '@/lib/analytics';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      sessionId?: string;
      locale?: string;
      path?: string;
      referrer?: string;
    };
    if (!payload?.sessionId || typeof payload.sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    await insertAnalyticsSessionStart({
      sessionId: payload.sessionId,
      locale: typeof payload.locale === 'string' ? payload.locale : null,
      path: typeof payload.path === 'string' ? payload.path : null,
      referrer: typeof payload.referrer === 'string' ? payload.referrer : null,
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Non-blocking analytics: never throw to client.
    console.warn('POST /api/analytics/session-start error:', error);
    return NextResponse.json({ ok: true });
  }
}

