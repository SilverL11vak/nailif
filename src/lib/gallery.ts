import { sql } from './db';

export interface LocalizedValue {
  et: string;
  en: string;
}

export interface GalleryImage {
  id: string;
  imageUrl: string;
  title: LocalizedValue;
  tag: LocalizedValue;
  description: LocalizedValue;
  ctaHref: string;
  isFeatured: boolean;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
  caption: LocalizedValue;
}

type GalleryRow = {
  id: number;
  image_url: string;
  title: string;
  title_et: string;
  title_en: string;
  tag: string;
  tag_et: string;
  tag_en: string;
  description: string;
  description_et: string;
  description_en: string;
  cta_href: string;
  caption: string;
  caption_et: string;
  caption_en: string;
  is_featured: boolean;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
};

export type GalleryImageInput = Partial<{
  id: string;
  imageUrl: string;
  title: LocalizedValue | string;
  tag: LocalizedValue | string;
  description: LocalizedValue | string;
  ctaHref: string;
  caption: LocalizedValue | string;
  isFeatured: boolean;
  isVisible: boolean;
}>;

const defaultGallerySeed: Array<{ imageUrl: string; title: string; tag?: string; description?: string; sortOrder: number }> = [
  {
    imageUrl: 'https://images.unsplash.com/photo-1604902396830-aca29e19b067?w=1200&q=80',
    title: 'Peen laikiv viimistlus',
    tag: 'SIGNATUUR',
    description: 'Klassikaline elegantne tulemus igaks sündmuseks.',
    sortOrder: 1,
  },
  { imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=900&q=80', title: 'Nude toon modernse detailiga', tag: 'NATURAALNE', sortOrder: 2 },
  { imageUrl: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=900&q=80', title: 'Julgem toon õhtuseks lookiks', tag: 'TREND', sortOrder: 3 },
  { imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&q=80', title: 'Minimal detail puhta joonega', tag: 'MINIMAL', sortOrder: 4 },
  { imageUrl: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=900&q=80', title: 'Kauapüsiv klassikaline tulemus', tag: 'KLASSIKA', sortOrder: 5 },
];

declare global {
  var __nailify_gallery_ensure__: Promise<void> | undefined;
}

let galleryEnsurePromise: Promise<void> | null = global.__nailify_gallery_ensure__ ?? null;

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

function fromRow(row: GalleryRow): GalleryImage {
  const title = asLocalized({ et: row.title_et, en: row.title_en }, row.title || row.caption);
  return {
    id: String(row.id),
    imageUrl: row.image_url,
    title,
    tag: asLocalized({ et: row.tag_et, en: row.tag_en }, row.tag),
    description: asLocalized({ et: row.description_et, en: row.description_en }, row.description),
    ctaHref: row.cta_href || '',
    caption: asLocalized({ et: row.caption_et, en: row.caption_en }, row.caption || row.title),
    isFeatured: row.is_featured,
    isVisible: row.is_visible,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function localizedGalleryText(value: LocalizedValue, locale: string): string {
  return locale === 'en' ? value.en : value.et;
}

export async function ensureGalleryTable() {
  if (galleryEnsurePromise) {
    await galleryEnsurePromise;
    return;
  }

  galleryEnsurePromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_images (
        id BIGSERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        title_et TEXT NOT NULL DEFAULT '',
        title_en TEXT NOT NULL DEFAULT '',
        tag TEXT NOT NULL DEFAULT '',
        tag_et TEXT NOT NULL DEFAULT '',
        tag_en TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        description_et TEXT NOT NULL DEFAULT '',
        description_en TEXT NOT NULL DEFAULT '',
        cta_href TEXT NOT NULL DEFAULT '',
        caption TEXT NOT NULL DEFAULT '',
        caption_et TEXT NOT NULL DEFAULT '',
        caption_en TEXT NOT NULL DEFAULT '',
        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
        is_visible BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    for (const column of ['title_et', 'title_en', 'tag_et', 'tag_en', 'description_et', 'description_en', 'caption_et', 'caption_en']) {
      await sql.unsafe(`ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS ${column} TEXT NOT NULL DEFAULT ''`);
    }
    await sql`ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE`;
    await sql`ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS cta_href TEXT NOT NULL DEFAULT ''`;

    await sql`
      UPDATE gallery_images
      SET
        title_et = COALESCE(NULLIF(title_et, ''), title, caption, ''),
        title_en = COALESCE(NULLIF(title_en, ''), title, caption, ''),
        tag_et = COALESCE(NULLIF(tag_et, ''), tag, ''),
        tag_en = COALESCE(NULLIF(tag_en, ''), tag, ''),
        description_et = COALESCE(NULLIF(description_et, ''), description, ''),
        description_en = COALESCE(NULLIF(description_en, ''), description, ''),
        caption_et = COALESCE(NULLIF(caption_et, ''), caption, title, ''),
        caption_en = COALESCE(NULLIF(caption_en, ''), caption, title, '')
    `;

    const [{ count }] = await sql<[{ count: string }]>`SELECT COUNT(*)::text AS count FROM gallery_images`;
    if (Number(count) === 0) {
      for (const item of defaultGallerySeed) {
        await sql`
          INSERT INTO gallery_images (image_url, title, title_et, title_en, tag, tag_et, tag_en, description, description_et, description_en, caption, caption_et, caption_en, cta_href, is_featured, is_visible, sort_order)
          VALUES (
            ${item.imageUrl},
            ${item.title},
            ${item.title},
            ${item.title},
            ${item.tag ?? ''},
            ${item.tag ?? ''},
            ${item.tag ?? ''},
            ${item.description ?? ''},
            ${item.description ?? ''},
            ${item.description ?? ''},
            ${item.title},
            ${item.title},
            ${item.title},
            ${''},
            FALSE,
            TRUE,
            ${item.sortOrder}
          )
        `;
      }
    }
  })();
  global.__nailify_gallery_ensure__ = galleryEnsurePromise;
  await galleryEnsurePromise;
}

export async function listGalleryImages(options?: { admin?: boolean }): Promise<GalleryImage[]> {
  await ensureGalleryTable();
  const rows = await sql<GalleryRow[]>`
    SELECT
      id, image_url, title, title_et, title_en, tag, tag_et, tag_en, description, description_et, description_en,
      cta_href, caption, caption_et, caption_en, is_featured, is_visible, sort_order, created_at::text
    FROM gallery_images
    ${options?.admin ? sql`` : sql`WHERE is_visible = TRUE`}
    ORDER BY sort_order ASC, is_featured DESC, created_at DESC
  `;
  return rows.map(fromRow);
}

function toResolved(input: GalleryImageInput, existing?: GalleryImage) {
  const title = asLocalized(input.title, existing?.title.et ?? asText(input.caption));
  const caption = asLocalized(input.caption, existing?.caption.et ?? title.et);
  return {
    imageUrl: asText(input.imageUrl) || existing?.imageUrl || '',
    title,
    tag: asLocalized(input.tag, existing?.tag.et ?? ''),
    description: asLocalized(input.description, existing?.description.et ?? ''),
    ctaHref: asText(input.ctaHref) || existing?.ctaHref || '',
    caption,
    isFeatured: typeof input.isFeatured === 'boolean' ? input.isFeatured : existing?.isFeatured ?? false,
    isVisible: typeof input.isVisible === 'boolean' ? input.isVisible : existing?.isVisible ?? true,
  };
}

export async function createGalleryImage(input: GalleryImageInput & { imageUrl: string }) {
  await ensureGalleryTable();
  const [maxRow] = await sql<[{ max: number | null }]>`SELECT MAX(sort_order) AS max FROM gallery_images`;
  const nextSort = (maxRow.max ?? 0) + 1;
  const resolved = toResolved(input);
  if (resolved.isFeatured) {
    await sql`UPDATE gallery_images SET is_featured = FALSE`;
  }

  const [row] = await sql<[{ id: number }]>`
    INSERT INTO gallery_images (image_url, title, title_et, title_en, tag, tag_et, tag_en, description, description_et, description_en, cta_href, caption, caption_et, caption_en, is_featured, is_visible, sort_order)
    VALUES (
      ${resolved.imageUrl},
      ${resolved.title.et},
      ${resolved.title.et},
      ${resolved.title.en},
      ${resolved.tag.et},
      ${resolved.tag.et},
      ${resolved.tag.en},
      ${resolved.description.et},
      ${resolved.description.et},
      ${resolved.description.en},
      ${resolved.ctaHref},
      ${resolved.caption.et},
      ${resolved.caption.et},
      ${resolved.caption.en},
      ${resolved.isFeatured},
      ${resolved.isVisible},
      ${nextSort}
    )
    RETURNING id
  `;
  return String(row.id);
}

export async function updateGalleryImage(input: GalleryImageInput & { id: string }) {
  const existing = (await listGalleryImages({ admin: true })).find((item) => item.id === input.id);
  if (!existing) return null;
  const resolved = toResolved(input, existing);
  if (resolved.isFeatured) {
    await sql`UPDATE gallery_images SET is_featured = FALSE`;
  }

  await sql`
    UPDATE gallery_images
    SET
      image_url = ${resolved.imageUrl},
      title = ${resolved.title.et},
      title_et = ${resolved.title.et},
      title_en = ${resolved.title.en},
      tag = ${resolved.tag.et},
      tag_et = ${resolved.tag.et},
      tag_en = ${resolved.tag.en},
      description = ${resolved.description.et},
      description_et = ${resolved.description.et},
      description_en = ${resolved.description.en},
      cta_href = ${resolved.ctaHref},
      caption = ${resolved.caption.et},
      caption_et = ${resolved.caption.et},
      caption_en = ${resolved.caption.en},
      is_featured = ${resolved.isFeatured},
      is_visible = ${resolved.isVisible}
    WHERE id = ${Number(input.id)}::bigint
  `;
  return input.id;
}

export async function reorderGalleryImages(orderedIds: string[]) {
  await ensureGalleryTable();
  let order = 1;
  for (const id of orderedIds) {
    await sql`UPDATE gallery_images SET sort_order = ${order} WHERE id = ${Number(id)}::bigint`;
    order += 1;
  }
}

export async function deleteGalleryImage(id: string) {
  await ensureGalleryTable();
  await sql`DELETE FROM gallery_images WHERE id = ${Number(id)}::bigint`;
}

