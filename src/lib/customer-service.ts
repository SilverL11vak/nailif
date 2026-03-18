import { sql } from './db';
import { ensureCustomersTables, normalizeEmail, normalizePhone } from './customers';
import { ensureBookingsTable } from './bookings';
import { ensureOrdersTable } from './orders';

type MatchResult =
  | { kind: 'none' }
  | { kind: 'match'; customerId: string }
  | { kind: 'conflict'; customerByEmail: string | null; customerByPhone: string | null };

function newCustomerId() {
  return `cus_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
}

async function ensureConflictTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS customer_identity_conflicts (
      id BIGSERIAL PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      email_normalized TEXT,
      phone_normalized TEXT,
      customer_by_email TEXT,
      customer_by_phone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS customer_identity_conflicts_source_idx ON customer_identity_conflicts (source_type, source_id)`;
}

async function matchCustomerByIdentity(input: { emailNormalized: string | null; phoneNormalized: string | null }): Promise<MatchResult> {
  const emailNormalized = input.emailNormalized;
  const phoneNormalized = input.phoneNormalized;

  let byEmail: string | null = null;
  let byPhone: string | null = null;

  if (emailNormalized) {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM customers WHERE email_normalized = ${emailNormalized} LIMIT 1
    `;
    byEmail = row?.id ?? null;
  }

  if (phoneNormalized) {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM customers WHERE phone_normalized = ${phoneNormalized} LIMIT 1
    `;
    byPhone = row?.id ?? null;
  }

  if (byEmail && byPhone && byEmail !== byPhone) {
    return { kind: 'conflict', customerByEmail: byEmail, customerByPhone: byPhone };
  }
  if (byEmail) return { kind: 'match', customerId: byEmail };
  if (byPhone) return { kind: 'match', customerId: byPhone };
  return { kind: 'none' };
}

export async function refreshCustomerAggregates(customerId: string) {
  await ensureCustomersTables();
  await ensureBookingsTable();
  await ensureOrdersTable();

  const [bAgg] = await sql<{
    total_paid_bookings: number;
    paid_booking_cents: number;
    first_paid_at: string | null;
    last_paid_at: string | null;
    cancelled_count: number;
    completed_count: number;
  }[]>`
    SELECT
      COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS total_paid_bookings,
      COALESCE(SUM(total_price) FILTER (WHERE payment_status = 'paid'), 0)::int AS paid_booking_cents,
      MIN(paid_at)::text AS first_paid_at,
      MAX(paid_at)::text AS last_paid_at,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count
    FROM bookings
    WHERE customer_id = ${customerId}
  `;

  const [oAgg] = await sql<{
    total_paid_orders: number;
    paid_order_cents: number;
    first_paid_at: string | null;
    last_paid_at: string | null;
  }[]>`
    SELECT
      COUNT(*) FILTER (WHERE status = 'paid' AND order_type = 'product_purchase')::int AS total_paid_orders,
      COALESCE(SUM(amount_total) FILTER (WHERE status = 'paid' AND order_type = 'product_purchase'), 0)::int AS paid_order_cents,
      MIN(paid_at)::text AS first_paid_at,
      MAX(paid_at)::text AS last_paid_at
    FROM orders
    WHERE customer_id = ${customerId}
  `;

  const totalPaidCents = (Number(bAgg?.paid_booking_cents) || 0) + (Number(oAgg?.paid_order_cents) || 0);
  const totalPaidBookings = Number(bAgg?.total_paid_bookings) || 0;
  const totalPaidOrders = Number(oAgg?.total_paid_orders) || 0;

  const firstPaidAt =
    [bAgg?.first_paid_at, oAgg?.first_paid_at].filter(Boolean).sort()[0] ?? null;
  const lastPaidAt =
    [bAgg?.last_paid_at, oAgg?.last_paid_at].filter(Boolean).sort().slice(-1)[0] ?? null;

  // Derived flags (stored via status/trust_score in future; right now only update aggregates).
  await sql`
    UPDATE customers
    SET
      lifetime_value_cents = ${totalPaidCents},
      total_paid_bookings = ${totalPaidBookings},
      total_paid_orders = ${totalPaidOrders},
      total_paid_cents = ${totalPaidCents},
      first_paid_at = COALESCE(${firstPaidAt}::timestamptz, first_paid_at),
      last_paid_at = COALESCE(${lastPaidAt}::timestamptz, last_paid_at),
      updated_at = NOW()
    WHERE id = ${customerId}
  `;

  return {
    totalPaidCents,
    totalPaidBookings,
    totalPaidOrders,
    firstPaidAt,
    lastPaidAt,
  };
}

async function upsertCustomerFromPaidIdentity(input: {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  preferredLanguage?: 'et' | 'en' | null;
  sourceType: 'booking' | 'order';
  sourceId: string;
}) {
  await ensureCustomersTables();
  await ensureConflictTable();

  const emailNormalized = normalizeEmail(input.email);
  const phoneNormalized = normalizePhone(input.phone);

  const match = await matchCustomerByIdentity({ emailNormalized, phoneNormalized });
  if (match.kind === 'conflict') {
    await sql`
      INSERT INTO customer_identity_conflicts (
        source_type, source_id, email_normalized, phone_normalized, customer_by_email, customer_by_phone
      ) VALUES (
        ${input.sourceType},
        ${input.sourceId},
        ${emailNormalized},
        ${phoneNormalized},
        ${match.customerByEmail},
        ${match.customerByPhone}
      )
    `;
    return { customerId: null, status: 'conflict' as const };
  }

  const fullName = (input.fullName ?? '').trim() || 'Client';

  if (match.kind === 'match') {
    const id = match.customerId;
    await sql`
      UPDATE customers
      SET
        full_name = COALESCE(NULLIF(customers.full_name, ''), ${fullName}),
        email = COALESCE(customers.email, ${input.email}),
        email_normalized = COALESCE(customers.email_normalized, ${emailNormalized}),
        phone = COALESCE(customers.phone, ${input.phone}),
        phone_normalized = COALESCE(customers.phone_normalized, ${phoneNormalized}),
        preferred_language = COALESCE(customers.preferred_language, ${input.preferredLanguage ?? null}),
        updated_at = NOW()
      WHERE id = ${id}
    `;
    return { customerId: id, status: 'matched' as const };
  }

  // No match: create only when we have at least one stable identifier.
  if (!emailNormalized && !phoneNormalized) {
    return { customerId: null, status: 'no_identity' as const };
  }

  const id = newCustomerId();
  await sql`
    INSERT INTO customers (
      id, full_name, email, email_normalized, phone, phone_normalized, preferred_language, notes
    ) VALUES (
      ${id},
      ${fullName},
      ${input.email},
      ${emailNormalized},
      ${input.phone},
      ${phoneNormalized},
      ${input.preferredLanguage ?? null},
      NULL
    )
  `;
  return { customerId: id, status: 'created' as const };
}

export async function linkPaidBookingToCustomerBySession(sessionId: string) {
  await ensureBookingsTable();
  await ensureCustomersTables();

  const [b] = await sql<{
    id: number;
    payment_status: string;
    contact_first_name: string;
    contact_last_name: string | null;
    contact_email: string | null;
    contact_phone: string;
  }[]>`
    SELECT id, payment_status, contact_first_name, contact_last_name, contact_email, contact_phone
    FROM bookings
    WHERE stripe_session_id = ${sessionId}
    LIMIT 1
  `;
  if (!b) return { ok: false as const, reason: 'booking_not_found' as const };
  if (b.payment_status !== 'paid') return { ok: false as const, reason: 'not_paid' as const };

  const fullName = `${b.contact_first_name} ${b.contact_last_name ?? ''}`.trim();
  const up = await upsertCustomerFromPaidIdentity({
    fullName,
    email: b.contact_email,
    phone: b.contact_phone,
    sourceType: 'booking',
    sourceId: String(b.id),
  });

  if (!up.customerId) {
    // Still store snapshots for audit; don't auto-link.
    await sql`
      UPDATE bookings
      SET
        customer_name_snapshot = ${fullName},
        customer_email_snapshot = ${b.contact_email},
        customer_phone_snapshot = ${b.contact_phone}
      WHERE id = ${b.id}::bigint
    `;
    return { ok: false as const, reason: up.status };
  }

  await sql`
    UPDATE bookings
    SET
      customer_id = ${up.customerId},
      customer_name_snapshot = ${fullName},
      customer_email_snapshot = ${b.contact_email},
      customer_phone_snapshot = ${b.contact_phone}
    WHERE id = ${b.id}::bigint
  `;

  await refreshCustomerAggregates(up.customerId);
  return { ok: true as const, customerId: up.customerId, bookingId: String(b.id), linkStatus: up.status };
}

export async function linkPaidOrderToCustomerBySession(sessionId: string) {
  await ensureOrdersTable();
  await ensureCustomersTables();

  const [o] = await sql<{
    id: number;
    status: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
  }[]>`
    SELECT id, status, customer_name, customer_email, customer_phone
    FROM orders
    WHERE stripe_session_id = ${sessionId}
    LIMIT 1
  `;
  if (!o) return { ok: false as const, reason: 'order_not_found' as const };
  if (o.status !== 'paid') return { ok: false as const, reason: 'not_paid' as const };

  const up = await upsertCustomerFromPaidIdentity({
    fullName: o.customer_name,
    email: o.customer_email,
    phone: o.customer_phone,
    sourceType: 'order',
    sourceId: String(o.id),
  });

  if (!up.customerId) {
    await sql`
      UPDATE orders
      SET
        customer_name_snapshot = ${o.customer_name},
        customer_email_snapshot = ${o.customer_email},
        customer_phone_snapshot = ${o.customer_phone}
      WHERE id = ${o.id}::bigint
    `;
    return { ok: false as const, reason: up.status };
  }

  await sql`
    UPDATE orders
    SET
      customer_id = ${up.customerId},
      customer_name_snapshot = ${o.customer_name},
      customer_email_snapshot = ${o.customer_email},
      customer_phone_snapshot = ${o.customer_phone}
    WHERE id = ${o.id}::bigint
  `;

  await refreshCustomerAggregates(up.customerId);
  return { ok: true as const, customerId: up.customerId, orderId: String(o.id), linkStatus: up.status };
}

export async function linkPaidBookingToCustomerByPaymentIntent(paymentIntentId: string) {
  await ensureBookingsTable();
  const [row] = await sql<{ stripe_session_id: string | null }[]>`
    SELECT stripe_session_id
    FROM bookings
    WHERE stripe_payment_intent_id = ${paymentIntentId}
    LIMIT 1
  `;
  if (row?.stripe_session_id) {
    return await linkPaidBookingToCustomerBySession(row.stripe_session_id);
  }
  return { ok: false as const, reason: 'booking_not_found' as const };
}

export async function linkPaidOrderToCustomerByPaymentIntent(paymentIntentId: string) {
  await ensureOrdersTable();
  const [row] = await sql<{ stripe_session_id: string | null }[]>`
    SELECT stripe_session_id
    FROM orders
    WHERE stripe_payment_intent_id = ${paymentIntentId}
    LIMIT 1
  `;
  if (row?.stripe_session_id) {
    return await linkPaidOrderToCustomerBySession(row.stripe_session_id);
  }
  return { ok: false as const, reason: 'order_not_found' as const };
}

export async function linkPaidBookingToCustomerByBookingId(bookingId: string) {
  await ensureBookingsTable();
  const [row] = await sql<{ stripe_session_id: string | null; stripe_payment_intent_id: string | null }[]>`
    SELECT stripe_session_id, stripe_payment_intent_id
    FROM bookings
    WHERE id = ${bookingId}::bigint
    LIMIT 1
  `;
  if (row?.stripe_session_id) return await linkPaidBookingToCustomerBySession(row.stripe_session_id);
  if (row?.stripe_payment_intent_id) return await linkPaidBookingToCustomerByPaymentIntent(row.stripe_payment_intent_id);
  return { ok: false as const, reason: 'booking_not_found' as const };
}

export async function linkPaidOrderToCustomerByOrderId(orderId: string) {
  await ensureOrdersTable();
  const [row] = await sql<{ stripe_session_id: string | null; stripe_payment_intent_id: string | null }[]>`
    SELECT stripe_session_id, stripe_payment_intent_id
    FROM orders
    WHERE id = ${orderId}::bigint
    LIMIT 1
  `;
  if (row?.stripe_session_id) return await linkPaidOrderToCustomerBySession(row.stripe_session_id);
  if (row?.stripe_payment_intent_id) return await linkPaidOrderToCustomerByPaymentIntent(row.stripe_payment_intent_id);
  return { ok: false as const, reason: 'order_not_found' as const };
}

