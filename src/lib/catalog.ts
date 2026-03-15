import { sql } from './db';
import type { Service } from '@/store/booking-types';
import { mockServices } from '@/store/mock-data';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  images: string[];
  category: string;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecord extends Service {
  imageUrl?: string | null;
  active: boolean;
}

const defaultProducts: Omit<Product, 'createdAt'>[] = [
  {
    id: 'cuticle-oil-rose',
    name: 'Rose Cuticle Oil',
    description: 'Hydrating daily care with jojoba and vitamin E.',
    price: 19,
    imageUrl:
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80',
    ],
    category: 'Aftercare',
    stock: 40,
    active: true,
    updatedAt: new Date().toISOString(),
  },
];

export async function ensureCatalogTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
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
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      image_url TEXT,
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      category TEXT NOT NULL DEFAULT 'Üldine',
      stock INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb
  `;

  await sql`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Üldine'
  `;

  const [{ count: serviceCount }] = await sql<[{ count: string }]>`
    SELECT COUNT(*)::text AS count FROM services
  `;
  if (Number(serviceCount) === 0) {
    for (const service of mockServices) {
      await sql`
        INSERT INTO services (
          id, name, description, duration, price, category, image_url, is_popular, active
        ) VALUES (
          ${service.id},
          ${service.name},
          ${service.description ?? ''},
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
        INSERT INTO products (id, name, description, price, image_url, images, category, stock, active)
        VALUES (
          ${product.id},
          ${product.name},
          ${product.description},
          ${product.price},
          ${product.imageUrl},
          ${JSON.stringify(product.images)}::jsonb,
          ${product.category},
          ${product.stock},
          ${product.active}
        )
      `;
    }
  }
}

export async function listServices(): Promise<ServiceRecord[]> {
  const rows = await sql<{
    id: string;
    name: string;
    description: string | null;
    duration: number;
    price: number;
    category: Service['category'];
    image_url: string | null;
    is_popular: boolean;
    active: boolean;
  }[]>`
    SELECT id, name, description, duration, price, category, image_url, is_popular, active
    FROM services
    WHERE active = TRUE
    ORDER BY price ASC, name ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    duration: row.duration,
    price: row.price,
    category: row.category,
    imageUrl: row.image_url,
    isPopular: row.is_popular,
    active: row.active,
  }));
}

export async function listAdminServices(): Promise<ServiceRecord[]> {
  const rows = await sql<{
    id: string;
    name: string;
    description: string | null;
    duration: number;
    price: number;
    category: Service['category'];
    image_url: string | null;
    is_popular: boolean;
    active: boolean;
  }[]>`
    SELECT id, name, description, duration, price, category, image_url, is_popular, active
    FROM services
    ORDER BY created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? '',
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
  name: string;
  description?: string;
  duration: number;
  price: number;
  category: Service['category'];
  imageUrl?: string | null;
  isPopular?: boolean;
  active?: boolean;
}

export async function upsertService(input: UpsertServiceInput) {
  await sql`
    INSERT INTO services (
      id, name, description, duration, price, category, image_url, is_popular, active
    ) VALUES (
      ${input.id},
      ${input.name},
      ${input.description ?? ''},
      ${input.duration},
      ${input.price},
      ${input.category},
      ${input.imageUrl ?? null},
      ${input.isPopular ?? false},
      ${input.active ?? true}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
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

export async function listProducts(activeOnly = true): Promise<Product[]> {
  const rows = await sql<{
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    images: unknown;
    category: string;
    stock: number;
    active: boolean;
    created_at: string;
    updated_at: string;
  }[]>`
    SELECT id, name, description, price, image_url, images, category, stock, active, created_at::text, updated_at::text
    FROM products
    ${activeOnly ? sql`WHERE active = TRUE` : sql``}
    ORDER BY created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    imageUrl: row.image_url,
    images:
      Array.isArray(row.images) && row.images.every((value) => typeof value === 'string')
        ? (row.images as string[])
        : row.image_url
          ? [row.image_url]
          : [],
    category: row.category,
    stock: row.stock,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];

  const rows = await sql<{
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    images: unknown;
    category: string;
    stock: number;
    active: boolean;
    created_at: string;
    updated_at: string;
  }[]>`
    SELECT id, name, description, price, image_url, images, category, stock, active, created_at::text, updated_at::text
    FROM products
    WHERE id IN ${sql(ids)}
      AND active = TRUE
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    imageUrl: row.image_url,
    images:
      Array.isArray(row.images) && row.images.every((value) => typeof value === 'string')
        ? (row.images as string[])
        : row.image_url
          ? [row.image_url]
          : [],
    category: row.category,
    stock: row.stock,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export interface UpsertProductInput {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  images?: string[];
  category?: string;
  stock: number;
  active?: boolean;
}

export async function upsertProduct(input: UpsertProductInput) {
  const normalizedImages = Array.isArray(input.images)
    ? input.images.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const primaryImage = input.imageUrl ?? normalizedImages[0] ?? null;
  await sql`
    INSERT INTO products (
      id, name, description, price, image_url, images, category, stock, active
    ) VALUES (
      ${input.id},
      ${input.name},
      ${input.description},
      ${input.price},
      ${primaryImage},
      ${JSON.stringify(normalizedImages)}::jsonb,
      ${input.category ?? 'Üldine'},
      ${input.stock},
      ${input.active ?? true}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      image_url = EXCLUDED.image_url,
      images = EXCLUDED.images,
      category = EXCLUDED.category,
      stock = EXCLUDED.stock,
      active = EXCLUDED.active,
      updated_at = NOW()
  `;
}

export async function deleteProduct(id: string) {
  await sql`DELETE FROM products WHERE id = ${id}`;
}
