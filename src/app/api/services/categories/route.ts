import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import {
  deleteServiceCategory,
  ensureCatalogTables,
  listServiceCategories,
  upsertServiceCategory,
} from '@/lib/catalog';
import { getLocaleFromPathname } from '@/lib/i18n/locale-path';

export async function GET(request: Request) {
  try {
    await ensureCatalogTables();
    const { searchParams, pathname } = new URL(request.url);
    const admin = searchParams.get('admin') === '1';
    const locale = searchParams.get('lang') ?? getLocaleFromPathname(pathname) ?? 'et';
    if (admin) {
      const adminUser = await getAdminFromCookies();
      if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const categories = await listServiceCategories(locale, !admin);
    return NextResponse.json({ ok: true, categories });
  } catch (error) {
    console.error('GET /api/services/categories error:', error);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureCatalogTables();
    const payload = (await request.json()) as Partial<{
      id: string;
      nameEt: string;
      nameEn: string;
      sortOrder: number;
      active: boolean;
    }>;
    const nameEt = payload.nameEt?.trim();
    if (!nameEt) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    const id = await upsertServiceCategory({
      id: payload.id?.trim(),
      nameEt,
      nameEn: payload.nameEn?.trim() ?? '',
      sortOrder: Number(payload.sortOrder ?? 0),
      active: payload.active ?? true,
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('POST /api/services/categories error:', error);
    return NextResponse.json({ error: 'Failed to save category' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureCatalogTables();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ error: 'Category id is required' }, { status: 400 });
    const result = await deleteServiceCategory(id);
    if (!result.ok && result.reason === 'CATEGORY_IN_USE') {
      return NextResponse.json({ error: 'Category is used by existing services' }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/services/categories error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}

