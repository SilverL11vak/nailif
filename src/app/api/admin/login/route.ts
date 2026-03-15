import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  adminCount,
  authenticateAdmin,
  createAdminSession,
  createAdminUser,
  ensureAdminTables,
  getSessionMaxAgeSeconds,
} from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<{
      email: string;
      password: string;
      name: string;
      createIfEmpty: boolean;
    }>;

    const email = payload.email?.trim();
    const password = payload.password ?? '';
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await ensureAdminTables();
    const count = await adminCount();

    if (count === 0 && payload.createIfEmpty) {
      await createAdminUser({
        email,
        password,
        name: payload.name?.trim() || 'Sandra',
      });
    }

    const admin = await authenticateAdmin(email, password);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const session = await createAdminSession(admin.id);
    const response = NextResponse.json({
      ok: true,
      admin,
    });

    response.cookies.set(ADMIN_SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: getSessionMaxAgeSeconds(),
    });

    return response;
  } catch (error) {
    console.error('POST /api/admin/login error:', error);
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
  }
}
