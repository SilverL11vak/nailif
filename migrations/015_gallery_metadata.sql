-- 015_gallery_metadata.sql
-- Add explicit homepage card metadata and visibility controls for gallery images

ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS tag TEXT NOT NULL DEFAULT '';
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS cta_href TEXT NOT NULL DEFAULT '';
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill title from legacy caption for existing rows
UPDATE gallery_images
SET title = caption
WHERE COALESCE(title, '') = '' AND COALESCE(caption, '') <> '';
