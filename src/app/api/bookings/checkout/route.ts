import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { BookingInsert } from '@/lib/bookings';
import { checkRateLimit } from '@/lib/rate-limit';
import { createBookingCheckoutSession } from '@/lib/booking-engine/creator/booking-creator';
import { validateBookingCheckout } from '@/lib/booking-engine/validation/booking-validator';

function isValidPayload(payload: unknown): payload is BookingInsert {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as Partial<BookingInsert>;
  if (!data.service || !data.slot || !data.contact) return false;
  if (!Array.isArray(data.addOns)) return false;
  if (!Array.isArray(data.products)) return false;
  if (typeof data.totalPrice !== 'number' || typeof data.totalDuration !== 'number') return false;
  if (typeof data.productsTotalPrice !== 'number') return false;
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

    const h = await headers();
    const baseUrl = getBaseUrlFromHeaders(h.get('origin'), h.get('host'));

    const validation = await validateBookingCheckout(payload);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message, code: validation.code }, { status: validation.status });
    }

    const creation = await createBookingCheckoutSession({
      payload,
      resolvedSlot: validation.resolvedSlot,
      serviceForInsert: validation.serviceForInsert,
      pricingSnapshot: validation.pricingSnapshot,
      productsForInsert: validation.productsForInsert,
      productsTotalPrice: validation.productsTotalPrice,
      baseUrl,
    });

    if (!creation.ok) {
      return NextResponse.json({ error: creation.message, code: creation.code }, { status: creation.status });
    }

    return NextResponse.json({
      ok: true,
      bookingId: creation.bookingId,
      checkoutUrl: creation.checkoutUrl,
    });
  } catch (error) {
    console.error('POST /api/bookings/checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to start booking payment. Configure STRIPE_SECRET_KEY first.' },
      { status: 500 }
    );
  }
}

