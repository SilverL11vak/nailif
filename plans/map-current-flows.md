# Current Slot / Booking / Pricing Flows (Pre-hardening)

This document summarizes the *current* slot availability + booking + pricing + Stripe payment flows, including the existing status rules that drive which slots appear as `available`.

Scope:
- `/api/slots` query parameters + the server-side `available` computation
- Booking checkout payload shape + how `/api/bookings/checkout` inserts bookings/orders
- Stripe webhook transitions for `checkout.session.*`

Last reviewed: 2026-03-19

---

## 1) Data model (what “slot status” means today)

### `time_slots` (base availability + metadata)
Stored in `time_slots` (see `migrations/004_slots.sql` / `src/lib/slots.ts`):
- `available` (boolean): whether the slot is administratively open
- `capacity` (int): present, but **availability overlay is binary** (see below)
- `is_sos` (boolean) + `sos_surcharge` + `sos_label`: whether the slot is SOS and its surcharge/label
- `slot_date` (date) + `slot_time` (text)

### `bookings` (what blocks a slot)
Stored in `bookings` (see `migrations/001_initial_schema.sql` / `src/lib/bookings.ts`):
- `status` (text): examples in code: `pending_payment`, `confirmed`, `cancelled`
- `payment_status` (text): `unpaid`, `pending`, `paid`, `failed`
- `slot_date` + `slot_time`: identifies which slot is reserved/owned by the booking

### The effective “availability” rule exposed to clients
The `/api/slots` response includes a boolean field `available` for each slot.

Today, that field is computed (in `src/lib/slots.ts`) as:
`slot.available = time_slots.available AND NOT EXISTS (bookings b WHERE b.slot_date/time match AND b.status <> 'cancelled')`

Key implications:
- Any booking whose `status` is **not** `cancelled` blocks the slot:
  - includes `pending_payment` reservations created at checkout start
  - includes `confirmed` paid bookings
- `capacity` is not used to decide whether a slot is available; the overlay is effectively “one booking (any non-cancelled status) => unavailable”.
- SOS is an attribute (`is_sos`), not a separate availability state:
  - clients treat SOS as available slots with extra surcharge (see pricing).

---

## 2) `/api/slots` (parameters + response shape)

Implemented in `src/app/api/slots/route.ts`.

### Common parameters
- `admin=1`
  - Requires an admin user cookie (`getAdminFromCookies()`).
  - When `admin` is true, the API returns the richer dataset (including unavailable slots in some query modes).
- `lang=<et|en>`
  - Locale selection for `smart` mode + for future content usage.
- `smart=1`
  - Enables the server-side “smart scoring” / recommended ordering:
    - loads booking content from `booking_content` (via `ensureBookingContentTables()` + `listBookingContent(locale)`)
    - uses settings like `smart_settings_urgency_boost`, `smart_settings_reorder`, `smart_settings_gap_sensitivity`
  - Adds fields:
    - `smartScore`, `smartReason`, `isRecommended`, etc. (computed in `enrichSmartSlots`)
  - Also affects *which slots are returned* for range/date queries (because of `includeUnavailable: admin || smart` in the shared listing logic).
- `serviceDuration=<minutes>`
  - Used only for `smart=1` scoring (`preferredDuration` drives “best-fit” scoring).

### Availability query modes
Only one of these modes is used per request.

1. `upcoming=1&limit=<n>`
   - Calls `listUpcomingAvailableSlots(limit)` in `src/lib/slots.ts`
   - Returns only slots that are:
     - `time_slots.available = TRUE`
     - in the future in Europe/Tallinn (date/time compared to “now”)
     - and with **no** non-cancelled booking for that slot
   - Response:
     - `slots`: mapped slots (typically all have `available: true`)
     - `recommendedTimes`: same as `recommended` only when `smart=1` (but `upcoming` mode uses `enrichSmartSlots` only if `smart=1`)
     - for non-admin requests: `Cache-Control: no-store`

2. `date=<YYYY-MM-DD>`
   - Calls `listSlotsForDate(date, includeUnavailable = admin || smart)` in `src/lib/slots.ts`
   - Response includes computed `available` for each returned slot.

3. `from=<YYYY-MM-DD>&to=<YYYY-MM-DD>`
   - Calls `listSlotsInRange({ from, to, includeUnavailable: admin || smart })`

4. `days=<n>` (default 7)
   - Computes a range from “now” to now + (days-1)
   - Calls `listSlotsInRange` for that date range with `includeUnavailable: admin || smart`

### Response shape
All modes return JSON:
```ts
{
  ok: true,
  slots: TimeSlot[],
  recommendedTimes: TimeSlot[]
}
```
For non-admin requests, the handler sets `Cache-Control: no-store` to reduce stale availability.

---

## 3) Server-side slot eligibility computation (status rules)

Implemented in `src/lib/slots.ts`.

### `listUpcomingAvailableSlots(limit)`
SQL conditions:
- `FROM time_slots`
- `WHERE available = TRUE`
- and `(slot_date > today OR (slot_date = today AND slot_time > currentTime))`
  - “today” and “currentTime” are calculated in Europe/Tallinn
- and `NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_date/time match AND b.status <> 'cancelled')`
- ordered and limited

Result:
- Returned `slots` are “bookable” for the UI: their `available` should always be `true`.

### `listSlotsInRange({ from, to, includeUnavailable })`
Two query branches:

1) `includeUnavailable: true`
- returns all `time_slots` rows in the range
- computes:
  - `(available AND NOT EXISTS(non-cancelled booking)) AS available`

2) `includeUnavailable: false`
- filters to:
  - `available = TRUE`
  - and `NOT EXISTS(non-cancelled booking)`

Result:
- For `includeUnavailable: true`, clients/admin can see blocked slots too, but with `available: false`.
- In both branches, **any non-cancelled booking blocks the slot** (binary overlay).

---

## 4) Client-side “slot status” interpretation (UI business logic)

Even though `/api/slots` computes `available`, the UI still applies extra logic for *which* time it selects/labels as “next”.

### Homepage quick booking widget
File: `src/components/booking/HeroBookingWidget.tsx`

Flow:
1. Fetch: `GET /api/slots?upcoming=1&limit=1` (no-store)
2. It further filters on the client: `(data.slots ?? []).filter(slot => slot.available)`
3. It computes the “next slot” with `resolveEarliestUpcomingSlot(availableSlots)`:
   - `resolveEarliestUpcomingSlot` filters again by Europe/Tallinn:
     - keeps dates after “today”, or same-day times where `slot.time > currentTime`
   - sorts deterministically (date asc, then time asc)

Important note:
- “SOS-ness” (`isSos`) is not used to decide eligibility here; it’s only used later for pricing.

### Booking flow time picker (Step 2)
File: `src/components/booking/DateTimeStep.tsx`

Flow:
1. Fetches a broad window:
   - `GET /api/slots?from=<today>&to=<today+60days>&smart=1&serviceDuration=<...>`
   - because `smart=1`, the server uses `includeUnavailable: admin || smart` which means the response may include unavailable slots for today (and does not specifically filter out past times unless the `upcoming` mode is used).
2. It groups results by `slot.date`.
3. Initial selection logic (no DB round-trip):
   - if URL `time=<HH:MM>` matches an *available* slot => pre-select it
   - else if an existing selected slot is available => keep it
   - else => selects `firstAvailable = daySlots.find(slot => slot.available)`
   - this selection logic does not do an explicit “skip past times for today” check; it depends on what the server returned and what the UI already has selected.

Reservation lock (UI-only):
- The Step 2 UI starts a 5-minute countdown using `localStorage`/state.
- It does **not** create/cancel bookings in the DB; it’s only a UX deterrent.

---

## 5) Admin slot status mapping (for completeness)

File: `src/app/admin/slots/page.tsx`

Admin fetches:
- `GET /api/slots?admin=1&from=<today>&to=<today+45>`
- `GET /api/bookings?limit=500&compact=1`
  - then filters out bookings with `status === 'cancelled'`.

Slot visual states (computed client-side):
- if there is a booking in `bookedMap` => `booked`
- else if `slot.available && slot.isSos` => `sos`
- else if `slot.available` => `free`
- else => `blocked`

UI enforcement:
- Admin disables toggling for times present in `bookedMap` (non-cancelled bookings).

---

## 6) Pricing flow (current behavior)

### Total price/duration (client-authoritative today)
File: `src/store/booking-store.ts`

`calculateTotals()`:
1. base:
   - `price = selectedService.price`
   - `duration = selectedService.duration`
2. add-ons:
   - for each `selectedAddOn` where `addOn.selected` is true:
     - `price += addOn.price`
     - `duration += addOn.duration`
3. SOS surcharge:
   - if `selectedSlot?.isSos` and `selectedSlot.sosSurcharge` is set:
     - `price += selectedSlot.sosSurcharge`
4. writes:
   - `totalPrice` and `totalDuration` into zustand store

### Deposit charged now (server-authoritative)
File: `src/app/api/bookings/checkout/route.ts`

Deposit constant:
- `BOOKING_DEPOSIT_EUR = 10`

Stripe is charged only for this deposit amount (not the full `totalPrice`).

---

## 7) `POST /api/bookings/checkout` (payload + what it does today)

File: `src/app/api/bookings/checkout/route.ts`

### Payload shape sent by the UI

Guided booking (ConfirmStep)
File: `src/components/booking/ConfirmStep.tsx`
```json
{
  "source": "guided",
  "service": <Service>,
  "slot": <TimeSlot>,
  "contact": <ContactInfo>,
  "addOns": <AddOn[]>, 
  "totalPrice": <number>,
  "totalDuration": <number>
}
```
- `addOns` is `selectedAddOns.filter(addOn => addOn.selected)` (so it includes add-ons with `selected: true`).

Fast booking (FastBookingSheet)
File: `src/components/booking/FastBookingSheet.tsx`
```json
{
  "source": "fast",
  "service": <Service>,
  "slot": <TimeSlot>,
  "contact": <ContactInfo>,
  "addOns": [],
  "totalPrice": service.price,
  "totalDuration": service.duration
}
```

### Server validation (current)
The handler validates only basic shape:
- `data.service`, `data.slot`, `data.contact` must exist
- `data.addOns` must be an array
- `totalPrice` and `totalDuration` must be numbers
- `source` must be `guided` or `fast`

It does **not**:
- re-check slot eligibility (`slot.available`)
- recompute totals from service/add-ons/SOS
- verify that the slot is not already booked by a non-cancelled booking

### What the server writes to DB
It inserts a booking with:
- `status = 'pending_payment'`
- `payment_status = 'pending'`
- `deposit_amount = 10`
- it uses the client-provided:
  - `totalPrice`
  - `totalDuration`

Then it creates an `orders` row of type `booking_deposit` for the same deposit amount (`amountTotal = 10`).

### Stripe Checkout session creation
It creates a `stripe.checkout.sessions.create(...)` session with:
- `mode: 'payment'`, `submit_type: 'book'`
- `line_items` charging exactly 10 EUR
- `metadata`:
  - `flow: 'booking_deposit'`
  - `booking_id: <booking.id>`
  - `order_id: <orderId>`
- `success_url` includes:
  - `/success?type=booking&session_id={CHECKOUT_SESSION_ID}`
- `cancel_url` sends:
  - `/book?payment=cancelled`

Response to the client:
- `checkoutUrl: session.url` and `bookingId`

---

## 8) Stripe webhook transitions (what changes today)

Handler: `src/app/api/stripe/webhook/route.ts`
Utilities: `src/lib/stripe-webhook.ts`, `src/lib/bookings.ts`, `src/lib/orders.ts`

### Security + idempotency
- Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
- Idempotency:
  - `isEventProcessed(event.id)` checks `stripe_webhook_events.event_id`
  - after processing, it records:
    - `recordProcessedEvent(event.id, event.type)`

### `checkout.session.completed`
Transition logic:
1. `parseCheckoutMetadata(session)` reads:
   - `booking_id` and `order_id` from `session.metadata`
2. extracts `paymentIntentId` from `session.payment_intent`
3. If `metadata.bookingId` exists:
   - `markBookingPaidFromWebhook(session.id, paymentIntentId)`
   - updates:
     - `bookings.payment_status = 'paid'`
     - `bookings.status = 'confirmed'`
     - sets `paid_at = NOW()`
     - sets `stripe_payment_intent_id`
     - `payment_method` is passed as undefined in the current code path
4. If `metadata.orderId` exists:
   - `markOrderPaidFromWebhook(session.id, paymentIntentId)`
   - updates:
     - `orders.status = 'paid'`
     - `orders.paid_at = NOW()`

Important matching detail:
- `markBookingPaidFromWebhook` and `markOrderPaidFromWebhook` both update using `WHERE stripe_session_id = <session.id>`.
- So the metadata IDs are mainly used to decide whether to attempt updates, not to directly identify records.

### `checkout.session.expired`
Current behavior:
- The handler only logs:
  - `console.log('Checkout session expired: ...')`
- It does **not** cancel/update bookings or orders.

Resulting impact with the current slot overlay:
- since slot availability blocks any booking with `status <> 'cancelled'`,
- a booking created at checkout start with `status = 'pending_payment'` remains non-cancelled,
- so the slot can remain unavailable indefinitely when Stripe expires the checkout session.

### `payment_intent.payment_failed`
Current behavior:
- Logged/acknowledged only; no booking/order state update is performed in the current webhook route.

---

## 9) Current status rules summary (one place)

1. Slot `available` served by `/api/slots`
   - base: `time_slots.available`
   - overlay blocks: any `bookings` row for the same slot where `bookings.status <> 'cancelled'`

2. Client booking eligibility for “available” selection
   - UI uses `slot.available` from `/api/slots`
   - additional “upcoming time” filtering is applied only in some UI components:
     - Hero widget uses `resolveEarliestUpcomingSlot`
     - Step 2’s initial selection uses `daySlots.find(slot => slot.available)` without explicit “past times” filtering.

3. Checkout reservation/book state
   - `POST /api/bookings/checkout` immediately inserts:
     - `bookings.status = 'pending_payment'`
     - `bookings.payment_status = 'pending'`
   - No server-side slot re-check is performed in the checkout route today.

4. Stripe webhook state transitions
   - `checkout.session.completed`:
     - booking/order marked as paid/confirmed
   - `checkout.session.expired`:
     - no booking/order cancellation (currently)

