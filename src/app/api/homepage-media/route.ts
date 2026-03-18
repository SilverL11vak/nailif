import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import {
  listHomepageMedia,
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
    const mediaMap = items.reduce<Record<string, string>>((acc, item) => {
      acc[item.key] = item.imageUrl;
      return acc;
    }, {});

    return NextResponse.json(
      { ok: true, items, mediaMap },
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

    const payload = (await request.json()) as
      | {
          items?: Array<{
            key: string;
            imageUrl: string;
            mediaType?: 'image' | 'video';
            videoLoop?: boolean;
            label?: string;
            section?: string;
            sortOrder?: number;
          }>;
        }
      | {
          key?: string;
          imageUrl?: string;
          mediaType?: 'image' | 'video';
          videoLoop?: boolean;
          label?: string;
          section?: string;
          sortOrder?: number;
        };

    if ('items' in payload && Array.isArray(payload.items)) {
      const sanitized = payload.items
        .filter((item) => item.key?.trim())
        .map((item) => ({
          key: item.key.trim(),
          imageUrl: (item.imageUrl ?? '').trim(),
          mediaType: (item.mediaType === 'video' ? 'video' : 'image') as 'image' | 'video',
          videoLoop: Boolean(item.videoLoop),
          label: item.label,
          section: item.section,
          sortOrder: item.sortOrder,
        }));

      await upsertHomepageMediaBulk(sanitized);
      return NextResponse.json({ ok: true, updated: sanitized.length });
    }

    if (!('key' in payload) || !payload.key?.trim() || !('imageUrl' in payload)) {
      return NextResponse.json({ error: 'key and imageUrl are required' }, { status: 400 });
    }

    await upsertHomepageMedia({
      key: payload.key.trim(),
      imageUrl: payload.imageUrl?.trim() ?? '',
      mediaType: payload.mediaType === 'video' ? 'video' : 'image',
      videoLoop: Boolean(payload.videoLoop),
      label: payload.label,
      section: payload.section,
      sortOrder: payload.sortOrder,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/homepage-media error:', error);
    return NextResponse.json({ error: 'Failed to update homepage media' }, { status: 500 });
  }
}
