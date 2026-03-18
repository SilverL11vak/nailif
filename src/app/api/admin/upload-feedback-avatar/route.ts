import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getAdminFromCookies } from '@/lib/admin-auth';

export const runtime = 'nodejs';

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
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const contentType = file.type || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const ext = contentType.split('/')[1]?.toLowerCase() || 'png';
    const safeExt = ext.replace(/[^a-z0-9]+/g, '').slice(0, 8) || 'png';
    const key = `feedback/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;

    try {
      const blob = await put(key, Buffer.from(arrayBuffer), {
        access: 'public',
        contentType,
        token,
      });
      return NextResponse.json({ ok: true, url: blob.url });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('cannot use public access') && message.toLowerCase().includes('private store')) {
        return NextResponse.json(
          {
            error:
              'Vercel Blob store is PRIVATE, but feedback avatars must be PUBLIC to show on the homepage. Create a PUBLIC blob store and set BLOB_READ_WRITE_TOKEN to that store token.',
          },
          { status: 400 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error('POST /api/admin/upload-feedback-avatar error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

