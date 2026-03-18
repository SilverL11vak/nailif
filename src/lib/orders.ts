import { sql } from './db';
import { isDatabaseMigrated } from './schema-validator';
// Customer linking happens only after verified payment success.

export interface OrderRecord {
  id: string;
  orderType: 'booking_deposit' | 'product_purchase';
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  amountTotal: number;
  currency: string;
  stripeSessionId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  items: Array<{ id: string; name: string; quantity: number; price: number }>;
  createdAt: string;
  paidAt: string | null;
}

// Compact order record for lightweight admin dashboards.
// Avoids JSON parsing of `items_json`.
export interface OrderRecordCompact {
  id: string;
  orderType: 'booking_deposit' | 'product_purchase';
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  amountTotal: number;
  customerName: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface CreateOrderInput {
  orderType: 'booking_deposit' | 'product_purchase';
  amountTotal: number;
  currency?: string;
  items?: Array<{ id: string; name: string; quantity: number; price: number }>;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  bookingId?: string;
  status?: 'pending' | 'paid' | 'cancelled' | 'failed';
}

declare global {
  var __nailify_orders_ensure__: Promise<void> | undefined;
}

let ordersEnsurePromise: Promise<void> | null = global.__nailify_orders_ensure__ ?? null;

async function ensureOrdersTableInternal() {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      order_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      amount_total INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'eur',
      stripe_session_id TEXT UNIQUE,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      booking_id BIGINT,
      items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ,
      payment_method TEXT,
      stripe_payment_intent_id TEXT,
      manually_reconciled BOOLEAN DEFAULT false,
      reconciled_at TIMESTAMPTZ,
      reconciled_by TEXT
    )
  `;

  // CRM linkage (nullable)
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders (customer_id)`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name_snapshot TEXT`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email_snapshot TEXT`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone_snapshot TEXT`;
}

export async function ensureOrdersTable() {
  // TRANSITIONAL: Skip ensure in production if migrations have been run
  // TODO: After migrations are fully deployed and verified, remove this function
  // and rely entirely on migrations in migrations/001_initial_schema.sql
  if (process.env.NODE_ENV === 'production') {
    const migrated = await isDatabaseMigrated();
    if (migrated) {
      return;
    }
  }

  if (!ordersEnsurePromise) {
    ordersEnsurePromise = ensureOrdersTableInternal();
    global.__nailify_orders_ensure__ = ordersEnsurePromise;
  }
  await ordersEnsurePromise;
}

export async function createOrder(input: CreateOrderInput) {
  const [row] = await sql<[{ id: number }]>`
    INSERT INTO orders (
      order_type,
      status,
      amount_total,
      currency,
      customer_name,
      customer_email,
      customer_phone,
      customer_id,
      customer_name_snapshot,
      customer_email_snapshot,
      customer_phone_snapshot,
      booking_id,
      items_json
    ) VALUES (
      ${input.orderType},
      ${input.status ?? 'pending'},
      ${input.amountTotal},
      ${input.currency ?? 'eur'},
      ${input.customerName ?? null},
      ${input.customerEmail ?? null},
      ${input.customerPhone ?? null},
      NULL,
      ${input.customerName ?? null},
      ${input.customerEmail ?? null},
      ${input.customerPhone ?? null},
      ${input.bookingId ? Number(input.bookingId) : null},
      ${JSON.stringify(input.items ?? [])}
    )
    RETURNING id
  `;

  return String(row.id);
}

export async function setOrderStripeSession(orderId: string, sessionId: string) {
  await sql`
    UPDATE orders
    SET stripe_session_id = ${sessionId}
    WHERE id = ${orderId}::bigint
  `;
}

export async function markOrderPaidBySession(sessionId: string) {
  const [row] = await sql<[{ id: number }]>`
    UPDATE orders
    SET status = 'paid',
        paid_at = NOW()
    WHERE stripe_session_id = ${sessionId}
    RETURNING id
  `;

  return row ? String(row.id) : null;
}

/**
 * Mark order as paid from webhook event
 * Includes additional metadata from Stripe
 */
export async function markOrderPaidFromWebhook(
  sessionId: string,
  paymentIntentId?: string,
  paymentMethod?: string
) {
  const [row] = await sql<[{ id: number }]>`
    UPDATE orders
    SET status = 'paid',
        paid_at = NOW(),
        stripe_payment_intent_id = ${paymentIntentId ?? null},
        payment_method = ${paymentMethod ?? null}
    WHERE stripe_session_id = ${sessionId}
    RETURNING id
  `;

  if (!row) return null;

  // Link to customer profile after verified payment.
  try {
    const { linkPaidOrderToCustomerBySession } = await import('./customer-service');
    await linkPaidOrderToCustomerBySession(sessionId);
  } catch (e) {
    console.error('Customer link after order webhook failed:', e);
  }

  return String(row.id);
}

/**
 * Manual Stripe reconciliation for an order
 * Returns: { success: true, alreadyPaid: false, orderId } | { success: true, alreadyPaid: true } | { success: false, reason }
 */
export async function reconcileOrderPayment(input: {
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  adminId: string;
  adminName: string | null;
}) {
  const { stripeSessionId, stripePaymentIntentId, adminId, adminName } = input;

  if (!stripeSessionId && !stripePaymentIntentId) {
    return { success: false as const, reason: 'Either stripeSessionId or stripePaymentIntentId is required' };
  }

  // Check if already reconciled
  let existing: {
    id: number;
    status: string;
    manually_reconciled: boolean;
    reconciled_at: string | null;
    reconciled_by: string | null;
  } | null = null;

  if (stripeSessionId) {
    const [row] = await sql<[
      {
        id: number;
        status: string;
        manually_reconciled: boolean;
        reconciled_at: string | null;
        reconciled_by: string | null;
      }
    ]>`
      SELECT id, status, manually_reconciled, reconciled_at::text, reconciled_by
      FROM orders
      WHERE stripe_session_id = ${stripeSessionId}
      LIMIT 1
    `;
    existing = row ?? null;
  } else if (stripePaymentIntentId) {
    const [row] = await sql<[
      {
        id: number;
        status: string;
        manually_reconciled: boolean;
        reconciled_at: string | null;
        reconciled_by: string | null;
      }
    ]>`
      SELECT id, status, manually_reconciled, reconciled_at::text, reconciled_by
      FROM orders
      WHERE stripe_payment_intent_id = ${stripePaymentIntentId}
      LIMIT 1
    `;
    existing = row ?? null;
  }

  if (!existing) {
    return { success: false as const, reason: 'Order not found for given Stripe ID' };
  }

  // Already marked as paid manually
  if (existing.manually_reconciled && existing.status === 'paid') {
    return { success: true as const, alreadyPaid: true as const, orderId: String(existing.id) };
  }

  // Update with audit fields
  const [row] = await sql<[{ id: number }]>`
    UPDATE orders
    SET status = 'paid',
        paid_at = NOW(),
        manually_reconciled = true,
        reconciled_at = NOW(),
        reconciled_by = ${adminName ?? `admin_${adminId}`}
    WHERE id = ${existing.id}
    RETURNING id
  `;

  // Link to customer profile after verified payment.
  try {
    const { linkPaidOrderToCustomerBySession, linkPaidOrderToCustomerByPaymentIntent } = await import('./customer-service');
    if (stripeSessionId) await linkPaidOrderToCustomerBySession(stripeSessionId);
    else if (stripePaymentIntentId) await linkPaidOrderToCustomerByPaymentIntent(stripePaymentIntentId);
  } catch (e) {
    console.error('Customer link after order reconcile failed:', e);
  }

  return { success: true as const, alreadyPaid: false as const, orderId: String(row.id) };
}

export async function listOrders(limit = 100): Promise<OrderRecord[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const rows = await sql<{
    id: number;
    order_type: 'booking_deposit' | 'product_purchase';
    status: 'pending' | 'paid' | 'cancelled' | 'failed';
    amount_total: number;
    currency: string;
    stripe_session_id: string | null;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    items_json:
      | Array<{ id: string; name: string; quantity: number; price: number }>
      | string;
    created_at: string;
    paid_at: string | null;
  }[]>`
    SELECT
      id,
      order_type,
      status,
      amount_total,
      currency,
      stripe_session_id,
      customer_name,
      customer_email,
      customer_phone,
      items_json,
      created_at::text,
      paid_at::text
    FROM orders
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => {
    let parsedItems: Array<{ id: string; name: string; quantity: number; price: number }> = [];
    if (Array.isArray(row.items_json)) {
      parsedItems = row.items_json;
    } else if (typeof row.items_json === 'string') {
      try {
        parsedItems = JSON.parse(row.items_json) as Array<{
          id: string;
          name: string;
          quantity: number;
          price: number;
        }>;
      } catch {
        parsedItems = [];
      }
    }

    return {
      id: String(row.id),
      orderType: row.order_type,
      status: row.status,
      amountTotal: row.amount_total,
      currency: row.currency,
      stripeSessionId: row.stripe_session_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      items: parsedItems,
      createdAt: row.created_at,
      paidAt: row.paid_at,
    };
  });
}

export async function listOrdersCompact(limit = 100): Promise<OrderRecordCompact[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));

  const rows = await sql<{
    id: number;
    order_type: 'booking_deposit' | 'product_purchase';
    status: 'pending' | 'paid' | 'cancelled' | 'failed';
    amount_total: number;
    customer_name: string | null;
    created_at: string;
    paid_at: string | null;
  }[]>`
    SELECT
      id,
      order_type,
      status,
      amount_total,
      customer_name,
      created_at::text,
      paid_at::text
    FROM orders
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    id: String(row.id),
    orderType: row.order_type,
    status: row.status,
    amountTotal: row.amount_total,
    customerName: row.customer_name,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  }));
}
