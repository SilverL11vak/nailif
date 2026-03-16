import { sql } from './db';
import type { Service } from '@/store/booking-types';
import type { LocaleCode } from './i18n/locale-path';
import { mockServices } from '@/store/mock-data';

export interface Product {
  id: string;
  name: string;
  nameEt: string;
  nameEn: string;
  description: string;
  descriptionEt: string;
  descriptionEn: string;
  price: number;
  imageUrl: string | null;
  images: string[];
  category: string;
  categoryEt: string;
  categoryEn: string;
  stock: number;
  active: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecord extends Service {
  nameEt: string;
  nameEn: string;
  descriptionEt: string;
  descriptionEn: string;
  resultDescription: string;
  resultDescriptionEt: string;
  resultDescriptionEn: string;
  longevityDescription: string;
  longevityDescriptionEt: string;
  longevityDescriptionEn: string;
  suitabilityNote: string;
  suitabilityNoteEt: string;
  suitabilityNoteEn: string;
  imageUrl?: string | null;
  active: boolean;
}

const defaultProducts: Omit<Product, 'createdAt'>[] = [
  {
    id: 'cuticle-oil-rose',
    name: 'Rose Cuticle Oil',
    nameEt: 'Roosi küüneõli',
    nameEn: 'Rose Cuticle Oil',
    description: 'Hydrating daily care with jojoba and vitamin E.',
    descriptionEt: 'Niisutav igapäevahooldus jojoba ja E-vitamiiniga.',
    descriptionEn: 'Hydrating daily care with jojoba and vitamin E.',
    price: 19,
    imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80'],
    category: 'Aftercare',
    categoryEt: 'Hooldus',
    categoryEn: 'Aftercare',
    stock: 40,
    active: true,
    isFeatured: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'silk-hand-cream',
    name: 'Silk Hand Cream',
    nameEt: 'Siidine katekreem',
    nameEn: 'Silk Hand Cream',
    description: 'Velvet hydration that supports soft skin and polished hands.',
    descriptionEt: 'Sametine niisutus, mis hoiab naha pehme ja kaed hoolitsetud.',
    descriptionEn: 'Velvet hydration that supports soft skin and polished hands.',
    price: 24,
    imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&q=80'],
    category: 'Aftercare',
    categoryEt: 'Hooldus',
    categoryEn: 'Aftercare',
    stock: 35,
    active: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'nail-strength-serum',
    name: 'Nail Strength Serum',
    nameEt: 'Kuunte tugevdav seerum',
    nameEn: 'Nail Strength Serum',
    description: 'Targeted support for brittle nails between appointments.',
    descriptionEt: 'Sihtotstarbeline toetus ornadele kuuntele hoolduste vahel.',
    descriptionEn: 'Targeted support for brittle nails between appointments.',
    price: 22,
    imageUrl: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=600&q=80'],
    category: 'Aftercare',
    categoryEt: 'Hooldus',
    categoryEn: 'Aftercare',
    stock: 28,
    active: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'keratin-repair-balm',
    name: 'Keratin Repair Balm',
    nameEt: 'Keratiin taastav palsam',
    nameEn: 'Keratin Repair Balm',
    description: 'Deep conditioning balm for dry cuticles and plate protection.',
    descriptionEt: 'Suvaniisutav palsam kuivadele kuunenahkadele ja kuuneplaadi kaitseks.',
    descriptionEn: 'Deep conditioning balm for dry cuticles and plate protection.',
    price: 27,
    imageUrl: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80'],
    category: 'Repair',
    categoryEt: 'Taastav hooldus',
    categoryEn: 'Repair',
    stock: 24,
    active: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gloss-protect-topcoat',
    name: 'Gloss Protect Topcoat',
    nameEt: 'Laki kaitsev topcoat',
    nameEn: 'Gloss Protect Topcoat',
    description: 'Adds shine and helps preserve salon finish for longer.',
    descriptionEt: 'Lisab laiget ja aitab salongitulemust pikemalt hoida.',
    descriptionEn: 'Adds shine and helps preserve salon finish for longer.',
    price: 18,
    imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&q=80'],
    category: 'Finish care',
    categoryEt: 'Viimistlus',
    categoryEn: 'Finish care',
    stock: 30,
    active: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'premium-care-kit',
    name: 'Premium Care Kit',
    nameEt: 'Premium hoolduskomplekt',
    nameEn: 'Premium Care Kit',
    description: 'Complete at-home ritual: oil, file and strengthening support.',
    descriptionEt: 'Kodune tervikhooldus: oli, viil ja tugevdav toetus.',
    descriptionEn: 'Complete at-home ritual: oil, file and strengthening support.',
    price: 49,
    imageUrl: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=600&q=80'],
    category: 'Kit',
    categoryEt: 'Komplekt',
    categoryEn: 'Kit',
    stock: 16,
    active: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
];

function normalizeLocale(locale?: string): LocaleCode {
  return locale === 'en' ? 'en' : 'et';
}

function localizedValue(locale: LocaleCode, et: string | null, en: string | null, fallback?: string | null) {
  const etValue = (et ?? '').trim();
  const enValue = (en ?? '').trim();
  const fallbackValue = (fallback ?? '').trim();

  if (locale === 'en') {
    return enValue || etValue || fallbackValue;
  }
  return etValue || fallbackValue || enValue;
}

declare global {
  var __nailify_catalog_ensure__: Promise<void> | undefined;
}

let catalogEnsurePromise: Promise<void> | null = global.__nailify_catalog_ensure__ ?? null;

function sanitizePublicImage(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('data:')) return null;
  return imageUrl;
}

async function ensureCatalogTablesInternal() {
  await sql`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_et TEXT,
      name_en TEXT,
      description TEXT,
      description_et TEXT,
      description_en TEXT,
      result_description_et TEXT,
      result_description_en TEXT,
      longevity_description_et TEXT,
      longevity_description_en TEXT,
      longgevity_description_et TEXT,
      longgevity_description_en TEXT,
      suitability_note_et TEXT,
      suitability_note_en TEXT,
      duration INTEGER NOT NULL,
      price INTEGER NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT,
      is_popular BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_et TEXT,
      name_en TEXT,
      description TEXT NOT NULL DEFAULT '',
      description_et TEXT,
      description_en TEXT,
      price INTEGER NOT NULL,
      image_url TEXT,
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      category TEXT NOT NULL DEFAULT 'Üldine',
      category_et TEXT,
      category_en TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS name_et TEXT`;
  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS name_en TEXT`;
  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS description_et TEXT`;
  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS description_en TEXT`;
  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS result_description_et TEXT`;
  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS result_description_en TEXT`;
  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS longevity_description_et TEXT`;
  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS longevity_description_en TEXT`;
  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS longgevity_description_et TEXT`;
  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS longgevity_description_en TEXT`;
  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS suitability_note_et TEXT`;
  await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS suitability_note_en TEXT`;

  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS name_et TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS description_et TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS description_en TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS category_et TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS category_en TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Üldine'`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE`;

  await sql`
    UPDATE services
    SET
      name_et = COALESCE(NULLIF(name_et, ''), name),
      description_et = COALESCE(NULLIF(description_et, ''), description),
      result_description_et = COALESCE(NULLIF(result_description_et, ''), description),
      longevity_description_et = COALESCE(NULLIF(longgevity_description_et, ''), 'Püsivus: individuaalne'),
      longgevity_description_et = COALESCE(NULLIF(longgevity_description_et, ''), NULLIF(longevity_description_et, ''), 'Püsivus: individuaalne'),
      suitability_note_et = COALESCE(NULLIF(suitability_note_et, ''), 'Sobivus: kohandatud')
    WHERE
      name_et IS NULL OR description_et IS NULL OR name_et = '' OR description_et = '' OR
      result_description_et IS NULL OR result_description_et = '' OR
      longevity_description_et IS NULL OR longevity_description_et = '' OR
      longgevity_description_et IS NULL OR longgevity_description_et = '' OR
      suitability_note_et IS NULL OR suitability_note_et = ''
  `;

  await sql`
    UPDATE services
    SET
      longevity_description_et = COALESCE(NULLIF(longevity_description_et, ''), NULLIF(longgevity_description_et, ''), 'Püsivus: individuaalne'),
      longevity_description_en = COALESCE(NULLIF(longevity_description_en, ''), NULLIF(longgevity_description_en, '')),
      longgevity_description_et = COALESCE(NULLIF(longgevity_description_et, ''), NULLIF(longevity_description_et, ''), 'Püsivus: individuaalne'),
      longgevity_description_en = COALESCE(NULLIF(longgevity_description_en, ''), NULLIF(longevity_description_en, ''))
  `;

  await sql`
    UPDATE products
    SET
      name_et = COALESCE(NULLIF(name_et, ''), name),
      description_et = COALESCE(NULLIF(description_et, ''), description),
      category_et = COALESCE(NULLIF(category_et, ''), category)
    WHERE
      name_et IS NULL OR name_et = '' OR
      description_et IS NULL OR description_et = '' OR
      category_et IS NULL OR category_et = ''
  `;

  const [{ count: serviceCount }] = await sql<[{ count: string }]>`
    SELECT COUNT(*)::text AS count FROM services
  `;
  if (Number(serviceCount) === 0) {
    for (const service of mockServices) {
      await sql`
        INSERT INTO services (
          id, name, name_et, name_en, description, description_et, description_en, result_description_et, result_description_en, longevity_description_et, longevity_description_en, longgevity_description_et, longgevity_description_en, suitability_note_et, suitability_note_en, duration, price, category, image_url, is_popular, active
        ) VALUES (
          ${service.id},
          ${service.name},
          ${service.name},
          ${''},
          ${service.description ?? ''},
          ${service.description ?? ''},
          ${''},
          ${service.description ?? ''},
          ${''},
          ${'Püsivus: individuaalne'},
          ${''},
          ${'Püsivus: individuaalne'},
          ${''},
          ${'Sobivus: kohandatud'},
          ${''},
          ${service.duration},
          ${service.price},
          ${service.category},
          ${null},
          ${service.isPopular ?? false},
          TRUE
        )
      `;
    }
  }

  const [{ count: productCount }] = await sql<[{ count: string }]>`
    SELECT COUNT(*)::text AS count FROM products
  `;
  if (Number(productCount) === 0) {
    for (const product of defaultProducts) {
      await sql`
        INSERT INTO products (id, name, name_et, name_en, description, description_et, description_en, price, image_url, images, category, category_et, category_en, stock, active, is_featured)
        VALUES (
          ${product.id},
          ${product.name},
          ${product.nameEt},
          ${product.nameEn},
          ${product.description},
          ${product.descriptionEt},
          ${product.descriptionEn},
          ${product.price},
          ${product.imageUrl},
          ${JSON.stringify(product.images)}::jsonb,
          ${product.category},
          ${product.categoryEt},
          ${product.categoryEn},
          ${product.stock},
          ${product.active},
          ${product.isFeatured}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }
}

export async function ensureCatalogTables() {
  if (!catalogEnsurePromise) {
    catalogEnsurePromise = ensureCatalogTablesInternal();
    global.__nailify_catalog_ensure__ = catalogEnsurePromise;
  }
  await catalogEnsurePromise;
}

export async function listServices(locale?: string): Promise<ServiceRecord[]> {
  const lang = normalizeLocale(locale);
  const rows = await sql<{
    id: string;
    name: string;
    name_et: string | null;
    name_en: string | null;
    description: string | null;
    description_et: string | null;
    description_en: string | null;
    result_description_et: string | null;
    result_description_en: string | null;
    longevity_description_et: string | null;
    longevity_description_en: string | null;
    suitability_note_et: string | null;
    suitability_note_en: string | null;
    duration: number;
    price: number;
    category: Service['category'];
    image_url: string | null;
    is_popular: boolean;
    active: boolean;
  }[]>`
    SELECT id, name, name_et, name_en, description, description_et, description_en, result_description_et, result_description_en, longevity_description_et, longevity_description_en, suitability_note_et, suitability_note_en, duration, price, category, CASE WHEN image_url LIKE 'data:%' THEN NULL ELSE image_url END AS image_url, is_popular, active
    FROM services
    WHERE active = TRUE
    ORDER BY price ASC, name ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: localizedValue(lang, row.name_et, row.name_en, row.name),
    nameEt: row.name_et ?? row.name,
    nameEn: row.name_en ?? '',
    description: localizedValue(lang, row.description_et, row.description_en, row.description),
    descriptionEt: row.description_et ?? row.description ?? '',
    descriptionEn: row.description_en ?? '',
    resultDescription: localizedValue(lang, row.result_description_et, row.result_description_en, row.description),
    resultDescriptionEt: row.result_description_et ?? row.description ?? '',
    resultDescriptionEn: row.result_description_en ?? '',
    longevityDescription: localizedValue(lang, row.longevity_description_et, row.longevity_description_en, 'Püsivus: individuaalne'),
    longevityDescriptionEt: row.longevity_description_et ?? 'Püsivus: individuaalne',
    longevityDescriptionEn: row.longevity_description_en ?? '',
    suitabilityNote: localizedValue(lang, row.suitability_note_et, row.suitability_note_en, 'Sobivus: kohandatud'),
    suitabilityNoteEt: row.suitability_note_et ?? 'Sobivus: kohandatud',
    suitabilityNoteEn: row.suitability_note_en ?? '',
    duration: row.duration,
    price: row.price,
    category: row.category,
    imageUrl: sanitizePublicImage(row.image_url),
    isPopular: row.is_popular,
    active: row.active,
  }));
}

export async function listAdminServices(locale?: string): Promise<ServiceRecord[]> {
  const lang = normalizeLocale(locale);
  const rows = await sql<{
    id: string;
    name: string;
    name_et: string | null;
    name_en: string | null;
    description: string | null;
    description_et: string | null;
    description_en: string | null;
    result_description_et: string | null;
    result_description_en: string | null;
    longevity_description_et: string | null;
    longevity_description_en: string | null;
    suitability_note_et: string | null;
    suitability_note_en: string | null;
    duration: number;
    price: number;
    category: Service['category'];
    image_url: string | null;
    is_popular: boolean;
    active: boolean;
  }[]>`
    SELECT id, name, name_et, name_en, description, description_et, description_en, result_description_et, result_description_en, longevity_description_et, longevity_description_en, suitability_note_et, suitability_note_en, duration, price, category, image_url, is_popular, active
    FROM services
    ORDER BY created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: localizedValue(lang, row.name_et, row.name_en, row.name),
    nameEt: row.name_et ?? row.name,
    nameEn: row.name_en ?? '',
    description: localizedValue(lang, row.description_et, row.description_en, row.description),
    descriptionEt: row.description_et ?? row.description ?? '',
    descriptionEn: row.description_en ?? '',
    resultDescription: localizedValue(lang, row.result_description_et, row.result_description_en, row.description),
    resultDescriptionEt: row.result_description_et ?? row.description ?? '',
    resultDescriptionEn: row.result_description_en ?? '',
    longevityDescription: localizedValue(lang, row.longevity_description_et, row.longevity_description_en, 'Püsivus: individuaalne'),
    longevityDescriptionEt: row.longevity_description_et ?? 'Püsivus: individuaalne',
    longevityDescriptionEn: row.longevity_description_en ?? '',
    suitabilityNote: localizedValue(lang, row.suitability_note_et, row.suitability_note_en, 'Sobivus: kohandatud'),
    suitabilityNoteEt: row.suitability_note_et ?? 'Sobivus: kohandatud',
    suitabilityNoteEn: row.suitability_note_en ?? '',
    duration: row.duration,
    price: row.price,
    category: row.category,
    imageUrl: row.image_url,
    isPopular: row.is_popular,
    active: row.active,
  }));
}

export interface UpsertServiceInput {
  id: string;
  nameEt: string;
  nameEn?: string;
  descriptionEt?: string;
  descriptionEn?: string;
  resultDescriptionEt?: string;
  resultDescriptionEn?: string;
  longevityDescriptionEt?: string;
  longevityDescriptionEn?: string;
  suitabilityNoteEt?: string;
  suitabilityNoteEn?: string;
  duration: number;
  price: number;
  category: Service['category'];
  imageUrl?: string | null;
  isPopular?: boolean;
  active?: boolean;
}

export async function upsertService(input: UpsertServiceInput) {
  const nameEt = input.nameEt.trim();
  const nameEn = (input.nameEn ?? '').trim();
  const descriptionEt = input.descriptionEt ?? '';
  const descriptionEn = input.descriptionEn ?? '';
  const resultDescriptionEt = input.resultDescriptionEt ?? descriptionEt;
  const resultDescriptionEn = input.resultDescriptionEn ?? '';
  const longevityDescriptionEt = input.longevityDescriptionEt ?? 'Püsivus: individuaalne';
  const longevityDescriptionEn = input.longevityDescriptionEn ?? '';
  const suitabilityNoteEt = input.suitabilityNoteEt ?? 'Sobivus: kohandatud';
  const suitabilityNoteEn = input.suitabilityNoteEn ?? '';

  await sql`
    INSERT INTO services (
      id, name, name_et, name_en, description, description_et, description_en, result_description_et, result_description_en, longevity_description_et, longevity_description_en, longgevity_description_et, longgevity_description_en, suitability_note_et, suitability_note_en, duration, price, category, image_url, is_popular, active
    ) VALUES (
      ${input.id},
      ${nameEt},
      ${nameEt},
      ${nameEn},
      ${descriptionEt},
      ${descriptionEt},
      ${descriptionEn},
      ${resultDescriptionEt},
      ${resultDescriptionEn},
      ${longevityDescriptionEt},
      ${longevityDescriptionEn},
      ${longevityDescriptionEt},
      ${longevityDescriptionEn},
      ${suitabilityNoteEt},
      ${suitabilityNoteEn},
      ${input.duration},
      ${input.price},
      ${input.category},
      ${input.imageUrl ?? null},
      ${input.isPopular ?? false},
      ${input.active ?? true}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      name_et = EXCLUDED.name_et,
      name_en = EXCLUDED.name_en,
      description = EXCLUDED.description,
      description_et = EXCLUDED.description_et,
      description_en = EXCLUDED.description_en,
      result_description_et = EXCLUDED.result_description_et,
      result_description_en = EXCLUDED.result_description_en,
      longevity_description_et = EXCLUDED.longevity_description_et,
      longevity_description_en = EXCLUDED.longevity_description_en,
      longgevity_description_et = EXCLUDED.longgevity_description_et,
      longgevity_description_en = EXCLUDED.longgevity_description_en,
      suitability_note_et = EXCLUDED.suitability_note_et,
      suitability_note_en = EXCLUDED.suitability_note_en,
      duration = EXCLUDED.duration,
      price = EXCLUDED.price,
      category = EXCLUDED.category,
      image_url = EXCLUDED.image_url,
      is_popular = EXCLUDED.is_popular,
      active = EXCLUDED.active,
      updated_at = NOW()
  `;
}

export async function deleteService(id: string) {
  await sql`DELETE FROM services WHERE id = ${id}`;
}

export async function listProducts(activeOnly = true, locale?: string): Promise<Product[]> {
  const lang = normalizeLocale(locale);
  const selectImageUrl = activeOnly
    ? sql`CASE WHEN image_url LIKE 'data:%' THEN NULL ELSE image_url END AS image_url`
    : sql`image_url`;
  const selectImages = activeOnly ? sql`'[]'::jsonb AS images` : sql`images`;
  const rows = await sql<{
    id: string;
    name: string;
    name_et: string | null;
    name_en: string | null;
    description: string;
    description_et: string | null;
    description_en: string | null;
    price: number;
    image_url: string | null;
    images: unknown;
    category: string;
    category_et: string | null;
    category_en: string | null;
    stock: number;
    active: boolean;
    is_featured: boolean;
    created_at: string;
    updated_at: string;
  }[]>`
    SELECT id, name, name_et, name_en, description, description_et, description_en, price, ${selectImageUrl}, ${selectImages}, category, category_et, category_en, stock, active, is_featured, created_at::text, updated_at::text
    FROM products
    ${activeOnly ? sql`WHERE active = TRUE` : sql``}
    ORDER BY is_featured DESC, created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: localizedValue(lang, row.name_et, row.name_en, row.name),
    nameEt: row.name_et ?? row.name,
    nameEn: row.name_en ?? '',
    description: localizedValue(lang, row.description_et, row.description_en, row.description),
    descriptionEt: row.description_et ?? row.description,
    descriptionEn: row.description_en ?? '',
    price: row.price,
    imageUrl: sanitizePublicImage(row.image_url),
    images:
      Array.isArray(row.images) && row.images.every((value) => typeof value === 'string')
        ? (row.images as string[]).filter((value) => !value.startsWith('data:')).slice(0, 3)
        : row.image_url
          ? [sanitizePublicImage(row.image_url)].filter((value): value is string => Boolean(value))
          : [],
    category: localizedValue(lang, row.category_et, row.category_en, row.category),
    categoryEt: row.category_et ?? row.category,
    categoryEn: row.category_en ?? '',
    stock: row.stock,
    active: row.active,
    isFeatured: row.is_featured ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getProductsByIds(ids: string[], locale?: string): Promise<Product[]> {
  if (ids.length === 0) return [];
  const lang = normalizeLocale(locale);

  const rows = await sql<{
    id: string;
    name: string;
    name_et: string | null;
    name_en: string | null;
    description: string;
    description_et: string | null;
    description_en: string | null;
    price: number;
    image_url: string | null;
    images: unknown;
    category: string;
    category_et: string | null;
    category_en: string | null;
    stock: number;
    active: boolean;
    is_featured: boolean;
    created_at: string;
    updated_at: string;
  }[]>`
    SELECT id, name, name_et, name_en, description, description_et, description_en, price, image_url, images, category, category_et, category_en, stock, active, is_featured, created_at::text, updated_at::text
    FROM products
    WHERE id IN ${sql(ids)}
      AND active = TRUE
  `;

  return rows.map((row) => ({
    id: row.id,
    name: localizedValue(lang, row.name_et, row.name_en, row.name),
    nameEt: row.name_et ?? row.name,
    nameEn: row.name_en ?? '',
    description: localizedValue(lang, row.description_et, row.description_en, row.description),
    descriptionEt: row.description_et ?? row.description,
    descriptionEn: row.description_en ?? '',
    price: row.price,
    imageUrl: sanitizePublicImage(row.image_url),
    images:
      Array.isArray(row.images) && row.images.every((value) => typeof value === 'string')
        ? (row.images as string[]).filter((value) => !value.startsWith('data:')).slice(0, 3)
        : row.image_url
          ? [sanitizePublicImage(row.image_url)].filter((value): value is string => Boolean(value))
          : [],
    category: localizedValue(lang, row.category_et, row.category_en, row.category),
    categoryEt: row.category_et ?? row.category,
    categoryEn: row.category_en ?? '',
    stock: row.stock,
    active: row.active,
    isFeatured: row.is_featured ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export interface UpsertProductInput {
  id: string;
  nameEt: string;
  nameEn?: string;
  descriptionEt: string;
  descriptionEn?: string;
  price: number;
  imageUrl?: string | null;
  images?: string[];
  categoryEt?: string;
  categoryEn?: string;
  stock: number;
  active?: boolean;
  isFeatured?: boolean;
}

export async function upsertProduct(input: UpsertProductInput) {
  const normalizedImages = Array.isArray(input.images)
    ? input.images.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const primaryImage = input.imageUrl ?? normalizedImages[0] ?? null;
  const categoryEt = (input.categoryEt ?? 'Üldine').trim() || 'Üldine';

  await sql`
    INSERT INTO products (
      id, name, name_et, name_en, description, description_et, description_en, price, image_url, images, category, category_et, category_en, stock, active, is_featured
    ) VALUES (
      ${input.id},
      ${input.nameEt},
      ${input.nameEt},
      ${input.nameEn ?? ''},
      ${input.descriptionEt},
      ${input.descriptionEt},
      ${input.descriptionEn ?? ''},
      ${input.price},
      ${primaryImage},
      ${JSON.stringify(normalizedImages)}::jsonb,
      ${categoryEt},
      ${categoryEt},
      ${input.categoryEn ?? ''},
      ${input.stock},
      ${input.active ?? true},
      ${input.isFeatured ?? false}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      name_et = EXCLUDED.name_et,
      name_en = EXCLUDED.name_en,
      description = EXCLUDED.description,
      description_et = EXCLUDED.description_et,
      description_en = EXCLUDED.description_en,
      price = EXCLUDED.price,
      image_url = EXCLUDED.image_url,
      images = EXCLUDED.images,
      category = EXCLUDED.category,
      category_et = EXCLUDED.category_et,
      category_en = EXCLUDED.category_en,
      stock = EXCLUDED.stock,
      active = EXCLUDED.active,
      is_featured = EXCLUDED.is_featured,
      updated_at = NOW()
  `;
}

export async function deleteProduct(id: string) {
  await sql`DELETE FROM products WHERE id = ${id}`;
}
