import { NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import { markBookingPaidBySession } from '@/lib/bookings';
import { markOrderPaidBySession } from '@/lib/orders';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<{
      sessionId: string;
      type: 'booking' | 'order';
    }>;

    if (!payload.sessionId || !payload.type) {
      return NextResponse.json({ error: 'sessionId and type are required' }, { status: 400 });
    }

    const stripe = getStripeServer();
    const session = await stripe.checkout.sessions.retrieve(payload.sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ ok: false, status: session.payment_status }, { status: 400 });
    }

    if (payload.type === 'booking') {
      const bookingId = await markBookingPaidBySession(payload.sessionId);
      const orderId = await markOrderPaidBySession(payload.sessionId);
      return NextResponse.json({ ok: true, bookingId, orderId });
    }

    const orderId = await markOrderPaidBySession(payload.sessionId);
    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    console.error('POST /api/stripe/confirm error:', error);
    return NextResponse.json({ error: 'Failed to verify payment session' }, { status: 500 });
  }
}

