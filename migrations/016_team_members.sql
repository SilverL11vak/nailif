CREATE TABLE IF NOT EXISTS team_members (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role_title TEXT NOT NULL DEFAULT '',
  short_intro TEXT NOT NULL DEFAULT '',
  main_image TEXT NOT NULL DEFAULT '',
  badge_1_text TEXT NOT NULL DEFAULT '',
  badge_2_text TEXT NOT NULL DEFAULT '',
  badge_3_text TEXT NOT NULL DEFAULT '',
  feature_1_title TEXT NOT NULL DEFAULT '',
  feature_1_text TEXT NOT NULL DEFAULT '',
  feature_2_title TEXT NOT NULL DEFAULT '',
  feature_2_text TEXT NOT NULL DEFAULT '',
  feature_3_title TEXT NOT NULL DEFAULT '',
  feature_3_text TEXT NOT NULL DEFAULT '',
  signature_label TEXT NOT NULL DEFAULT '',
  signature_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  preview_gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_cta_text TEXT NOT NULL DEFAULT '',
  primary_cta_link TEXT NOT NULL DEFAULT '',
  availability_helper_text TEXT NOT NULL DEFAULT '',
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_homepage BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_homepage ON team_members(show_on_homepage, is_visible);
CREATE INDEX IF NOT EXISTS idx_team_members_sort ON team_members(sort_order, is_featured, created_at);
