import { sql } from './db';
import { isDatabaseMigrated } from './schema-validator';

export interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
}

const defaultGallerySeed: Array<{ imageUrl: string; caption: string; isFeatured?: boolean; sortOrder: number }> = [
  {
    imageUrl: 'https://images.unsplash.com/photo-1604902396830-aca29e19b067?w=1200&q=80',
    caption: 'Peen läikiv viimistlus',
    isFeatured: true,
    sortOrder: 1,
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=900&q=80',
    caption: 'Nude toon modernse detailiga',
    sortOrder: 2,
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=900&q=80',
    caption: 'Julgem toon õhtuseks lookiks',
    sortOrder: 3,
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&q=80',
    caption: 'Minimal detail puhta joonega',
    sortOrder: 4,
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=900&q=80',
    caption: 'Kauapüsiv klassikaline tulemus',
    sortOrder: 5,
  },
];

declare global {
  var __nailify_gallery_ensure__: Promise<void> | undefined;
}

let galleryEnsurePromise: Promise<void> | null = global.__nailify_gallery_ensure__ ?? null;

export async function ensureGalleryTable() {
  // TRANSITIONAL: Skip ensure in production if migrations have been run
  // TODO: After migrations are fully deployed and verified, remove this function
  // and rely entirely on migrations in migrations/003_content.sql
  if (process.env.NODE_ENV === 'production') {
    const migrated = await isDatabaseMigrated();
    if (migrated) {
      return;
    }
  }

  if (galleryEnsurePromise) {
    await galleryEnsurePromise;
    return;
  }

  galleryEnsurePromise = (async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS gallery_images (
      id BIGSERIAL PRIMARY KEY,
      image_url TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

    const [{ count }] = await sql<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM gallery_images
    `;

    if (Number(count) === 0) {
      for (const item of defaultGallerySeed) {
        await sql`
          INSERT INTO gallery_images (image_url, caption, is_featured, sort_order)
          VALUES (${item.imageUrl}, ${item.caption}, ${Boolean(item.isFeatured)}, ${item.sortOrder})
        `;
      }
    }
  })();
  global.__nailify_gallery_ensure__ = galleryEnsurePromise;

  await galleryEnsurePromise;
}

export async function listGalleryImages(): Promise<GalleryImage[]> {
  await ensureGalleryTable();
  const rows = await sql<{
    id: number;
    image_url: string;
    caption: string;
    is_featured: boolean;
    sort_order: number;
    created_at: string;
  }[]>`
    SELECT id, image_url, caption, is_featured, sort_order, created_at::text
    FROM gallery_images
    ORDER BY sort_order ASC, created_at DESC
  `;

  return rows.map((row) => ({
    id: String(row.id),
    imageUrl: row.image_url,
    caption: row.caption,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }));
}

export async function createGalleryImage(input: {
  imageUrl: string;
  caption?: string;
  isFeatured?: boolean;
}) {
  await ensureGalleryTable();
  const [maxRow] = await sql<[{ max: number | null }]>`
    SELECT MAX(sort_order) AS max FROM gallery_images
  `;
  const nextSort = (maxRow.max ?? 0) + 1;

  if (input.isFeatured) {
    await sql`UPDATE gallery_images SET is_featured = FALSE`;
  }

  const [row] = await sql<[{ id: number }]>`
    INSERT INTO gallery_images (image_url, caption, is_featured, sort_order)
    VALUES (
      ${input.imageUrl},
      ${input.caption ?? ''},
      ${Boolean(input.isFeatured)},
      ${nextSort}
    )
    RETURNING id
  `;

  return String(row.id);
}

export async function updateGalleryImage(input: {
  id: string;
  caption?: string;
  isFeatured?: boolean;
  imageUrl?: string;
}) {
  await ensureGalleryTable();

  const [existing] = await sql<[{ id: number; caption: string; is_featured: boolean; image_url: string }]>`
    SELECT id, caption, is_featured, image_url
    FROM gallery_images
    WHERE id = ${Number(input.id)}::bigint
    LIMIT 1
  `;
  if (!existing) return null;

  if (input.isFeatured === true) {
    await sql`UPDATE gallery_images SET is_featured = FALSE`;
  }

  await sql`
    UPDATE gallery_images
    SET
      caption = ${input.caption ?? existing.caption},
      image_url = ${input.imageUrl ?? existing.image_url},
      is_featured = ${
        typeof input.isFeatured === 'boolean' ? input.isFeatured : existing.is_featured
      }
    WHERE id = ${Number(input.id)}::bigint
  `;

  return String(existing.id);
}

export async function reorderGalleryImages(orderedIds: string[]) {
  await ensureGalleryTable();

  let order = 1;
  for (const id of orderedIds) {
    await sql`
      UPDATE gallery_images
      SET sort_order = ${order}
      WHERE id = ${Number(id)}::bigint
    `;
    order += 1;
  }
}

export async function deleteGalleryImage(id: string) {
  await ensureGalleryTable();
  await sql`DELETE FROM gallery_images WHERE id = ${Number(id)}::bigint`;
}
