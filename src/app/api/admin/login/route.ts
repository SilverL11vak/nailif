import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  authenticateAdmin,
  createAdminSession,
  ensureAdminTables,
  getSessionMaxAgeSeconds,
} from '@/lib/admin-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limit check - prevent brute force attacks
    const rateLimit = checkRateLimit('login', request.headers);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter ?? 60) } }
      );
    }

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
