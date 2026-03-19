import { NextResponse } from 'next/server';
import { getBookingByStripeSessionId } from '@/lib/bookings';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const stripeSessionId = url.searchParams.get('stripeSessionId') ?? url.searchParams.get('session_id');
    if (!stripeSessionId) {
      return NextResponse.json({ error: 'stripeSessionId is required' }, { status: 400 });
    }

    const booking = await getBookingByStripeSessionId(stripeSessionId);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    return NextResponse.json({ ok: true, booking });
  } catch (error) {
    console.error('GET /api/bookings/summary error:', error);
    return NextResponse.json({ error: 'Failed to load booking summary' }, { status: 500 });
  }
}

