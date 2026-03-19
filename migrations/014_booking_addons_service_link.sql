-- 014_booking_addons_service_link.sql
-- Link booking add-ons to a specific main service.

ALTER TABLE booking_addons
  ADD COLUMN IF NOT EXISTS service_id TEXT;

CREATE INDEX IF NOT EXISTS idx_booking_addons_service_active_sort
  ON booking_addons(service_id, active, sort_order);
