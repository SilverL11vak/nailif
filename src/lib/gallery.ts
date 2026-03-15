import { sql } from './db';

export interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
}

export async function ensureGalleryTable() {
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
