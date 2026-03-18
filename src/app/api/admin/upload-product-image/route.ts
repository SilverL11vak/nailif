import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getAdminFromCookies } from '@/lib/admin-auth';

export const runtime = 'nodejs';

async function putImageToBlob(file: File, token: string) {
  const contentType = file.type || 'application/octet-stream';
  if (!contentType.startsWith('image/')) {
    throw new Error('Only image uploads are allowed');
  }

  const arrayBuffer = await file.arrayBuffer();
  const ext = contentType.split('/')[1]?.toLowerCase() || 'png';
  const safeExt = ext.replace(/[^a-z0-9]+/g, '').slice(0, 8) || 'png';
  const key = `products/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;

  const blob = await put(key, Buffer.from(arrayBuffer), {
    // We need public blobs because product images are rendered on public pages.
    access: 'public',
    contentType,
    token,
  });
  return blob.url;
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: 'Missing BLOB_READ_WRITE_TOKEN. Add it in Vercel Environment Variables.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    try {
      const files = [
        ...formData
          .getAll('files')
          .filter((value): value is File => value instanceof File),
        ...(formData.get('file') instanceof File ? [formData.get('file') as File] : []),
      ];

      if (files.length === 0) {
        return NextResponse.json({ error: 'File is required' }, { status: 400 });
      }

      const urls = await Promise.all(files.map((file) => putImageToBlob(file, token)));

      // Backwards compatible response: single upload returns { url }, multi returns { urls }.
      if (urls.length === 1) {
        return NextResponse.json({ ok: true, url: urls[0] });
      }
      return NextResponse.json({ ok: true, urls });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('cannot use public access') && message.toLowerCase().includes('private store')) {
        return NextResponse.json(
          {
            error:
              'Vercel Blob store is PRIVATE, but product images must be PUBLIC to show on the website. In Vercel → Storage → Blob → (your store) → Settings, change Access to PUBLIC (or create a new public store), then try again.',
          },
          { status: 400 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error('POST /api/admin/upload-product-image error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

