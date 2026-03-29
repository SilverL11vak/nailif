import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import {
  listHomepageMedia,
  type LocalizedValue,
  upsertHomepageMedia,
  upsertHomepageMediaBulk,
} from '@/lib/homepage-media';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get('admin') === '1';

    if (admin) {
      const adminUser = await getAdminFromCookies();
      if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const items = await listHomepageMedia();
    const locale = searchParams.get('lang') === 'en' ? 'en' : 'et';
    const mediaMap = items.reduce<Record<string, string>>((acc, item) => {
      acc[item.key] = item.imageUrl;
      return acc;
    }, {});
    const labelMap = items.reduce<Record<string, string>>((acc, item) => {
      acc[item.key] = locale === 'en' ? item.label.en : item.label.et;
      return acc;
    }, {});

    return NextResponse.json(
      { ok: true, items, mediaMap, labelMap },
      admin
        ? undefined
        : {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
            },
          }
    );
  } catch (error) {
    console.error('GET /api/homepage-media error:', error);
    return NextResponse.json({ error: 'Failed to load homepage media' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as {
      key?: unknown;
      imageUrl?: unknown;
      mediaType?: unknown;
      videoLoop?: unknown;
      label?: unknown;
      section?: unknown;
      sortOrder?: unknown;
      items?: unknown;
    };

    if ('items' in payload && Array.isArray(payload.items)) {
      const incomingItems = payload.items as Array<Record<string, unknown>>;
      const sanitized = incomingItems
        .filter((item) => String(item.key ?? '').trim())
        .map((item) => ({
          key: String(item.key).trim(),
          imageUrl: String(item.imageUrl ?? '').trim(),
          mediaType: (item.mediaType === 'video' ? 'video' : 'image') as 'image' | 'video',
          videoLoop: Boolean(item.videoLoop),
          label: item.label as LocalizedValue | string | undefined,
          section: typeof item.section === 'string' ? item.section : undefined,
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : undefined,
        }));

      await upsertHomepageMediaBulk(sanitized);
      return NextResponse.json({ ok: true, updated: sanitized.length });
    }

    if (!('key' in payload) || !String(payload.key ?? '').trim() || !('imageUrl' in payload)) {
      return NextResponse.json({ error: 'key and imageUrl are required' }, { status: 400 });
    }

    await upsertHomepageMedia({
      key: String(payload.key).trim(),
      imageUrl: String(payload.imageUrl ?? '').trim(),
      mediaType: payload.mediaType === 'video' ? 'video' : 'image',
      videoLoop: Boolean(payload.videoLoop),
      label: payload.label as LocalizedValue | string | undefined,
      section: typeof payload.section === 'string' ? payload.section : undefined,
      sortOrder: typeof payload.sortOrder === 'number' ? payload.sortOrder : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/homepage-media error:', error);
    return NextResponse.json({ error: 'Failed to update homepage media' }, { status: 500 });
  }
}
