-- 005_booking.sql
-- Booking content and add-ons tables

-- Booking content (helper texts for booking flow)
CREATE TABLE IF NOT EXISTS booking_content (
    key TEXT PRIMARY KEY,
    locale TEXT NOT NULL CHECK (locale IN ('et', 'en')),
    content TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(key, locale)
);

-- Booking add-ons table
CREATE TABLE IF NOT EXISTS booking_addons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_et TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description TEXT DEFAULT '',
    description_et TEXT DEFAULT '',
    description_en TEXT DEFAULT '',
    duration INTEGER NOT NULL DEFAULT 0,
    price INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_addons_active ON booking_addons(active);
