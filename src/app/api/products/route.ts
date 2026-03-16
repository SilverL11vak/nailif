import { NextResponse } from 'next/server';
import {
  deleteProduct,
  ensureCatalogTables,
  listProducts,
  upsertProduct,
} from '@/lib/catalog';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { getLocaleFromPathname } from '@/lib/i18n/locale-path';

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
    const { searchParams, pathname } = new URL(request.url);
    const admin = searchParams.get('admin') === '1';
    const locale = searchParams.get('lang') ?? getLocaleFromPathname(pathname) ?? 'et';
    if (admin) {
      const adminUser = await getAdminFromCookies();
      if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    const products = await listProducts(!admin, locale);
    return NextResponse.json(
      { ok: true, products },
      admin
        ? undefined
        : {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
            },
          }
    );
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
      nameEt: string;
      nameEn: string;
      descriptionEt: string;
      descriptionEn: string;
      price: number;
      imageUrl: string | null;
      images: string[];
      categoryEt: string;
      categoryEn: string;
      stock: number;
      active: boolean;
      isFeatured: boolean;
    }>;

    const nameEt = payload.nameEt?.trim();
    if (!nameEt) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const id = payload.id?.trim() || slugify(nameEt);

    await upsertProduct({
      id,
      nameEt,
      nameEn: payload.nameEn ?? '',
      descriptionEt: payload.descriptionEt ?? '',
      descriptionEn: payload.descriptionEn ?? '',
      price: Number(payload.price ?? 0),
      imageUrl: payload.imageUrl ?? null,
      images: payload.images ?? [],
      categoryEt: payload.categoryEt?.trim() || 'Üldine',
      categoryEn: payload.categoryEn?.trim() || '',
      stock: Number(payload.stock ?? 0),
      active: payload.active ?? true,
      isFeatured: payload.isFeatured ?? false,
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
