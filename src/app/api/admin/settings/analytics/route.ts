import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { getAnalyticsEnabled, setAnalyticsEnabled } from '@/lib/app-settings';

export async function GET() {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const enabled = await getAnalyticsEnabled();
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('GET /api/admin/settings/analytics error:', error);
    return NextResponse.json({ error: 'Failed to load analytics setting' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = (await request.json()) as { enabled?: boolean };
    const enabled = payload.enabled === true;
    await setAnalyticsEnabled(enabled);
    return NextResponse.json({ ok: true, enabled });
  } catch (error) {
    console.error('PATCH /api/admin/settings/analytics error:', error);
    return NextResponse.json({ error: 'Failed to update analytics setting' }, { status: 500 });
  }
}
