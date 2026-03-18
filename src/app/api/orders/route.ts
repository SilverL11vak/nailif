import { NextResponse } from 'next/server';
import { ensureOrdersTable, listOrders, listOrdersCompact } from '@/lib/orders';
import { getAdminFromCookies } from '@/lib/admin-auth';

export async function GET(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureOrdersTable();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') ?? '100');
    const compact = searchParams.get('compact') === '1';
    const orders = compact ? await listOrdersCompact(limit) : await listOrders(limit);
    return NextResponse.json({ ok: true, count: orders.length, orders });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}
