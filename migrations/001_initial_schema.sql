-- 001_initial_schema.sql
-- Core tables: customers, bookings, orders
-- This migration creates the foundational tables for the Nailify system

-- Enable UUID extension for analytics
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Migrations tracking table (created by migrate.ts, but included here for reference)
-- CREATE TABLE IF NOT EXISTS __migrations (
--   id VARCHAR(10) PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT,
    email_normalized TEXT,
    phone TEXT,
    phone_normalized TEXT,
    preferred_language TEXT CHECK (preferred_language IN ('et', 'en')),
    marketing_opt_in BOOLEAN DEFAULT false,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    trust_score INTEGER DEFAULT 0,
    lifetime_value_cents INTEGER DEFAULT 0,
    total_paid_bookings INTEGER DEFAULT 0,
    total_paid_orders INTEGER DEFAULT 0,
    total_paid_cents INTEGER DEFAULT 0,
    first_paid_at TIMESTAMPTZ,
    last_paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Customer identity conflicts table
CREATE TABLE IF NOT EXISTS customer_identity_conflicts (
    id BIGSERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    conflict_type TEXT NOT NULL,
    original_value TEXT NOT NULL,
    merged_value TEXT NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL CHECK (source IN ('guided', 'fast')),
    status TEXT NOT NULL DEFAULT 'confirmed',
    service_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    service_duration INTEGER NOT NULL,
    service_price INTEGER NOT NULL,
    slot_id TEXT NOT NULL,
    slot_date DATE NOT NULL,
    slot_time TEXT NOT NULL,
    contact_first_name TEXT NOT NULL,
    contact_last_name TEXT,
    contact_phone TEXT NOT NULL,
    contact_email TEXT,
    contact_notes TEXT,
    inspiration_image TEXT,
    current_nail_image TEXT,
    inspiration_note TEXT,
    add_ons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_price INTEGER NOT NULL,
    total_duration INTEGER NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed')),
    deposit_amount INTEGER NOT NULL DEFAULT 0,
    stripe_session_id TEXT,
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    stripe_payment_intent_id TEXT,
    customer_id TEXT REFERENCES customers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_slot_date ON bookings(slot_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    order_type TEXT NOT NULL CHECK (order_type IN ('booking_deposit', 'product_purchase')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'failed')),
    amount_total INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'eur',
    stripe_session_id TEXT UNIQUE,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    booking_id BIGINT REFERENCES bookings(id),
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    stripe_payment_intent_id TEXT,
    manually_reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMPTZ,
    reconciled_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_booking ON orders(booking_id);
