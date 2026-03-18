import { sql } from '@/lib/db';
import { getStripeServer } from '@/lib/stripe';
import {
  ensureBookingsTable,
  insertBooking,
  setBookingStripeSession,
  type BookingInsert,
} from '@/lib/bookings';
import { ensureOrdersTable, createOrder, setOrderStripeSession } from '@/lib/orders';
import type { EngineTimeSlot } from '../types';
import type { BookingPricingDbSnapshot } from '../pricing/pricing-engine';
import { BOOKING_DEPOSIT_EUR } from '../pricing/pricing-engine';

export type BookingCreateResult =
  | { ok: true; bookingId: string; checkoutUrl: string }
  | { ok: false; status: number; code: 'slot_conflict' | 'stripe_failed' | 'server_error'; message: string };

export async function createBookingCheckoutSession(input: {
  payload: BookingInsert;
  resolvedSlot: EngineTimeSlot;
  serviceForInsert: BookingInsert['service'];
  pricingSnapshot: BookingPricingDbSnapshot;
  baseUrl: string;
}): Promise<BookingCreateResult> {
  const { payload, resolvedSlot, serviceForInsert, pricingSnapshot, baseUrl } = input;

  await ensureBookingsTable();
  await ensureOrdersTable();

  let bookingId: string | null = null;

  try {
    // Atomic booking reserve relies on the DB uniqueness constraint.
    const booking = await insertBooking({
      ...payload,
      service: serviceForInsert,
      slot: resolvedSlot,
      status: 'pending_payment',
      paymentStatus: 'pending',
      depositAmount: BOOKING_DEPOSIT_EUR,
      totalPrice: pricingSnapshot.totals.totalPrice,
      totalDuration: pricingSnapshot.totals.totalDuration,
    });

    bookingId = booking.id;

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

    if (!session.url) {
      throw new Error('Stripe session missing URL');
    }

    await setBookingStripeSession(booking.id, session.id);
    await setOrderStripeSession(orderId, session.id);

    return { ok: true, bookingId: booking.id, checkoutUrl: session.url };
  } catch (e: unknown) {
    const err = e as unknown as { code?: string };
    const code = err.code;

    // Unique constraint => slot is already reserved/booked.
    if (code === '23505') {
      return { ok: false, status: 409, code: 'slot_conflict', message: 'Selected slot is already reserved.' };
    }

    // If we created the booking but failed later, cancel it so the slot is immediately released.
    if (bookingId) {
      try {
        await sql`
          UPDATE bookings
          SET status = 'cancelled',
              payment_status = 'failed'
          WHERE id = ${bookingId}::bigint
        `;
      } catch {
        // Best-effort cancellation; original error will be returned.
      }
    }

    const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
    return { ok: false, status: 500, code: code === 'stripe' ? 'stripe_failed' : 'server_error', message };
  }
}

