/**
 * Stripe Webhook Utilities
 * 
 * Handles webhook signature verification and event parsing
 * for Stripe webhook processing.
 */

import Stripe from 'stripe';
import { getStripeServer } from './stripe';
import { sql } from './db';
import { isDatabaseMigrated } from './schema-validator';

/**
 * Verify Stripe webhook signature
 * 
 * CRITICAL: This requires the raw request body, not parsed JSON.
 * Next.js parses body by default, so we need to use a special approach.
 * 
 * @param payload - The raw request body as string
 * @param signature - The stripe-signature header value
 * @returns Verified Stripe event or throws error
 */
export function verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  const stripe = getStripeServer();
  
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event;
  } catch (err) {
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      console.error('Webhook signature verification failed:', err.message);
      throw new Error('Invalid webhook signature');
    }
    throw err;
  }
}

/**
 * Extract relevant metadata from a checkout session
 * Used to link Stripe events to internal records
 */
export interface CheckoutSessionMetadata {
  flow: 'booking_deposit' | 'product_purchase';
  bookingId?: string;
  orderId?: string;
}

/**
 * Parse checkout session metadata from Stripe event data
 */
export function parseCheckoutMetadata(
  session: Stripe.Checkout.Session
): CheckoutSessionMetadata | null {
  const metadata = session.metadata;
  
  if (!metadata) {
    return null;
  }

  return {
    flow: (metadata.flow as 'booking_deposit' | 'product_purchase') || 'product_purchase',
    bookingId: metadata.booking_id,
    orderId: metadata.order_id,
  };
}

/**
 * Check if this is a checkout session event we should handle
 */
export function isCheckoutSessionEvent(eventType: string): boolean {
  return eventType.startsWith('checkout.session');
}

// ============================================================================
// IDEMPOTENCY HANDLING
// ============================================================================

/**
 * Ensure the webhook events table exists for idempotency tracking
 */
async function ensureWebhookEventsTableInternal() {
  await sql`
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      id BIGSERIAL PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  
  // Create index for faster lookups
  await sql`
    CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id 
    ON stripe_webhook_events(event_id)
  `;
}

declare global {
  var __nailify_webhook_ensure__: Promise<void> | undefined;
}

let webhookEnsurePromise: Promise<void> | null = global.__nailify_webhook_ensure__ ?? null;

export async function ensureWebhookEventsTable() {
  // TRANSITIONAL: Skip ensure in production if migrations have been run
  // TODO: After migrations are fully deployed and verified, remove this function
  // and rely entirely on migrations in migrations/008_webhooks.sql
  if (process.env.NODE_ENV === 'production') {
    const migrated = await isDatabaseMigrated();
    if (migrated) {
      return;
    }
  }

  if (!webhookEnsurePromise) {
    webhookEnsurePromise = ensureWebhookEventsTableInternal();
    global.__nailify_webhook_ensure__ = webhookEnsurePromise;
  }
  await webhookEnsurePromise;
}

/**
 * Check if an event has already been processed (idempotency)
 * 
 * @returns true if event was already processed, false if new
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  await ensureWebhookEventsTable();
  
  const [row] = await sql<[{ event_id: string }]>`
    SELECT event_id FROM stripe_webhook_events 
    WHERE event_id = ${eventId}
    LIMIT 1
  `;
  
  return !!row;
}

/**
 * Record a processed event for idempotency
 * 
 * CRITICAL: Should only be called after successful processing
 */
export async function recordProcessedEvent(eventId: string, eventType: string): Promise<void> {
  await ensureWebhookEventsTable();
  
  // Use ON CONFLICT to handle race conditions gracefully
  await sql`
    INSERT INTO stripe_webhook_events (event_id, event_type, processed_at)
    VALUES (${eventId}, ${eventType}, NOW())
    ON CONFLICT (event_id) DO NOTHING
  `;
}
