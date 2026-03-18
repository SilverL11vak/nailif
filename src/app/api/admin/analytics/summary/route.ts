import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { getAdminAnalyticsSummary } from '@/lib/admin-analytics-summary';

export async function GET() {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await getAdminAnalyticsSummary();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/admin/analytics/summary error:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}

