import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import {
  createTeamMember,
  deleteTeamMember,
  listTeamMembers,
  reorderTeamMembers,
  type TeamMemberInput,
  updateTeamMember,
} from '@/lib/team';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get('admin') === '1';
    const locale = searchParams.get('lang') === 'en' ? 'en' : 'et';

    if (admin) {
      const adminUser = await getAdminFromCookies();
      if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const members = await listTeamMembers({ admin, locale });
    return NextResponse.json(
      { ok: true, members },
      admin
        ? undefined
        : {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
            },
          }
    );
  } catch (error) {
    console.error('GET /api/team error:', error);
    return NextResponse.json({ error: 'Failed to load team members' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as Partial<TeamMemberInput>;
    const fullNameRaw = payload.fullName;
    const localizedName =
      fullNameRaw && typeof fullNameRaw === 'object'
        ? (fullNameRaw as Partial<Record<'et' | 'en', unknown>>)
        : null;
    const hasName =
      typeof fullNameRaw === 'string'
        ? fullNameRaw.trim().length > 0
        : Boolean(
            (typeof localizedName?.et === 'string' && localizedName.et.trim().length > 0) ||
              (typeof localizedName?.en === 'string' && localizedName.en.trim().length > 0)
          );
    if (!hasName) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    const id = await createTeamMember({ ...payload, fullName: payload.fullName ?? '' });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('POST /api/team error:', error);
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as Partial<TeamMemberInput> & { orderedIds?: unknown };

    if (Array.isArray(payload.orderedIds) && payload.orderedIds.length > 0) {
      const orderedIds = payload.orderedIds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      if (orderedIds.length === 0) {
        return NextResponse.json({ error: 'orderedIds must include at least one id' }, { status: 400 });
      }
      await reorderTeamMembers(orderedIds);
      return NextResponse.json({ ok: true, reordered: true });
    }

    if (typeof payload.id !== 'string' || !payload.id.trim()) {
      return NextResponse.json({ error: 'Team member id is required' }, { status: 400 });
    }

    const updated = await updateTeamMember({ ...payload, id: payload.id });

    if (!updated) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: updated });
  } catch (error) {
    console.error('PATCH /api/team error:', error);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
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
      return NextResponse.json({ error: 'Team member id is required' }, { status: 400 });
    }

    await deleteTeamMember(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/team error:', error);
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 });
  }
}
