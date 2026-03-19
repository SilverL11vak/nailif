-- 012_service_variants.sql
-- Sub-services (variants) per main service: price, duration, deposit, order, active.

-- Variants table: one row per bookable variant under a service.
CREATE TABLE IF NOT EXISTS service_variants (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_et TEXT,
    name_en TEXT,
    price INTEGER NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 45,
    deposit_amount INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_variants_service_id ON service_variants(service_id);
CREATE INDEX IF NOT EXISTS idx_service_variants_active_order ON service_variants(service_id, is_active, order_index);

-- Bookings: optional link to variant (when present, service_name/price/duration come from variant).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_variant_id TEXT REFERENCES service_variants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_service_variant_id ON bookings(service_variant_id);
