import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { sql } from '@/lib/db';
import { ensureFeedbackTable } from '@/lib/feedback';

export async function GET(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim() || '';
    
    if (query.length < 2) {
      return NextResponse.json({ services: [], products: [], bookings: [], orders: [], feedback: [] });
    }

    // Search services
    const services = await sql<{
      id: string;
      name: string;
      name_et: string | null;
      name_en: string | null;
      category: string;
      price: number;
    }[]>`
      SELECT id, name, name_et, name_en, category, price
      FROM services
      WHERE active = true 
        AND (LOWER(name) LIKE ${`%${query}%`} 
          OR LOWER(name_et) LIKE ${`%${query}%`}
          OR LOWER(name_en) LIKE ${`%${query}%`}
          OR LOWER(category) LIKE ${`%${query}%`})
      ORDER BY is_featured DESC, name
      LIMIT 5
    `;

    // Search products
    const products = await sql<{
      id: string;
      name: string;
      name_et: string | null;
      name_en: string | null;
      category: string;
      price: number;
      active: boolean;
    }[]>`
      SELECT id, name, name_et, name_en, category, price, active
      FROM products
      WHERE active = true
        AND (LOWER(name) LIKE ${`%${query}%`}
          OR LOWER(name_et) LIKE ${`%${query}%`}
          OR LOWER(name_en) LIKE ${`%${query}%`}
          OR LOWER(category) LIKE ${`%${query}%`})
      ORDER BY is_featured DESC, name
      LIMIT 5
    `;

    // Search bookings (by contact name, email, phone; table uses contact_* and slot_*)
    const bookingRows = await sql<{
      id: string;
      contact_first_name: string;
      contact_last_name: string | null;
      contact_email: string | null;
      contact_phone: string;
      status: string;
      slot_date: string;
      slot_time: string;
    }[]>`
      SELECT id, contact_first_name, contact_last_name, contact_email, contact_phone, status, slot_date, slot_time
      FROM bookings
      WHERE LOWER(contact_first_name) LIKE ${`%${query}%`}
        OR LOWER(COALESCE(contact_last_name, '')) LIKE ${`%${query}%`}
        OR LOWER((contact_first_name || ' ' || COALESCE(contact_last_name, ''))) LIKE ${`%${query}%`}
        OR LOWER(COALESCE(contact_email, '')) LIKE ${`%${query}%`}
        OR LOWER(contact_phone) LIKE ${`%${query}%`}
        OR LOWER(id::text) LIKE ${`%${query}%`}
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const bookings = bookingRows.map((b) => ({
      id: b.id,
      customer_name: [b.contact_first_name, b.contact_last_name].filter(Boolean).join(' ').trim(),
      customer_email: b.contact_email ?? '',
      customer_phone: b.contact_phone,
      status: b.status,
      date: b.slot_date,
      time: b.slot_time,
    }));

    // Search orders (table has amount_total, not total)
    const orders = await sql<{
      id: string;
      customer_name: string | null;
      status: string;
      amount_total: number;
    }[]>`
      SELECT id, customer_name, status, amount_total
      FROM orders
      WHERE LOWER(id) LIKE ${`%${query}%`}
        OR LOWER(customer_name) LIKE ${`%${query}%`}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // Search gallery
    const gallery = await sql<{
      id: string;
      image_url: string;
      caption: string;
    }[]>`
      SELECT id, image_url, caption
      FROM gallery
      WHERE LOWER(caption) LIKE ${`%${query}%`}
      ORDER BY is_featured DESC, created_at DESC
      LIMIT 5
    `;

    // Search feedback
    let feedback: { id: string; clientName: string; feedbackText: string; href: string }[] = [];
    try {
      await ensureFeedbackTable();
      const feedbackRows = await sql<{ id: string; client_name: string; feedback_text: string }[]>`
        SELECT id, client_name, feedback_text
        FROM feedback
        WHERE LOWER(client_name) LIKE ${`%${query}%`}
          OR LOWER(feedback_text) LIKE ${`%${query}%`}
          OR LOWER(COALESCE(source_label, '')) LIKE ${`%${query}%`}
        ORDER BY sort_order ASC, created_at DESC
        LIMIT 5
      `;
      feedback = feedbackRows.map((f) => ({
        id: f.id,
        clientName: f.client_name,
        feedbackText: f.feedback_text,
        href: `/admin/feedback?edit=${f.id}`,
      }));
    } catch {
      // feedback table may not exist yet
    }

    return NextResponse.json({
      services: services.map(s => ({
        id: s.id,
        name: s.name_et || s.name,
        nameEn: s.name_en || '',
        category: s.category,
        price: s.price,
        href: `/admin/services?edit=${s.id}`
      })),
      products: products.map(p => ({
        id: p.id,
        name: p.name_et || p.name,
        nameEn: p.name_en || '',
        category: p.category,
        price: p.price,
        href: `/admin/products?edit=${p.id}`
      })),
      bookings: bookings.map(b => ({
        id: b.id,
        customerName: b.customer_name,
        customerEmail: b.customer_email,
        customerPhone: b.customer_phone,
        status: b.status,
        date: b.date,
        time: b.time,
        href: `/admin/bookings?id=${b.id}`
      })),
      orders: orders.map(o => ({
        id: o.id,
        customerName: o.customer_name ?? '',
        status: o.status,
        total: o.amount_total,
        href: `/admin/orders?id=${o.id}`
      })),
      gallery: gallery.map(g => ({
        id: g.id,
        imageUrl: g.image_url,
        caption: g.caption,
        href: `/admin/gallery?edit=${g.id}`
      })),
      feedback
    });
  } catch (error) {
    console.error('Admin search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
