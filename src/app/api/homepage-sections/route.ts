import { NextResponse } from 'next/server';
import { ensureHomepageContentTables, listAdminHomepageSections, upsertHomepageSection, deleteHomepageSection } from '@/lib/homepage-content';
import { getAdminFromCookies } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === '1';

    // Locale is route/query-driven, never inferred from mixed browser header.
    const locale = searchParams.get('lang') === 'en' ? 'en' : 'et';

    if (isAdmin) {
      const adminUser = await getAdminFromCookies();
      if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Admin: return all sections with both languages
      await ensureHomepageContentTables();
      const sections = await listAdminHomepageSections();
      return NextResponse.json({ sections });
    }
    
    // Public: return active sections as localized key-value pairs
    await ensureHomepageContentTables();
    const sections = await listAdminHomepageSections();
    
    const localized: Record<string, string> = {};
    for (const section of sections) {
      if (section.isActive) {
        localized[section.id] = locale === 'et' ? section.valueEt : section.valueEn;
      }
    }
    
    return NextResponse.json({ sections: localized });
  } catch (error) {
    console.error('GET /api/homepage-sections error:', error);
    return NextResponse.json({ error: 'Failed to load homepage sections' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureHomepageContentTables();
    
    const body = await request.json();
    const { entries } = body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
    }
    
    for (const entry of entries) {
      await upsertHomepageSection({
        id: entry.id,
        sectionGroup: entry.sectionGroup,
        sortOrder: entry.sortOrder ?? 0,
        isActive: entry.isActive ?? true,
        valueEt: entry.valueEt ?? '',
        valueEn: entry.valueEn ?? '',
      });
    }
    
    return NextResponse.json({ success: true, message: 'Sections updated' });
  } catch (error) {
    console.error('POST /api/homepage-sections error:', error);
    return NextResponse.json({ error: 'Failed to save homepage sections' }, { status: 500 });
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
      return NextResponse.json({ error: 'No id provided' }, { status: 400 });
    }
    
    await deleteHomepageSection(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/homepage-sections error:', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}
