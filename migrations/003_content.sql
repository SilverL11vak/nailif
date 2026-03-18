-- 003_content.sql
-- Gallery, homepage media, and feedback tables

-- Gallery images table
CREATE TABLE IF NOT EXISTS gallery_images (
    id BIGSERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Homepage media table
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

-- Feedback/Testimonials table
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
