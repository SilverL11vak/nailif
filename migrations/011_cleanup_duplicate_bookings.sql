-- 011_cleanup_duplicate_bookings.sql
-- Booking uniqueness hardening prerequisite:
-- cancel duplicates so we can add a unique constraint for non-cancelled bookings.
--
-- Rule:
-- For each (slot_date, slot_time), keep only the "best" non-cancelled booking and
-- mark the rest as cancelled.
--
-- Priority:
--   1) payment_status = 'paid'
--   2) status = 'completed'
--   3) anything else (pending_payment/confirmed/etc.)
--
-- Within the same priority, keep the newest by created_at.

WITH ranked AS (
  SELECT
    id,
    slot_date,
    slot_time,
    status,
    payment_status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY slot_date, slot_time
      ORDER BY
        CASE
          WHEN payment_status = 'paid' THEN 0
          WHEN status = 'completed' THEN 1
          ELSE 2
        END,
        created_at DESC
    ) AS rn
  FROM bookings
  WHERE status <> 'cancelled'
),
to_cancel AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
UPDATE bookings
SET status = 'cancelled',
    payment_status = 'failed'
WHERE id IN (SELECT id FROM to_cancel);

