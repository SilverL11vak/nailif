import { sql } from './db';
import { isDatabaseMigrated } from './schema-validator';

export type CustomerRecord = {
  id: string;
  fullName: string;
  email: string | null;
  emailNormalized: string | null;
  phone: string | null;
  phoneNormalized: string | null;
  preferredLanguage: 'et' | 'en' | null;
  marketingOptIn: boolean;
  notes: string | null;
  status: string;
  trustScore: number;
  lifetimeValueCents: number;
  totalPaidBookings: number;
  totalPaidOrders: number;
  totalPaidCents: number;
  firstPaidAt: string | null;
  lastPaidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

declare global {
  var __nailify_customers_ensure__: Promise<void> | undefined;
}

let customersEnsurePromise: Promise<void> | null = global.__nailify_customers_ensure__ ?? null;

export function normalizeEmail(value: string | null | undefined) {
  const v = (value ?? '').trim().toLowerCase();
  return v || null;
}

/**
 * Phone normalization:
 * - keep digits only
 * - preserve Estonia numbers as 372XXXXXXXX
 * - if starts with 0 and length 8–9, assume local and prefix 372
 */
export function normalizePhone(value: string | null | undefined) {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d]+/g, '');
  if (!digits) return null;
  if (digits.startsWith('372') && digits.length >= 10) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 8 && digits.length <= 10) return `372${digits.slice(1)}`;
  if (digits.length >= 7) return digits;
  return digits;
}

function newCustomerId() {
  // Compact, URL-safe id.
  return `cus_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
}

async function ensureCustomersTablesInternal() {
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT,
      email_normalized TEXT,
      phone TEXT,
      phone_normalized TEXT,
      preferred_language TEXT,
      marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      trust_score INTEGER NOT NULL DEFAULT 0,
      lifetime_value_cents BIGINT NOT NULL DEFAULT 0,
      total_paid_bookings INTEGER NOT NULL DEFAULT 0,
      total_paid_orders INTEGER NOT NULL DEFAULT 0,
      total_paid_cents BIGINT NOT NULL DEFAULT 0,
      first_paid_at TIMESTAMPTZ,
      last_paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_normalized TEXT`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_value_cents BIGINT NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_paid_bookings INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_paid_orders INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_paid_cents BIGINT NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_paid_at TIMESTAMPTZ`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMPTZ`;

  // Safe lookup indexes (partial uniques)
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique ON customers (lower(email)) WHERE email IS NOT NULL AND email <> ''`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS customers_email_norm_unique ON customers (email_normalized) WHERE email_normalized IS NOT NULL AND email_normalized <> ''`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique ON customers (phone_normalized) WHERE phone_normalized IS NOT NULL AND phone_normalized <> ''`;
  await sql`CREATE INDEX IF NOT EXISTS customers_updated_at_idx ON customers (updated_at DESC)`;
}

export async function ensureCustomersTables() {
  // TRANSITIONAL: Skip ensure in production if migrations have been run
  // TODO: After migrations are fully deployed and verified, remove this function
  // and rely entirely on migrations in migrations/001_initial_schema.sql
  if (process.env.NODE_ENV === 'production') {
    const migrated = await isDatabaseMigrated();
    if (migrated) {
      return;
    }
  }

  if (!customersEnsurePromise) {
    customersEnsurePromise = ensureCustomersTablesInternal();
    global.__nailify_customers_ensure__ = customersEnsurePromise;
  }
  await customersEnsurePromise;
}

export async function findCustomerIdByContact(input: { email?: string | null; phone?: string | null }) {
  const email = normalizeEmail(input.email);
  if (email) {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM customers WHERE email_normalized = ${email} OR lower(email) = ${email} LIMIT 1
    `;
    if (row?.id) return row.id;
  }

  const phoneNormalized = normalizePhone(input.phone);
  if (phoneNormalized) {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM customers WHERE phone_normalized = ${phoneNormalized} LIMIT 1
    `;
    if (row?.id) return row.id;
  }

  return null;
}

export async function getOrCreateCustomerIdFromContact(input: {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  preferredLanguage?: 'et' | 'en' | null;
}) {
  await ensureCustomersTables();

  const email = normalizeEmail(input.email);
  const phoneNormalized = normalizePhone(input.phone);
  const existing = await findCustomerIdByContact({ email, phone: input.phone });
  if (existing) {
    await sql`
      UPDATE customers
      SET
        full_name = CASE WHEN customers.full_name = '' THEN ${input.fullName ?? ''} ELSE customers.full_name END,
        phone = COALESCE(customers.phone, ${input.phone ?? null}),
        phone_normalized = COALESCE(customers.phone_normalized, ${phoneNormalized}),
        preferred_language = COALESCE(customers.preferred_language, ${input.preferredLanguage ?? null}),
        email = COALESCE(customers.email, ${input.email ?? null}),
        email_normalized = COALESCE(customers.email_normalized, ${email}),
        updated_at = NOW()
      WHERE id = ${existing}
    `;
    return existing;
  }

  const id = newCustomerId();
  const fullName = (input.fullName ?? '').trim() || 'Client';
  await sql`
    INSERT INTO customers (id, full_name, email, phone, phone_normalized, preferred_language, notes)
    VALUES (${id}, ${fullName}, ${input.email ?? null}, ${input.phone ?? null}, ${phoneNormalized}, ${input.preferredLanguage ?? null}, NULL)
  `;
  await sql`UPDATE customers SET email_normalized = ${email} WHERE id = ${id}`;
  return id;
}

/**
 * Backfill customer_id for existing bookings/orders in small batches.
 * Safe matching only: email exact -> phone normalized exact.
 */
export async function backfillCustomersBatch(input?: { bookingsLimit?: number; ordersLimit?: number }) {
  await ensureCustomersTables();
  const bookingsLimit = Math.max(0, Math.min(1000, Math.floor(input?.bookingsLimit ?? 300)));
  const ordersLimit = Math.max(0, Math.min(1000, Math.floor(input?.ordersLimit ?? 300)));

  const bookings = await sql<{
    id: number;
    stripe_session_id: string | null;
    stripe_payment_intent_id: string | null;
  }[]>`
    SELECT id, stripe_session_id, stripe_payment_intent_id
    FROM bookings
    WHERE customer_id IS NULL
      AND payment_status = 'paid'
    ORDER BY created_at DESC
    LIMIT ${bookingsLimit}
  `;

  let linkedBookings = 0;
  for (const b of bookings) {
    try {
      const { linkPaidBookingToCustomerByBookingId } = await import('./customer-service');
      const res = await linkPaidBookingToCustomerByBookingId(String(b.id));
      if (res.ok) linkedBookings += 1;
    } catch {
      // ignore
    }
  }

  const orders = await sql<{
    id: number;
    stripe_session_id: string | null;
    stripe_payment_intent_id: string | null;
  }[]>`
    SELECT id, stripe_session_id, stripe_payment_intent_id
    FROM orders
    WHERE customer_id IS NULL
      AND status = 'paid'
    ORDER BY created_at DESC
    LIMIT ${ordersLimit}
  `;

  let linkedOrders = 0;
  for (const o of orders) {
    try {
      const { linkPaidOrderToCustomerByOrderId } = await import('./customer-service');
      const res = await linkPaidOrderToCustomerByOrderId(String(o.id));
      if (res.ok) linkedOrders += 1;
    } catch {
      // ignore
    }
  }

  return { linkedBookings, linkedOrders };
}

