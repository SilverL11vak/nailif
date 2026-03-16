import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import {
  deleteBookingAddOn,
  ensureBookingContentTables,
  listAdminBookingAddOns,
  listBookingAddOns,
  upsertBookingAddOn,
} from '@/lib/booking-content';
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
    await ensureBookingContentTables();
    const { searchParams, pathname } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === '1';

    if (isAdmin) {
      const admin = await getAdminFromCookies();
      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const addOns = await listAdminBookingAddOns();
      return NextResponse.json({ ok: true, addOns });
    }

    const lang = searchParams.get('lang');
    const locale = lang === 'en' ? 'en' : (getLocaleFromPathname(pathname) ?? 'et');
    const addOns = await listBookingAddOns(locale);
    return NextResponse.json(
      { ok: true, addOns },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/booking-addons error:', error);
    return NextResponse.json({ error: 'Failed to load booking add-ons' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureBookingContentTables();
    const payload = (await request.json()) as Partial<{
      id: string;
      nameEt: string;
      nameEn: string;
      descriptionEt: string;
      descriptionEn: string;
      duration: number;
      price: number;
      sortOrder: number;
      active: boolean;
    }>;

    const nameEt = payload.nameEt?.trim();
    if (!nameEt) {
      return NextResponse.json({ error: 'Add-on name is required' }, { status: 400 });
    }

    await upsertBookingAddOn({
      id: payload.id?.trim() || slugify(nameEt),
      nameEt,
      nameEn: (payload.nameEn ?? '').trim(),
      descriptionEt: (payload.descriptionEt ?? '').trim(),
      descriptionEn: (payload.descriptionEn ?? '').trim(),
      duration: Number(payload.duration ?? 0),
      price: Number(payload.price ?? 0),
      sortOrder: Number(payload.sortOrder ?? 0),
      active: payload.active ?? true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/booking-addons error:', error);
    return NextResponse.json({ error: 'Failed to save booking add-on' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureBookingContentTables();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Add-on id is required' }, { status: 400 });
    }

    await deleteBookingAddOn(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/booking-addons error:', error);
    return NextResponse.json({ error: 'Failed to delete booking add-on' }, { status: 500 });
  }
}
