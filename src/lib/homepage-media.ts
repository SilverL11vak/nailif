import { sql } from './db';
import { isDatabaseMigrated } from './schema-validator';

export interface LocalizedValue {
  et: string;
  en: string;
}

export interface HomepageMediaItem {
  key: string;
  label: LocalizedValue;
  section: string;
  imageUrl: string;
  mediaType: 'image' | 'video';
  videoLoop: boolean;
  sortOrder: number;
  updatedAt: string;
}

const defaultHomepageMediaSeed: Array<{ key: string; label: string; section: string; imageUrl: string; mediaType?: 'image' | 'video'; videoLoop?: boolean; sortOrder: number }> = [
  { key: 'hero_main', label: 'Hero põhifoto', section: 'hero', imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80', sortOrder: 1 },
  { key: 'hero_fallback', label: 'Hero fallback', section: 'hero', imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=1200&q=80', sortOrder: 2 },
  { key: 'team_portrait', label: 'Sandra portree', section: 'team', imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&q=80', sortOrder: 30 },
  { key: 'location_studio', label: 'Stuudio foto', section: 'location', imageUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=80', sortOrder: 50 },
];

declare global {
  var __nailify_homepage_media_ensure__: Promise<void> | undefined;
}

let homepageMediaEnsurePromise: Promise<void> | null = global.__nailify_homepage_media_ensure__ ?? null;

function asText(input: unknown): string {
  return typeof input === 'string' ? input.trim() : '';
}

function asLocalized(input: unknown, fallback = ''): LocalizedValue {
  if (typeof input === 'string') {
    const value = input.trim();
    return { et: value, en: value };
  }
  if (input && typeof input === 'object') {
    const candidate = input as Partial<Record<'et' | 'en', unknown>>;
    const et = asText(candidate.et) || fallback;
    const en = asText(candidate.en) || fallback;
    return { et, en };
  }
  return { et: fallback, en: fallback };
}

export function localizedHomepageMediaText(value: LocalizedValue, locale: string): string {
  return locale === 'en' ? value.en : value.et;
}

export async function ensureHomepageMediaTable() {
  if (process.env.NODE_ENV === 'production') {
    const migrated = await isDatabaseMigrated();
    if (migrated) return;
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
        label_et TEXT NOT NULL DEFAULT '',
        label_en TEXT NOT NULL DEFAULT '',
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
    await sql`ALTER TABLE homepage_media ADD COLUMN IF NOT EXISTS label_et TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE homepage_media ADD COLUMN IF NOT EXISTS label_en TEXT NOT NULL DEFAULT ''`;

    await sql`
      UPDATE homepage_media
      SET
        label_et = COALESCE(NULLIF(label_et, ''), label, key),
        label_en = COALESCE(NULLIF(label_en, ''), label, key)
    `;

    const [{ count }] = await sql<[{ count: string }]>`SELECT COUNT(*)::text AS count FROM homepage_media`;
    if (Number(count) === 0) {
      for (const item of defaultHomepageMediaSeed) {
        await sql`
          INSERT INTO homepage_media (key, label, label_et, label_en, section, image_url, media_type, video_loop, sort_order)
          VALUES (${item.key}, ${item.label}, ${item.label}, ${item.label}, ${item.section}, ${item.imageUrl}, ${item.mediaType ?? 'image'}, ${item.videoLoop ?? false}, ${item.sortOrder})
        `;
      }
    }
  })();

  global.__nailify_homepage_media_ensure__ = homepageMediaEnsurePromise;
  await homepageMediaEnsurePromise;
}

export async function listHomepageMedia(): Promise<HomepageMediaItem[]> {
  await ensureHomepageMediaTable();
  const rows = await sql<Array<{ key: string; label: string; label_et: string; label_en: string; section: string; image_url: string; media_type: string; video_loop: boolean; sort_order: number; updated_at: string }>>`
    SELECT key, label, label_et, label_en, section, image_url, media_type, video_loop, sort_order, updated_at::text
    FROM homepage_media
    ORDER BY sort_order ASC, key ASC
  `;

  return rows.map((row) => ({
    key: row.key,
    label: asLocalized({ et: row.label_et, en: row.label_en }, row.label || row.key),
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
  label?: LocalizedValue | string;
  section?: string;
  sortOrder?: number;
}) {
  await ensureHomepageMediaTable();
  const key = input.key.trim();
  if (!key) throw new Error('Media key is required');

  const [existing] = await sql<Array<{ key: string; label_et: string; label_en: string; section: string; sort_order: number; media_type: string; video_loop: boolean }>>`
    SELECT key, label_et, label_en, section, sort_order, media_type, video_loop
    FROM homepage_media
    WHERE key = ${key}
    LIMIT 1
  `;

  const baseLabel = asLocalized({ et: existing?.label_et ?? '', en: existing?.label_en ?? '' }, key);
  const label = asLocalized(input.label, baseLabel.et);
  const section = input.section ?? existing?.section ?? 'general';
  const sortOrder = input.sortOrder ?? existing?.sort_order ?? 0;
  const mediaType = input.mediaType ?? (existing?.media_type === 'video' ? 'video' : 'image');
  const videoLoop = input.videoLoop ?? Boolean(existing?.video_loop);

  await sql`
    INSERT INTO homepage_media (key, label, label_et, label_en, section, image_url, media_type, video_loop, sort_order, updated_at)
    VALUES (${key}, ${label.et}, ${label.et}, ${label.en}, ${section}, ${input.imageUrl}, ${mediaType}, ${videoLoop}, ${sortOrder}, NOW())
    ON CONFLICT (key) DO UPDATE SET
      label = EXCLUDED.label,
      label_et = EXCLUDED.label_et,
      label_en = EXCLUDED.label_en,
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
    label?: LocalizedValue | string;
    section?: string;
    sortOrder?: number;
  }>
) {
  for (const item of items) {
    await upsertHomepageMedia(item);
  }
}

