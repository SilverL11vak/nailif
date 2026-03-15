import { NextResponse } from 'next/server';
import {
  deleteProduct,
  ensureCatalogTables,
  listProducts,
  upsertProduct,
} from '@/lib/catalog';
import { getAdminFromCookies } from '@/lib/admin-auth';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function GET(request: Request) {
  try {
    await ensureCatalogTables();
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get('admin') === '1';
    if (admin) {
      const adminUser = await getAdminFromCookies();
      if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    const products = await listProducts(!admin);
    return NextResponse.json({ ok: true, products });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureCatalogTables();
    const payload = (await request.json()) as Partial<{
      id: string;
      name: string;
      description: string;
      price: number;
      imageUrl: string | null;
      images: string[];
      category: string;
      stock: number;
      active: boolean;
    }>;

    const name = payload.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const id = payload.id?.trim() || slugify(name);

    await upsertProduct({
      id,
      name,
      description: payload.description ?? '',
      price: Number(payload.price ?? 0),
      imageUrl: payload.imageUrl ?? null,
      images: payload.images ?? [],
      category: payload.category?.trim() || 'Üldine',
      stock: Number(payload.stock ?? 0),
      active: payload.active ?? true,
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Failed to save product' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureCatalogTables();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
    }
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/products error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
