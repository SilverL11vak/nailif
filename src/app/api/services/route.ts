import { NextResponse } from 'next/server';
import type { Service } from '@/store/booking-types';
import {
  deleteService,
  ensureCatalogTables,
  listAdminServices,
  listServices,
  upsertService,
} from '@/lib/catalog';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { getLocaleFromPathname } from '@/lib/i18n/locale-path';

const SERVICES_CACHE_TTL_MS = 30_000;
type ServicesCacheEntry = { expiresAt: number; services: Service[] };
const servicesCache = new Map<string, ServicesCacheEntry>();

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function isCategory(value: string): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams, pathname } = new URL(request.url);
    const admin = searchParams.get('admin') === '1';
    const locale = searchParams.get('lang') ?? getLocaleFromPathname(pathname) ?? 'et';

    // Stabilize homepage performance by preventing repeated DB reads.
    if (!admin) {
      const cached = servicesCache.get(locale);
      if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json(
          { ok: true, services: cached.services },
          {
            headers: {
              // Short cache so admin service edits show on homepage within ~30s
              'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
            },
          }
        );
      }
    }

    await ensureCatalogTables();
    if (admin) {
      const adminUser = await getAdminFromCookies();
      if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    const services = admin ? await listAdminServices(locale) : await listServices(locale);

    if (!admin) {
      servicesCache.set(locale, {
        expiresAt: Date.now() + SERVICES_CACHE_TTL_MS,
        services,
      });
    }

    return NextResponse.json(
      { ok: true, services },
      admin
        ? undefined
        : {
            headers: {
              // Short cache so admin service edits show on homepage within ~30s
              'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
            },
          }
    );
  } catch (error) {
    console.error('GET /api/services error:', error);
    return NextResponse.json({ error: 'Failed to load services' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureCatalogTables();
    const payload = (await request.json()) as Partial<{
      id: string;
      nameEt: string;
      nameEn: string;
      descriptionEt: string;
      descriptionEn: string;
      resultDescriptionEt: string;
      resultDescriptionEn: string;
      longevityDescriptionEt: string;
      longevityDescriptionEn: string;
      suitabilityNoteEt: string;
      suitabilityNoteEn: string;
      duration: number;
      price: number;
      category: string;
      imageUrl: string | null;
      isPopular: boolean;
      sortOrder: number;
      active: boolean;
    }>;

    const nameEt = payload.nameEt?.trim();
    if (!nameEt) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
    }
    if (!payload.category || !isCategory(payload.category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const id = payload.id?.trim() || slugify(nameEt);

    await upsertService({
      id,
      nameEt,
      nameEn: payload.nameEn ?? '',
      descriptionEt: payload.descriptionEt ?? '',
      descriptionEn: payload.descriptionEn ?? '',
      resultDescriptionEt: payload.resultDescriptionEt ?? payload.descriptionEt ?? '',
      resultDescriptionEn: payload.resultDescriptionEn ?? '',
      longevityDescriptionEt: payload.longevityDescriptionEt ?? '',
      longevityDescriptionEn: payload.longevityDescriptionEn ?? '',
      suitabilityNoteEt: payload.suitabilityNoteEt ?? '',
      suitabilityNoteEn: payload.suitabilityNoteEn ?? '',
      duration: Number(payload.duration ?? 45),
      price: Number(payload.price ?? 0),
      category: payload.category,
      imageUrl: payload.imageUrl ?? null,
      isPopular: Boolean(payload.isPopular),
      sortOrder: Number(payload.sortOrder ?? 0),
      active: payload.active ?? true,
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('POST /api/services error:', error);
    return NextResponse.json({ error: 'Failed to save service' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureCatalogTables();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Service id is required' }, { status: 400 });
    }
    await deleteService(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/services error:', error);
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
  }
}
