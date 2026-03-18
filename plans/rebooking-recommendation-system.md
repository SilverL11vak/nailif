# Rebooking Recommendation System - Technical Design

## Overview

Design a lightweight rebooking recommendation system for Nailify that suggests ideal follow-up appointment dates after a completed booking. The system should be simple, require no full account system, and be extensible for future reminder features.

---

## 1. Where Interval Rules Should Live

### Recommendation: **Add `rebook_interval_days` field to existing `services` table**

**Rationale:**
- Services already have `category`, `duration`, and `price` fields
- Interval rules are inherently tied to service type (manicure = 2-3 weeks, pedicure = 4-6 weeks, etc.)
- Keeps all service metadata in one place
- Easy for admin to edit alongside other service properties
- Single source of truth - no sync needed between tables

### Schema Addition

```sql
-- Add to existing services table (migration)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS rebook_interval_days INTEGER DEFAULT 21,
ADD COLUMN IF NOT EXISTS rebook_interval_min_days INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS rebook_interval_max_days INTEGER DEFAULT 28;
```

### Default Values by Category

| Category | Min Days | Default Days | Max Days |
|----------|----------|--------------|----------|
| manicure | 14 | 21 | 28 |
| pedicure | 28 | 42 | 56 |
| extensions | 14 | 21 | 28 |
| nail-art | 14 | 21 | 28 |

### Admin Interface

- Add field to existing services admin page (`/admin/services`)
- Allow override per-service for customization
- Default values auto-populate based on category

---

## 2. How Recommendations Should Be Stored

### Option A: Session-Based (Recommended for v1)
- Store last booking info in session cookie
- Calculate recommendation on-the-fly when success page loads
- No persistent storage needed
- Works for anonymous users

### Option B: Customer Table with Email (v2)
- If customer provides email, store in `customers` table
- Link booking to customer record
- Enable future reminder capabilities

### Recommendation: **Hybrid Approach (Phased)**

**Phase 1 (Current):** Session-based calculation
- Store: `session.booking_history` (array of {serviceId, bookedAt, recommendedRebookDate})
- Calculate on success page render

**Phase 2 (With email capture):**
- Store: `customers.recent_services` (JSONB array)
- Enable: Email reminders when due

### Data Flow

```
Booking Completed
    ↓
Store in Session: { serviceId, completedAt, rebookBy }
    ↓
Success Page Load
    ↓
Read from Session → Calculate next optimal date
    ↓
Display: "Your next visit: [date] for [service]"
```

### Session Storage Structure

```typescript
interface BookingHistory {
  serviceId: string;
  serviceName: string;
  completedAt: Date;        // When booking was completed
  rebookMinDate: Date;     // Earliest recommended date
  rebookOptimalDate: Date;  // Ideal follow-up date
  rebookMaxDate: Date;      // Latest recommended date
}
```

---

## 3. Success Page Integration

### Current State (Already Has Some)
The success page already has:
- `maintenanceTitle`: "Plan your next visit"
- `maintenanceHelper`: "Many clients rebook 3–4 weeks ahead."
- `recommendedMaintenanceSlots`: TimeSlot[]

### Proposed Enhancement

**New Component: `RebookingRecommendation`**

```tsx
interface RebookingRecommendationProps {
  lastServiceId: string;
  lastServiceName: string;
  completedAt: Date;
  onBookNext: () => void;
  onSkip: () => void;
}
```

### UI Design

```
┌─────────────────────────────────────────┐
│  ✨ Your nails look best for 3-4 weeks  │
│                                         │
│  Based on your [Service Name],          │
│  we recommend scheduling your next     │
│  visit around [Optimal Date].            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │    Reserve next appointment     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Not now]                              │
└─────────────────────────────────────────┘
```

### Integration Points

1. **On booking completion** - Calculate and store in session
2. **On success page** - Read from session, display recommendation
3. **Smart date selection** - Pre-select next available slot at optimal date

### Implementation Steps

1. Update session store to track booking history
2. Add calculation logic in `/api/booking-complete` endpoint
3. Create `RebookingRecommendation` component
4. Integrate into success page (already has placeholder section)
5. Add "Book Next" quick action that pre-fills service

---

## 4. Keeping It Simple Without Full Accounts

### Design Principles

1. **No authentication required** - Works for anonymous visitors
2. **Session-based** - Data persists only until session expires
3. **Cookie-based** - 30-day cookie stores booking history
4. **Opt-in email** - Only capture if user volunteers

### Session Strategy

```
Session Cookie: nailify_session
├── booking_history: [
│   {
│     serviceId: "manicure-001",
│     completedAt: "2024-01-15T10:00:00Z",
│     rebookBy: "2024-02-05T10:00:00Z"
│   }
│ ]
└── last_booking: { ... }
```

### Cookie Settings
- **Max age:** 30 days (allows for follow-up recommendations)
- **HttpOnly:** false (needed for client-side reading)
- **SameSite:** Lax (works across site navigation)

### Limitation Handling

- If session expires, show generic "Book your next visit" prompt
- If user clears cookies, no history (graceful degradation)
- Multiple services in one visit → use longest interval

---

## 5. Future Extensibility for Reminders

### Architecture for Growth

```
┌─────────────────────────────────────────────────────┐
│                 REMINDER SYSTEM v2                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────┐  │
│  │  Capture   │───▶│  Store     │───▶│ Notify  │  │
│  │  Email     │    │  Customer  │    │  Email  │  │
│  └─────────────┘    └─────────────┘    └─────────┘  │
│                           │                         │
│                           ▼                         │
│                    ┌─────────────┐                  │
│                    │ Reminder   │                  │
│                    │ Queue      │                  │
│                    └─────────────┘                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Phase 2 Features (Extensibility)

1. **Email Capture**
   - Add optional email field to booking flow
   - Store in `customers` table with booking history

2. **Scheduled Reminders**
   - Background job checks `reminder_queue` daily
   - Send email 3 days before optimal date
   - Include direct booking link with service pre-selected

3. **Admin Dashboard**
   - View upcoming rebookings
   - Manual reminder triggers
   - Analytics on rebooking rates

### Database Schema for v2

```sql
-- Customer rebooking preferences
CREATE TABLE customer_rebook_prefs (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  preferred_interval_days INTEGER DEFAULT 21,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminder queue (populated by scheduled job)
CREATE TABLE reminder_queue (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customer_rebook_prefs(id),
  service_id TEXT NOT NULL,
  original_booking_date DATE NOT NULL,
  optimal_date DATE NOT NULL,
  reminder_sent BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Backward Compatibility

- v1 (session-based) continues to work
- v2 adds on top without breaking existing flow
- Admin can enable/disable reminder features

---

## Summary

| Aspect | Decision |
|--------|----------|
| **Interval Rules** | Add to `services` table (rebook_interval_days) |
| **Storage** | Session-based (cookie) for v1, customer table for v2 |
| **Success Page** | Enhance existing maintenance section |
| **Accounts** | None required - session-based |
| **Reminders** | Built-in extensibility for email reminders v2 |

---

## Implementation Priority

1. **P0:** Add `rebook_interval_days` to services table
2. **P0:** Session storage for booking history
3. **P0:** Success page recommendation display
4. **P1:** Admin interface for interval configuration
5. **P2:** Email capture and reminder system
