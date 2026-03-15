import { NextResponse } from 'next/server';
import { adminCount, ensureAdminTables } from '@/lib/admin-auth';

export async function GET() {
  try {
    await ensureAdminTables();
    const count = await adminCount();
    return NextResponse.json({
      ok: true,
      hasAdmin: count > 0,
    });
  } catch (error) {
    console.error('GET /api/admin/status error:', error);
    return NextResponse.json({ error: 'Failed to load admin status' }, { status: 500 });
  }
}

