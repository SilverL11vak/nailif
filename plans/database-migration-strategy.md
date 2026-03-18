# Database Migration Strategy - Simplified & Production-Ready

**Date:** 2026-03-18  
**System:** Nailify - Next.js + Neon PostgreSQL  
**Goal:** Replace runtime `CREATE TABLE IF NOT EXISTS` patterns with versioned migrations

---

## Current State

The codebase has **13 ensure functions** across 12 files that create tables at runtime:

| # | File | Function | Table(s) |
|---|------|----------|----------|
| 1 | [`src/lib/bookings.ts`](src/lib/bookings.ts) | `ensureBookingsTable()` | `bookings` |
| 2 | [`src/lib/catalog.ts`](src/lib/catalog.ts) | `ensureCatalogTables()` | `services`, `products` |
| 3 | [`src/lib/slots.ts`](src/lib/slots.ts) | `ensureSlotsTable()` | `time_slots` |
| 4 | [`src/lib/customers.ts`](src/lib/customers.ts) | `ensureCustomersTables()` | `customers` |
| 5 | [`src/lib/gallery.ts`](src/lib/gallery.ts) | `ensureGalleryTable()` | `gallery_images` |
| 6 | [`src/lib/homepage-media.ts`](src/lib/homepage-media.ts) | `ensureHomepageMediaTable()` | `homepage_media` |
| 7 | [`src/lib/feedback.ts`](src/lib/feedback.ts) | `ensureFeedbackTable()` | `feedback` |
| 8 | [`src/lib/orders.ts`](src/lib/orders.ts) | `ensureOrdersTable()` | `orders` |
| 9 | [`src/lib/booking-content.ts`](src/lib/booking-content.ts) | `ensureBookingContentTables()` | `booking_content`, `booking_addons` |
| 10 | [`src/lib/analytics.ts`](src/lib/analytics.ts) | `ensureAnalyticsTables()` | `booking_analytics_sessions`, `booking_analytics_events`, `booking_analytics_slot_clicks` |
| 11 | [`src/lib/funnel-analytics.ts`](src/lib/funnel-analytics.ts) | `ensureBookingFunnelEventsTable()` | `booking_funnel_events` |
| 12 | [`src/lib/admin-auth.ts`](src/lib/admin-auth.ts) | `ensureAdminTables()` | `admin_users`, `admin_sessions` |
| 13 | [`src/lib/stripe-webhook.ts`](src/lib/stripe-webhook.ts) | `ensureWebhookEventsTable()` | `stripe_webhook_events` |

---

## 1. Migration Folder Structure

```
migrations/
├── migrate.ts              # Migration runner (single file)
├── migrate.ps1            # Windows CLI entry
├── migrate.sh             # Unix CLI entry
├── 001_schema.sql         # Core tables (customers, bookings, orders)
├── 002_catalog.sql        # Services & Products
├── 003_content.sql       # Gallery, homepage_media, feedback
├── 004_slots.sql         # Time slots
├── 005_booking.sql       # Booking content & add-ons
├── 006_analytics.sql    # Analytics & funnel events
├── 007_admin.sql        # Admin users & sessions
├── 008_webhooks.sql     # Stripe webhook events
├── 009_seed_data.sql    # Initial seed data (services, products)
└── 010_migration_lock.sql # Lock table (migration tracking)
```

---

## 2. Migration Runner (Simplified)

```typescript
// migrations/migrate.ts
import { sql } from '../src/lib/db';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(__dirname);
const LOCK_TABLE = '__nailify_migrations';

async function ensureLockTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql(LOCK_TABLE)} (
      id VARCHAR(10) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getExecutedIds(): Promise<Set<string>> {
  try {
    const rows = await sql<{ id: string }>`SELECT id FROM ${sql(LOCK_TABLE)}`;
    return new Set(rows.map(r => r.id));
  } catch {
    return new Set();
  }
}

async function executeMigration(id: string, name: string): Promise<void> {
  console.log(`  ▶ Running: ${id} ${name}`);
  
  const filepath = join(MIGRATIONS_DIR, `${id}_${name}.sql`);
  const content = readFileSync(filepath, 'utf-8');
  
  // Split by GO separator for mssql/postgres compatibility
  // Or just execute as single statement
  await sql.unsafe(content);
  
  await sql`
    INSERT INTO ${sql(LOCK_TABLE)} (id, name) VALUES (${id}, ${name})
    ON CONFLICT (id) DO NOTHING
  `;
  
  console.log(`  ✓ Completed: ${id} ${name}`);
}

export async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...');
  
  // Use advisory lock to prevent concurrent runs
  const lockResult = await sql<{ acquired: boolean }>`
    SELECT pg_try_advisory_lock(1234567890) as acquired
  `;
  
  if (!lockResult[0].acquired) {
    console.error('❌ Migration already running in another process');
    process.exit(1);
  }
  
  try {
    await ensureLockTable();
    
    const executed = await getExecutedIds();
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => /^\d+_[a-z_]+\.sql$/.test(f))
      .sort();
    
    for (const file of files) {
      const id = file.split('_')[0];
      const name = file.slice(id.length + 1, -4);
      
      if (!executed.has(id)) {
        await executeMigration(id, name);
      }
    }
    
    console.log('✅ All migrations complete');
  } finally {
    // Release advisory lock
    await sql`SELECT pg_advisory_unlock(1234567890)`;
  }
}

// Run directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Migration failed:', err.message);
      process.exit(1);
    });
}
```

---

## 3. Migration Files

### 3.1 Core Schema (001_schema.sql)

```sql
-- 001_schema.sql
-- Core tables: customers, bookings, orders

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

-- Customer identity conflicts
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
```

### 3.2 Catalog (002_catalog.sql)

```sql
-- 002_catalog.sql
-- Services & Products

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_et TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description TEXT DEFAULT '',
    description_et TEXT DEFAULT '',
    description_en TEXT DEFAULT '',
    result_description TEXT DEFAULT '',
    result_description_et TEXT DEFAULT '',
    result_description_en TEXT DEFAULT '',
    longevity_description TEXT DEFAULT '',
    longevity_description_et TEXT DEFAULT '',
    longevity_description_en TEXT DEFAULT '',
    suitability_note TEXT DEFAULT '',
    suitability_note_et TEXT DEFAULT '',
    suitability_note_en TEXT DEFAULT '',
    duration INTEGER NOT NULL DEFAULT 45,
    price INTEGER NOT NULL DEFAULT 35,
    category TEXT NOT NULL CHECK (category IN ('manicure', 'pedicure', 'extensions', 'nail-art')),
    image_url TEXT,
    is_popular BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_sort ON services(sort_order);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_et TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description TEXT DEFAULT '',
    description_et TEXT DEFAULT '',
    description_en TEXT DEFAULT '',
    price INTEGER NOT NULL,
    image_url TEXT,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    category TEXT NOT NULL,
    category_et TEXT NOT NULL,
    category_en TEXT NOT NULL,
    stock INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
```

### 3.3 Content (003_content.sql)

```sql
-- 003_content.sql
-- Gallery, homepage media, feedback

-- Gallery images
CREATE TABLE IF NOT EXISTS gallery_images (
    id BIGSERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Homepage media
CREATE TABLE IF NOT EXISTS homepage_media (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    section TEXT NOT NULL,
    image_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image',
    video_loop BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feedback/Testimonials
CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_avatar_url TEXT,
    rating INTEGER DEFAULT 5,
    feedback_text TEXT DEFAULT '',
    service_id TEXT,
    source_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true
);
```

### 3.4 Analytics (006_analytics.sql)

```sql
-- 006_analytics.sql
-- Analytics & funnel events

-- Analytics sessions
CREATE TABLE IF NOT EXISTS booking_analytics_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    end_reason TEXT,
    locale TEXT,
    path TEXT,
    user_agent TEXT,
    referrer TEXT
);

-- Analytics events
CREATE TABLE IF NOT EXISTS booking_analytics_events (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES booking_analytics_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    step INTEGER,
    service_id TEXT,
    slot_id TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_analytics_session ON booking_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON booking_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON booking_analytics_events(created_at);

-- Slot click tracking
CREATE TABLE IF NOT EXISTS booking_analytics_slot_clicks (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES booking_analytics_sessions(id) ON DELETE CASCADE,
    slot_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    converted BOOLEAN DEFAULT false
);

-- Funnel events
CREATE TABLE IF NOT EXISTS booking_funnel_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id TEXT,
    session_id UUID REFERENCES booking_analytics_sessions(id) ON DELETE SET NULL,
    step TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_type ON booking_funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_created ON booking_funnel_events(created_at);
```

### 3.5 Seed Data (009_seed_data.sql)

```sql
-- 009_seed_data.sql
-- Initial service data (adjust IDs to match existing ensure functions)

INSERT INTO services (id, name, name_et, name_en, description, description_et, description_en, duration, price, category, is_popular, sort_order, active) VALUES
('gel-manicure', 'Gel Manicure', 'Gel manicure', 'Gel Manicure', 'Long-lasting gel polish application', 'Pikaajaline geellaki küntamine', 'Long-lasting gel polish application', 45, 35, 'manicure', true, 1, true),
('luxury-spa-manicure', 'Luxury Spa Manicure', 'Luksus spa manicure', 'Luxury Spa Manicure', 'Full spa experience with massage', 'Täis spa kogemus massaažiga', 'Full spa experience with massage', 60, 55, 'manicure', true, 2, true),
('gel-pedicure', 'Gel Pedicure', 'Gel pedicure', 'Gel Pedicure', 'Gel polish for feet', 'Geellaki pediküür', 'Gel polish for feet', 45, 40, 'pedicure', false, 3, true),
('nail-art', 'Nail Art', 'Küünekunst', 'Nail Art', 'Custom nail art designs', 'Kohandatud küünekunsti disainid', 'Custom nail art designs', 30, 25, 'nail-art', true, 4, true)
ON CONFLICT (id) DO NOTHING;

-- Insert default homepage media
INSERT INTO homepage_media (key, label, section, image_url, media_type, sort_order) VALUES
('hero_main', 'Hero Main Photo', 'hero', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80', 'image', 1),
('hero_fallback', 'Hero Fallback', 'hero', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=1200&q=80', 'image', 2),
('gallery_fallback_1', 'Gallery Fallback 1', 'gallery', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80', 'image', 20),
('team_portrait', 'Sandra Portrait', 'team', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&q=80', 'image', 30),
('location_studio', 'Studio Photo', 'location', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=80', 'image', 50)
ON CONFLICT (key) DO NOTHING;
```

---

## 4. Migration Locking Strategy

### 4.1 Advisory Lock (PostgreSQL-specific)

The migration runner uses `pg_try_advisory_lock()` to prevent concurrent runs:

```sql
-- Attempt to acquire lock
SELECT pg_try_advisory_lock(1234567890);
-- Returns: true if acquired, false if already held

-- Release lock when done
SELECT pg_advisory_unlock(1234567890);
```

### 4.2 How It Works

1. Migration runner starts
2. Attempts to acquire advisory lock with fixed ID (1234567890)
3. If lock not acquired → another migration is running → exit with error
4. If lock acquired → run migrations → release lock on completion
5. Lock automatically released if process crashes (PostgreSQL handles this)

---

## 5. Rollout Plan

### Phase 1: Create Migrations (Pre-deployment)
1. Create all migration SQL files
2. Test migration runner locally
3. Verify all 13 tables created correctly

### Phase 2: Update Data Layer
1. Keep ensure functions but add migration check
2. Deploy migrations to production database
3. Verify tables exist

### Phase 3: Remove Ensure Calls (Post-deployment)
1. Remove ensure calls from API routes (production only)
2. Keep ensures in dev mode for new developers
3. Monitor for any missing table errors

### Phase 4: Full Cleanup
1. Remove all ensure functions
2. Remove global promise caching patterns
3. Archive migration files

---

## 6. Development & Deployment Flows

### 6.1 Local Development

```bash
# First time setup
npm install

# Run migrations manually
npm run migrate
# or
./migrations/migrate.sh

# Start development server
npm run dev

# New developer checkout
git clone
npm install
npm run migrate  # Creates all tables
npm run dev
```

**package.json script:**
```json
{
  "scripts": {
    "migrate": "npx tsx migrations/migrate.ts",
    "db:reset": "npm run migrate && npm run dev"
  }
}
```

### 6.2 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  build:
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install and build
        run: npm ci && npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 6.3 Production Flow

1. **Pre-deployment:**
   - Create backup of production database (Neon console or CLI)
   - Run migrations locally against production to verify

2. **Deployment:**
   - CI runs migrations before build
   - If migrations fail → build doesn't run → deployment stops

3. **Post-deployment:**
   - Verify site loads correctly
   - Check admin panel works
   - Test booking flow

### 6.4 Rollback Procedure

**Option A: Forward-only (Recommended)**
```sql
-- If migration broke something, create a corrective migration
-- 011_fix_broken_column.sql
ALTER TABLE services DROP COLUMN IF EXISTS broken_column;
```

**Option B: Database Restore**
```bash
# From Neon CLI
neonctl branches restore --branch-name main --timestamp "2026-03-18T10:00:00Z"
```

---

## 7. Simplification Summary

| Aspect | Approach |
|--------|----------|
| **State tracking** | Database table (`__nailify_migrations`) |
| **Locking** | PostgreSQL advisory lock |
| **Execution** | Single `migrate.ts` runner |
| **Migration files** | Numbered SQL files |
| **Rollback** | Forward-only + restore |
| **Dev flow** | `npm run migrate` before dev |
| **CI/CD** | Pre-build step |
| **Production** | Migrations run once per deploy |

This approach is:
- ✅ Simple (one runner, numbered files)
- ✅ Safe (advisory lock prevents races)
- ✅ Maintainable (plain SQL migrations)
- ✅ Production-ready (CI/CD integrated)
- ✅ Data-preserving (uses CREATE TABLE IF NOT EXISTS semantics)
