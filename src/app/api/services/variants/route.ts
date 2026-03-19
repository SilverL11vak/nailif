import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { ensureCatalogTables, deleteVariant, upsertVariant } from '@/lib/catalog';

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await ensureCatalogTables();
    const body = (await request.json()) as {
      id?: string;
      serviceId: string;
      name: string;
      nameEt?: string;
      nameEn?: string;
      price: number;
      duration: number;
      depositAmount?: number | null;
      isActive?: boolean;
      orderIndex?: number;
    };
    const serviceId = body.serviceId?.trim();
    const name = body.name?.trim();
    if (!serviceId || !name) {
      return NextResponse.json({ error: 'serviceId and name required' }, { status: 400 });
    }
    const id = body.id?.trim() || `variant-${serviceId}-${Date.now()}`;
    await upsertVariant({
      id,
      serviceId,
      name,
      nameEt: body.nameEt,
      nameEn: body.nameEn,
      price: Number(body.price) || 0,
      duration: Number(body.duration) || 45,
      depositAmount: body.depositAmount ?? null,
      isActive: body.isActive ?? true,
      orderIndex: body.orderIndex ?? 0,
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error('POST /api/services/variants error:', e);
    return NextResponse.json({ error: 'Failed to save variant' }, { status: 500 });
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
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    await ensureCatalogTables();
    await deleteVariant(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/services/variants error:', e);
    return NextResponse.json({ error: 'Failed to delete variant' }, { status: 500 });
  }
}
