-- Add index on bookings.created_at for faster ORDER BY queries
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
