import { sql } from './db';
import { isDatabaseMigrated } from './schema-validator';

export interface HomepageMediaItem {
  key: string;
  label: string;
  section: string;
  imageUrl: string;
  mediaType: 'image' | 'video';
  videoLoop: boolean;
  sortOrder: number;
  updatedAt: string;
}

const defaultHomepageMediaSeed: Array<{
  key: string;
  label: string;
  section: string;
  imageUrl: string;
  mediaType?: 'image' | 'video';
  videoLoop?: boolean;
  sortOrder: number;
}> = [
  { key: 'hero_main', label: 'Hero põhifoto', section: 'hero', imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80', sortOrder: 1 },
  { key: 'hero_fallback', label: 'Hero fallback', section: 'hero', imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=1200&q=80', sortOrder: 2 },
  { key: 'gallery_fallback_1', label: 'Galerii fallback 1', section: 'gallery', imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80', sortOrder: 20 },
  { key: 'gallery_fallback_2', label: 'Galerii fallback 2', section: 'gallery', imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80', sortOrder: 21 },
  { key: 'gallery_fallback_3', label: 'Galerii fallback 3', section: 'gallery', imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80', sortOrder: 22 },
  { key: 'gallery_fallback_4', label: 'Galerii fallback 4', section: 'gallery', imageUrl: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&q=80', sortOrder: 23 },
  { key: 'gallery_fallback_5', label: 'Galerii fallback 5', section: 'gallery', imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80', sortOrder: 24 },
  { key: 'gallery_fallback_6', label: 'Galerii fallback 6', section: 'gallery', imageUrl: 'https://images.unsplash.com/photo-1583616690835-130bc67bd1b4?w=800&q=80', sortOrder: 25 },
  { key: 'team_portrait', label: 'Sandra sektsiooni portree', section: 'team', imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&q=80', sortOrder: 30 },
  { key: 'testimonial_featured', label: 'Tagasiside põhipilt', section: 'testimonials', imageUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=1200&q=80', sortOrder: 40 },
  { key: 'testimonial_1', label: 'Tagasiside pilt 1', section: 'testimonials', imageUrl: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=900&q=80', sortOrder: 41 },
  { key: 'testimonial_2', label: 'Tagasiside pilt 2', section: 'testimonials', imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=900&q=80', sortOrder: 42 },
  { key: 'testimonial_3', label: 'Tagasiside pilt 3', section: 'testimonials', imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=80', sortOrder: 43 },
  { key: 'location_studio', label: 'Asukoha sektsiooni stuudiofoto', section: 'location', imageUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=80', sortOrder: 50 },
  { key: 'aftercare_image', label: 'Aftercare sektsiooni pilt', section: 'aftercare', imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200&q=80', sortOrder: 60 },
  { key: 'giftcard_image', label: 'Kinkekaardi sektsiooni pilt', section: 'aftercare', imageUrl: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200&q=80', sortOrder: 61 },
  { key: 'product_fallback_1', label: 'Toode fallback 1', section: 'products', imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80', sortOrder: 70 },
  { key: 'product_fallback_2', label: 'Toode fallback 2', section: 'products', imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&q=80', sortOrder: 71 },
  { key: 'product_fallback_3', label: 'Toode fallback 3', section: 'products', imageUrl: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=800&q=80', sortOrder: 72 },
  { key: 'product_fallback_4', label: 'Toode fallback 4', section: 'products', imageUrl: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&q=80', sortOrder: 73 },
  { key: 'product_fallback_5', label: 'Toode fallback 5', section: 'products', imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80', sortOrder: 74 },
  { key: 'product_fallback_6', label: 'Toode fallback 6', section: 'products', imageUrl: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=800&q=80', sortOrder: 75 },
];

declare global {
  var __nailify_homepage_media_ensure__: Promise<void> | undefined;
}

let homepageMediaEnsurePromise: Promise<void> | null = global.__nailify_homepage_media_ensure__ ?? null;

export async function ensureHomepageMediaTable() {
  // TRANSITIONAL: Skip ensure in production if migrations have been run
  // TODO: After migrations are fully deployed and verified, remove this function
  // and rely entirely on migrations in migrations/003_content.sql
  if (process.env.NODE_ENV === 'production') {
    const migrated = await isDatabaseMigrated();
    if (migrated) {
      return;
    }
  }

  if (homepageMediaEnsurePromise) {
    await homepageMediaEnsurePromise;
    return;
  }

  homepageMediaEnsurePromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS homepage_media (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL DEFAULT '',
        section TEXT NOT NULL DEFAULT 'general',
        image_url TEXT NOT NULL DEFAULT '',
        media_type TEXT NOT NULL DEFAULT 'image',
        video_loop BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE homepage_media ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image'`;
    await sql`ALTER TABLE homepage_media ADD COLUMN IF NOT EXISTS video_loop BOOLEAN NOT NULL DEFAULT FALSE`;

    const [{ count }] = await sql<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM homepage_media
    `;

    if (Number(count) === 0) {
      for (const item of defaultHomepageMediaSeed) {
        await sql`
          INSERT INTO homepage_media (key, label, section, image_url, media_type, video_loop, sort_order)
          VALUES (${item.key}, ${item.label}, ${item.section}, ${item.imageUrl}, ${item.mediaType ?? 'image'}, ${item.videoLoop ?? false}, ${item.sortOrder})
        `;
      }
    }
  })();

  global.__nailify_homepage_media_ensure__ = homepageMediaEnsurePromise;
  await homepageMediaEnsurePromise;
}

export async function listHomepageMedia(): Promise<HomepageMediaItem[]> {
  await ensureHomepageMediaTable();
  const rows = await sql<{
    key: string;
    label: string;
    section: string;
    image_url: string;
    media_type: string;
    video_loop: boolean;
    sort_order: number;
    updated_at: string;
  }[]>`
    SELECT key, label, section, image_url, media_type, video_loop, sort_order, updated_at::text
    FROM homepage_media
    ORDER BY sort_order ASC, key ASC
  `;

  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    section: row.section,
    imageUrl: row.image_url,
    mediaType: row.media_type === 'video' ? 'video' : 'image',
    videoLoop: Boolean(row.video_loop),
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  }));
}

export async function upsertHomepageMedia(input: {
  key: string;
  imageUrl: string;
  mediaType?: 'image' | 'video';
  videoLoop?: boolean;
  label?: string;
  section?: string;
  sortOrder?: number;
}) {
  await ensureHomepageMediaTable();
  const normalizedKey = input.key.trim();
  if (!normalizedKey) throw new Error('Media key is required');

  const [existing] = await sql<[{ key: string; label: string; section: string; sort_order: number; media_type: string; video_loop: boolean }]>`
    SELECT key, label, section, sort_order, media_type, video_loop
    FROM homepage_media
    WHERE key = ${normalizedKey}
    LIMIT 1
  `;

  const label = input.label ?? existing?.label ?? normalizedKey;
  const section = input.section ?? existing?.section ?? 'general';
  const sortOrder = input.sortOrder ?? existing?.sort_order ?? 0;
  const mediaType = input.mediaType ?? (existing?.media_type === 'video' ? 'video' : 'image');
  const videoLoop = input.videoLoop ?? Boolean(existing?.video_loop);

  await sql`
    INSERT INTO homepage_media (key, label, section, image_url, media_type, video_loop, sort_order, updated_at)
    VALUES (${normalizedKey}, ${label}, ${section}, ${input.imageUrl}, ${mediaType}, ${videoLoop}, ${sortOrder}, NOW())
    ON CONFLICT (key) DO UPDATE SET
      label = EXCLUDED.label,
      section = EXCLUDED.section,
      image_url = EXCLUDED.image_url,
      media_type = EXCLUDED.media_type,
      video_loop = EXCLUDED.video_loop,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
  `;
}

export async function upsertHomepageMediaBulk(
  items: Array<{
    key: string;
    imageUrl: string;
    mediaType?: 'image' | 'video';
    videoLoop?: boolean;
    label?: string;
    section?: string;
    sortOrder?: number;
  }>
) {
  for (const item of items) {
    await upsertHomepageMedia(item);
  }
}
