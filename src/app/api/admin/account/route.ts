import { NextResponse } from 'next/server';
import {
  changeAdminPassword,
  ensureAdminTables,
  getAdminFromCookies,
  updateAdminName,
} from '@/lib/admin-auth';

export async function GET() {
  try {
    await ensureAdminTables();
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      admin,
    });
  } catch (error) {
    console.error('GET /api/admin/account error:', error);
    return NextResponse.json({ error: 'Failed to load account' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureAdminTables();
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as Partial<{
      name: string;
      currentPassword: string;
      newPassword: string;
    }>;

    let updatedName: string | null | undefined;
    if (typeof payload.name === 'string') {
      updatedName = payload.name.trim() || null;
      await updateAdminName(admin.id, updatedName);
    }

    if (payload.newPassword || payload.currentPassword) {
      if (!payload.currentPassword || !payload.newPassword) {
        return NextResponse.json(
          { error: 'Current password and new password are required' },
          { status: 400 }
        );
      }
      if (payload.newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters' },
          { status: 400 }
        );
      }

      const changed = await changeAdminPassword({
        adminUserId: admin.id,
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      });

      if (!changed.ok) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        passwordChanged: true,
        admin: { ...admin, name: updatedName ?? admin.name },
      });
    }

    return NextResponse.json({
      ok: true,
      passwordChanged: false,
      admin: { ...admin, name: updatedName ?? admin.name },
    });
  } catch (error) {
    console.error('PATCH /api/admin/account error:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}
