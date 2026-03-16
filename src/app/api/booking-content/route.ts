import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import {
  ensureBookingContentTables,
  listAdminBookingContent,
  listBookingContent,
  type BookingContentKey,
  upsertBookingContent,
} from '@/lib/booking-content';
import { getLocaleFromPathname } from '@/lib/i18n/locale-path';

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
      const content = await listAdminBookingContent();
      return NextResponse.json({ ok: true, content });
    }

    const lang = searchParams.get('lang');
    const locale = lang === 'en' ? 'en' : (getLocaleFromPathname(pathname) ?? 'et');
    const content = await listBookingContent(locale);
    return NextResponse.json(
      { ok: true, content },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/booking-content error:', error);
    return NextResponse.json({ error: 'Failed to load booking content' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureBookingContentTables();
    const payload = (await request.json()) as {
      entries?: Array<{ key: BookingContentKey; valueEt?: string; valueEn?: string }>;
    };

    if (!Array.isArray(payload.entries)) {
      return NextResponse.json({ error: 'Entries are required' }, { status: 400 });
    }

    await upsertBookingContent(
      payload.entries.map((entry) => ({
        key: entry.key,
        valueEt: (entry.valueEt ?? '').trim(),
        valueEn: (entry.valueEn ?? '').trim(),
      }))
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/booking-content error:', error);
    return NextResponse.json({ error: 'Failed to save booking content' }, { status: 500 });
  }
}
