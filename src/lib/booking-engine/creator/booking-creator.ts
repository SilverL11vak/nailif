import { sql } from '@/lib/db';
import { getStripeServer } from '@/lib/stripe';
import {
  ensureBookingsTable,
  insertBooking,
  setBookingStripeSession,
  cancelExpiredPendingBookingsForSlot,
  type BookingInsert,
} from '@/lib/bookings';
import { ensureOrdersTable, createOrder, setOrderStripeSession } from '@/lib/orders';
import type { EngineTimeSlot } from '../types';
import type { BookingPricingDbSnapshot } from '../pricing/pricing-engine';
import { BOOKING_DEPOSIT_EUR } from '../pricing/pricing-engine';
import { calculateBookingCheckoutPricingFromStore } from '../pricing/calculate-booking-checkout-pricing';
import { calculateBookingCommercePricing } from '../pricing/calculate-booking-commerce-pricing';

export type BookingCreateResult =
  | { ok: true; bookingId: string; checkoutUrl: string }
  | { ok: false; status: number; code: 'slot_conflict' | 'stripe_failed' | 'server_error'; message: string };

export async function createBookingCheckoutSession(input: {
  payload: BookingInsert;
  resolvedSlot: EngineTimeSlot;
  serviceForInsert: BookingInsert['service'];
  pricingSnapshot: BookingPricingDbSnapshot;
  productsForInsert: BookingInsert['products'];
  productsTotalPrice: number;
  baseUrl: string;
}): Promise<BookingCreateResult> {
  const { payload, resolvedSlot, serviceForInsert, pricingSnapshot, productsForInsert, productsTotalPrice, baseUrl } = input;

  await ensureBookingsTable();
  await ensureOrdersTable();

  let bookingId: string | null = null;

  try {
    const pricingSnapshotForSession = calculateBookingCommercePricing({
      baseServicePrice: pricingSnapshot.service.price,
      baseServiceDuration: pricingSnapshot.service.duration,
      extras: pricingSnapshot.addOns.map((addOn) => ({
        id: addOn.id,
        name: '',
        unitPrice: addOn.price,
        quantity: 1,
        durationImpact: addOn.duration,
      })),
      products: productsForInsert,
      depositAmount: BOOKING_DEPOSIT_EUR,
      slotSurchargeTotal:
        Math.max(0, pricingSnapshot.totals.totalPrice - pricingSnapshot.service.price - pricingSnapshot.addOns.reduce((sum, addOn) => sum + addOn.price, 0)),
    });
    const checkoutPricing = calculateBookingCheckoutPricingFromStore({
      baseServicePrice: pricingSnapshotForSession.baseServicePrice,
      serviceTotal: pricingSnapshotForSession.serviceTotal,
      depositAmount: pricingSnapshotForSession.depositAmount,
      productsTotal: pricingSnapshotForSession.productsTotal,
    });
    const serviceCheckoutAmount = Math.max(0, checkoutPricing.payNowTotal - checkoutPricing.productsTotal);

    // Free up any expired pending_payment bookings for this slot so the
    // unique index doesn't block legitimate retries.
    await cancelExpiredPendingBookingsForSlot(resolvedSlot.date, resolvedSlot.time);

    // Atomic booking reserve relies on the DB uniqueness constraint.
    const booking = await insertBooking({
      ...payload,
      service: serviceForInsert,
      slot: resolvedSlot,
      products: productsForInsert,
      productsTotalPrice,
      status: 'pending_payment',
      paymentStatus: 'pending',
      depositAmount: BOOKING_DEPOSIT_EUR,
      totalPrice: pricingSnapshot.totals.totalPrice,
      totalDuration: pricingSnapshot.totals.totalDuration,
      pricingSnapshot: pricingSnapshotForSession,
    });

    bookingId = booking.id;

    const orderId = await createOrder({
      orderType: 'booking_deposit',
      amountTotal: checkoutPricing.payNowTotal,
      currency: 'eur',
      customerName: `${payload.contact.firstName} ${payload.contact.lastName ?? ''}`.trim(),
      customerEmail: payload.contact.email ?? undefined,
      customerPhone: payload.contact.phone,
      bookingId: booking.id,
      items: [
        {
          id: payload.service.id,
          name: `${payload.service.name} checkout`,
          quantity: 1,
          price: serviceCheckoutAmount,
        },
        ...productsForInsert.map((p) => ({
          id: p.productId,
          name: p.name,
          quantity: p.quantity,
          price: p.unitPrice,
        })),
      ],
    });

    const stripe = getStripeServer();

    const lineItems = [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(serviceCheckoutAmount * 100),
          product_data: {
            name: `Booking checkout - ${payload.service.name}`,
            description: 'Service balance after deposit credit.',
          },
        },
      },
      ...productsForInsert.map((p) => ({
        quantity: p.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(p.unitPrice * 100),
          product_data: {
            name: p.name,
            images: p.imageUrl ? [p.imageUrl] : undefined,
          },
        },
      })),
    ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'book',
      line_items: lineItems,
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
