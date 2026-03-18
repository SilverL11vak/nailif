import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  ensureBookingsTable,
  insertBooking,
  setBookingStripeSession,
  type BookingInsert,
} from '@/lib/bookings';
import { ensureOrdersTable, createOrder, setOrderStripeSession } from '@/lib/orders';
import { getStripeServer } from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit';

const BOOKING_DEPOSIT_EUR = 10;

function isValidPayload(payload: unknown): payload is BookingInsert {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as Partial<BookingInsert>;
  if (!data.service || !data.slot || !data.contact) return false;
  if (!Array.isArray(data.addOns)) return false;
  if (typeof data.totalPrice !== 'number' || typeof data.totalDuration !== 'number') return false;
  if (data.source !== 'guided' && data.source !== 'fast') return false;
  return true;
}

function getBaseUrlFromHeaders(originHeader: string | null, hostHeader: string | null) {
  if (originHeader) return originHeader;
  if (hostHeader) return `https://${hostHeader}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003';
}

export async function POST(request: Request) {
  try {
    // Rate limit check - prevent payment abuse
    const rateLimit = checkRateLimit('checkout', request.headers);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter ?? 60) } }
      );
    }

    const payload = await request.json();
    if (!isValidPayload(payload)) {
      return NextResponse.json({ error: 'Invalid booking payload' }, { status: 400 });
    }

    await ensureBookingsTable();
    await ensureOrdersTable();

    const booking = await insertBooking({
      ...payload,
      status: 'pending_payment',
      paymentStatus: 'pending',
      depositAmount: BOOKING_DEPOSIT_EUR,
    });

    const orderId = await createOrder({
      orderType: 'booking_deposit',
      amountTotal: BOOKING_DEPOSIT_EUR,
      currency: 'eur',
      customerName: `${payload.contact.firstName} ${payload.contact.lastName ?? ''}`.trim(),
      customerEmail: payload.contact.email ?? undefined,
      customerPhone: payload.contact.phone,
      bookingId: booking.id,
      items: [
        {
          id: payload.service.id,
          name: `${payload.service.name} deposit`,
          quantity: 1,
          price: BOOKING_DEPOSIT_EUR,
        },
      ],
    });

    const h = await headers();
    const baseUrl = getBaseUrlFromHeaders(h.get('origin'), h.get('host'));
    const stripe = getStripeServer();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'book',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: BOOKING_DEPOSIT_EUR * 100,
            product_data: {
              name: `Booking deposit - ${payload.service.name}`,
              description: 'Advance payment to secure your Nailify slot.',
            },
          },
        },
      ],
      customer_email: payload.contact.email ?? undefined,
      metadata: {
        flow: 'booking_deposit',
        booking_id: booking.id,
        order_id: orderId,
      },
      success_url: `${baseUrl}/success?type=booking&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/book?payment=cancelled`,
    });

    await setBookingStripeSession(booking.id, session.id);
    await setOrderStripeSession(orderId, session.id);

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error('POST /api/bookings/checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to start booking payment. Configure STRIPE_SECRET_KEY first.' },
      { status: 500 }
    );
  }
}

