import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import {
  listFeedback,
  type LocalizedValue,
  upsertFeedback,
  deleteFeedback,
  setFeedbackVisibility,
  updateFeedbackSortOrder,
} from '@/lib/feedback';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const visibleParam = searchParams.get('visible');
    const admin = searchParams.get('admin') === '1';

    if (admin) {
      const adminUser = await getAdminFromCookies();
      if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const items = await listFeedback(false);
      return NextResponse.json({ ok: true, feedback: items });
    }

    const visibleOnly = visibleParam === '1' || visibleParam === 'true';
    const items = await listFeedback(visibleOnly);
    return NextResponse.json(
      { ok: true, feedback: items },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/feedback error:', error);
    return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as {
      id?: unknown;
      clientName?: unknown;
      clientAvatarUrl?: unknown;
      rating?: unknown;
      feedbackText?: unknown;
      serviceId?: unknown;
      sourceLabel?: unknown;
      sortOrder?: unknown;
      isVisible?: unknown;
    };

    const clientName = String(payload.clientName ?? '').trim();
    if (!clientName) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const id =
      String(payload.id ?? '').trim() ||
      clientName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) ||
      `feedback-${Date.now()}`;

    await upsertFeedback({
      id,
      clientName,
      clientAvatarUrl:
        typeof payload.clientAvatarUrl === 'string' ? payload.clientAvatarUrl : null,
      rating: typeof payload.rating === 'number' ? payload.rating : 5,
      feedbackText: (payload.feedbackText as LocalizedValue | string | undefined) ?? '',
      serviceId: typeof payload.serviceId === 'string' ? payload.serviceId : null,
      sourceLabel: (payload.sourceLabel as LocalizedValue | string | null | undefined) ?? null,
      sortOrder: typeof payload.sortOrder === 'number' ? payload.sortOrder : 0,
      isVisible: payload.isVisible !== false,
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('POST /api/feedback error:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as {
      id: string;
      isVisible?: boolean;
      sortOrder?: number;
    };

    const id = payload.id?.trim();
    if (!id) {
      return NextResponse.json({ error: 'Feedback id is required' }, { status: 400 });
    }

    if (typeof payload.isVisible === 'boolean') {
      await setFeedbackVisibility(id, payload.isVisible);
    }
    if (typeof payload.sortOrder === 'number') {
      await updateFeedbackSortOrder(id, payload.sortOrder);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/feedback error:', error);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
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
      return NextResponse.json({ error: 'Feedback id is required' }, { status: 400 });
    }

    await deleteFeedback(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/feedback error:', error);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
