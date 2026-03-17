# Stripe Webhook Architecture - Design Specification

## 1. Executive Summary

**Goal**: Make Stripe the source of truth for payment confirmation, eliminating the need for manual/admin confirmation.

**Current State**:
- Bookings/orders are created with `paymentStatus: 'pending'`
- Stripe Checkout sessions are created with metadata linking to internal records
- Payment confirmation relies on `/api/stripe/confirm` endpoint (now admin-protected)
- Manual admin intervention required to mark payments as paid

**Target State**:
- Stripe webhooks automatically mark bookings/orders as paid upon `checkout.session.completed`
- `/api/stripe/confirm` becomes emergency fallback only
- Idempotent processing prevents duplicate payments

---

## 2. Architecture Overview

### 2.1 Event Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌────────────┐
│   Customer  │────▶│  Checkout    │────▶│     Stripe      │────▶│  Webhook   │
│             │     │   Flow       │     │   Processing    │     │  Handler   │
└─────────────┘     └──────────────┘     └─────────────────┘     └─────┬──────┘
                                                                       │
                    ┌──────────────────────────────────────────────────┘
                    ▼
            ┌───────────────┐     ┌──────────────┐     ┌────────────────┐
            │  Verify Sig   │────▶│  Parse Event │────▶│ Update Records │
            │  (Security)   │     │              │     │   (Idempotent) │
            └───────────────┘     └──────────────┘     └────────────────┘
```

### 2.2 File Structure

```
src/
├── lib/
│   ├── stripe-webhook.ts       # NEW: Webhook signature verification
│   ├── stripe-events.ts        # NEW: Event type handlers
│   └── ...
├── app/api/
│   ├── stripe/
│   │   ├── webhook/
│   │   │   └── route.ts        # NEW: Main webhook endpoint
│   │   └── confirm/
│   │       └── route.ts        # MODIFIED: Emergency fallback only
│   └── ...
└── ...
```

---

## 3. Route Responsibilities

### 3.1 NEW: `/api/stripe/webhook/route.ts`

**Purpose**: Receive and process Stripe webhook events

**Responsibilities**:
1. Verify Stripe signature (raw body required)
2. Parse event type
3. Dispatch to appropriate handler
4. Return 200 OK to Stripe (prevent retries)
5. Log processing results

**Security**:
- Signature verification using `STRIPE_WEBHOOK_SECRET`
- Raw request body required for verification
- Rate limiting (existing)

### 3.2 MODIFIED: `/api/stripe/confirm/route.ts`

**Purpose**: Emergency/manual fallback only

**Responsibilities**:
- Admin authentication required (already implemented)
- Should only be used when webhook fails
- Log when used for audit trail

**Note**: Should display warning in admin UI when used

---

## 4. Database Schema Changes

### 4.1 Bookings Table

**New Columns**:
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
```

### 4.2 Orders Table

**New Columns**:
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
```

### 4.3 NEW: Webhook Events Table (for idempotency)

```sql
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,  -- Stripe's event ID
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. Event Handling Flow

### 5.1 Primary Event: `checkout.session.completed`

**Processing Steps**:

1. **Verify signature** - Use raw body + webhook secret
2. **Check idempotency** - Query `stripe_webhook_events` for event_id
   - If exists: Return 200 (already processed)
   - If not: Continue
3. **Extract metadata** - Read `booking_id`, `order_id`, `flow` from session
4. **Update booking** (if applicable):
   - `UPDATE bookings SET payment_status = 'paid', paid_at = NOW() WHERE stripe_session_id = ?`
5. **Update order** (if applicable):
   - `UPDATE orders SET status = 'paid', paid_at = NOW() WHERE stripe_session_id = ?`
6. **Record event** - Insert into `stripe_webhook_events`
7. **Return 200** - Acknowledge to Stripe

### 5.2 Secondary Events to Handle

| Event Type | Action | Priority |
|------------|--------|----------|
| `checkout.session.completed` | Mark as paid | **P0** |
| `checkout.session.expired` | Mark as failed/expired | **P1** |
| `payment_intent.payment_failed` | Mark as failed | **P1** |
| `charge.refunded` | Handle refund | P2 |

---

## 6. Implementation Order (Safest)

### Phase 1: Infrastructure (Low Risk)
1. Add `stripe-webhook.ts` utility with signature verification
2. Add database columns (backward compatible)
3. Create webhook endpoint that logs but doesn't process

### Phase 2: Core Processing (Medium Risk)
4. Add idempotency table
5. Implement `checkout.session.completed` handler
6. Test webhook locally using Stripe CLI

### Phase 3: Production Cutover (Higher Risk)
7. Configure webhook URL in Stripe Dashboard
8. Monitor processing in production
9. Update admin UI to show webhook status

### Phase 4: Cleanup (Low Risk)
10. Deprecate `/api/stripe/confirm` in favor of webhooks
11. Remove admin fallback from normal flow

---

## 7. Required Schema Changes

### 7.1 bookings table
```sql
-- Add to src/lib/bookings.ts ensureBookingsTableInternal()
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
```

### 7.2 orders table
```sql
-- Add to src/lib/orders.ts ensureOrdersTableInternal()
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
```

### 7.3 NEW stripe_webhook_events table
```sql
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON stripe_webhook_events(event_id);
```

---

## 8. Affected Files

### New Files
| File | Purpose |
|------|---------|
| `src/lib/stripe-webhook.ts` | Signature verification, raw body handling |
| `src/lib/stripe-events.ts` | Event handlers for each Stripe event type |
| `src/app/api/stripe/webhook/route.ts` | Main webhook endpoint |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/stripe.ts` | Export webhook utilities |
| `src/lib/bookings.ts` | Add paid_at, payment_method fields |
| `src/lib/orders.ts` | Add payment_method field |
| `src/app/api/stripe/confirm/route.ts` | Add deprecation warning, emergency-only flag |

---

## 9. Environment Variables Required

```env
# Existing
STRIPE_SECRET_KEY=sk_...

# NEW
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe Dashboard
```

---

## 10. Rollback Plan

### If Webhook Fails:
1. Keep `/api/stripe/confirm` functional as fallback
2. Admin can manually mark payments as paid
3. Logs will show webhook failures for debugging

### If Duplicate Processing:
1. Idempotency table prevents double-processing
2. Even if race condition occurs, same event_id is rejected

### If Database Issues:
1. All schema changes are `ADD COLUMN IF NOT EXISTS` - safe to re-run
2. Webhook endpoint can be disabled without breaking checkout flow

---

## 11. Remaining Risks

| Risk | Mitigation |
|------|------------|
| Webhook delivery delays | Use webhook as primary, keep confirm as backup |
| Signature verification failure | Log failures, use Stripe CLI for testing |
| Event ordering | Handle `checkout.session.completed` idempotently |
| Cold start issues | Ensure webhook endpoint is pre-warmed |
| Debug mode differences | Test with actual Stripe events, not mocked |

---

## 12. Testing Checklist

- [ ] Signature verification works with real Stripe events
- [ ] `checkout.session.completed` marks booking as paid
- [ ] `checkout.session.completed` marks order as paid  
- [ ] Duplicate events don't cause double-processing
- [ ] Failed payment events update status correctly
- [ ] Admin can still use fallback when webhook fails
- [ ] Stripe retries on non-200 response (but we return 200)
- [ ] Webhook works with both booking and cart flows
