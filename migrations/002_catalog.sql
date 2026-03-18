-- 002_catalog.sql
-- Services and Products tables with bilingual support

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
