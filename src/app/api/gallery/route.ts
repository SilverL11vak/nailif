import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import {
  createGalleryImage,
  deleteGalleryImage,
  listGalleryImages,
  reorderGalleryImages,
  updateGalleryImage,
} from '@/lib/gallery';

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

    const images = await listGalleryImages();
    return NextResponse.json(
      { ok: true, images },
      admin
        ? undefined
        : {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
            },
          }
    );
  } catch (error) {
    console.error('GET /api/gallery error:', error);
    return NextResponse.json({ error: 'Failed to load gallery' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as Partial<{
      imageUrl: string;
      caption: string;
      isFeatured: boolean;
    }>;
    if (!payload.imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const id = await createGalleryImage({
      imageUrl: payload.imageUrl,
      caption: payload.caption ?? '',
      isFeatured: payload.isFeatured ?? false,
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('POST /api/gallery error:', error);
    return NextResponse.json({ error: 'Failed to add image' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as Partial<{
      id: string;
      caption: string;
      imageUrl: string;
      isFeatured: boolean;
      orderedIds: string[];
    }>;

    if (Array.isArray(payload.orderedIds) && payload.orderedIds.length > 0) {
      await reorderGalleryImages(payload.orderedIds);
      return NextResponse.json({ ok: true, reordered: true });
    }

    if (!payload.id) {
      return NextResponse.json({ error: 'Image id is required' }, { status: 400 });
    }

    const updated = await updateGalleryImage({
      id: payload.id,
      caption: payload.caption,
      imageUrl: payload.imageUrl,
      isFeatured: payload.isFeatured,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: updated });
  } catch (error) {
    console.error('PATCH /api/gallery error:', error);
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Image id is required' }, { status: 400 });
    }

    await deleteGalleryImage(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/gallery error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
