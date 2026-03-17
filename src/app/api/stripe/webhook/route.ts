import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import {
  verifyWebhookSignature,
  parseCheckoutMetadata,
  isEventProcessed,
  recordProcessedEvent,
} from '@/lib/stripe-webhook';
import { markBookingPaidFromWebhook } from '@/lib/bookings';
import { markOrderPaidFromWebhook } from '@/lib/orders';

/**
 * Stripe Webhook Handler
 * 
 * Handles incoming webhook events from Stripe.
 * Makes Stripe the source of truth for payment confirmation.
 * 
 * Security:
 * - Verifies webhook signature using STRIPE_WEBHOOK_SECRET
 * - Idempotent processing prevents duplicate state changes
 * 
 * Event Types Handled:
 * - checkout.session.completed: Marks booking/order as paid
 * - checkout.session.expired: Marks booking/order as expired
 */

export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    // CRITICAL: This must be the raw body, not parsed JSON
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Webhook missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Check idempotency - don't process same event twice
    if (await isEventProcessed(event.id)) {
      console.log(`Webhook event ${event.id} already processed, skipping`);
      return NextResponse.json({ ok: true, status: 'already_processed' });
    }

    // Process the event based on type
    const result = await processWebhookEvent(event);

    // Record processed event for idempotency
    // CRITICAL: Only record after successful processing
    await recordProcessedEvent(event.id, event.type);

    return NextResponse.json({ ok: true, status: result.status });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 to Stripe to prevent retries for non-transient errors
    return NextResponse.json({ ok: true, status: 'error_handled' });
  }
}

/**
 * Process a webhook event based on its type
 */
async function processWebhookEvent(event: Stripe.Event): Promise<{ status: string }> {
  const eventType = event.type;
  const data = event.data.object as Stripe.Checkout.Session;

  switch (eventType) {
    case 'checkout.session.completed':
      return await handleCheckoutSessionCompleted(data);
    
    case 'checkout.session.expired':
      return await handleCheckoutSessionExpired(data);
    
    case 'payment_intent.payment_failed':
      // Could implement failure handling here
      return { status: 'payment_failed_received' };
    
    default:
      console.log(`Unhandled webhook event type: ${eventType}`);
      return { status: 'unhandled_event_type' };
  }
}

/**
 * Handle checkout.session.completed event
 * 
 * Uses Stripe metadata to find and update the related booking/order
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<{ status: string }> {
  const metadata = parseCheckoutMetadata(session);
  
  if (!metadata) {
    console.error('No metadata found in checkout session');
    return { status: 'no_metadata' };
  }

  // Extract payment details from payment intent if available
  const paymentIntentId = session.payment_intent 
    ? (typeof session.payment_intent === 'string' 
        ? session.payment_intent 
        : (session.payment_intent as Stripe.PaymentIntent).id)
    : undefined;
    
  // payment_method on Checkout Session is accessed via payment_link or customer details
  // For now, we'll leave it undefined as it's not directly on the session object

  let bookingUpdated = false;
  let orderUpdated = false;

  // Update booking if booking_id metadata exists
  if (metadata.bookingId) {
    const bookingId = await markBookingPaidFromWebhook(
      session.id,
      paymentIntentId
    );
    if (bookingId) {
      bookingUpdated = true;
      console.log(`Booking ${bookingId} marked as paid via webhook`);
    }
  }

  // Update order if order_id metadata exists
  if (metadata.orderId) {
    const orderId = await markOrderPaidFromWebhook(
      session.id,
      paymentIntentId
    );
    if (orderId) {
      orderUpdated = true;
      console.log(`Order ${orderId} marked as paid via webhook`);
    }
  }

  if (!bookingUpdated && !orderUpdated) {
    console.warn('No booking or order found for session:', session.id);
    return { status: 'no_records_found' };
  }

  return { status: 'completed' };
}

/**
 * Handle checkout.session.expired event
 * 
 * Marks the related booking/order as expired
 */
async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session
): Promise<{ status: string }> {
  // TODO: Implement expiration handling if needed
  // For now, just log it
  console.log(`Checkout session expired: ${session.id}`);
  return { status: 'expired_logged' };
}
