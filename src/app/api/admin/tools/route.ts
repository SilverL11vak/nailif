import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { sql } from '@/lib/db';

type Action =
  | 'clear_bookings'
  | 'clear_orders'
  | 'clear_analytics'
  | 'vacation_mode'
  | 'disable_all_spots'
  | 'enable_all_spots'
  | 'disable_spots_range'
  | 'enable_spots_range';

interface VacationPayload {
  from: string;
  to: string;
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminFromCookies();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { action: Action; payload?: VacationPayload };
    const { action } = body;

    switch (action) {
      case 'clear_bookings': {
        const result = await sql`DELETE FROM bookings`;
        return NextResponse.json({ ok: true, deleted: result.count ?? 0 });
      }

      case 'clear_orders': {
        const result = await sql`DELETE FROM orders`;
        return NextResponse.json({ ok: true, deleted: result.count ?? 0 });
      }

      case 'clear_analytics': {
        await sql`DELETE FROM booking_analytics_slot_clicks`;
        await sql`DELETE FROM booking_analytics_events`;
        const result = await sql`DELETE FROM booking_analytics_sessions`;
        return NextResponse.json({ ok: true, deleted: result.count ?? 0 });
      }

      case 'vacation_mode': {
        const { from, to } = body.payload ?? {};
        if (!from || !to) {
          return NextResponse.json({ error: 'From and To dates are required' }, { status: 400 });
        }

        const result = await sql`
          UPDATE time_slots
          SET available = FALSE, updated_at = NOW()
          WHERE slot_date >= ${from}::date
            AND slot_date <= ${to}::date
            AND available = TRUE
        `;
        return NextResponse.json({ ok: true, blocked: result.count ?? 0 });
      }

      case 'disable_all_spots': {
        const result = await sql`
          UPDATE time_slots ts
          SET available = FALSE, is_sos = FALSE, sos_surcharge = NULL, sos_label = NULL, updated_at = NOW()
          WHERE NOT EXISTS (
            SELECT 1
            FROM bookings b
            WHERE b.slot_date = ts.slot_date
              AND b.slot_time = ts.slot_time
              AND b.status <> 'cancelled'
          )
        `;
        return NextResponse.json({ ok: true, updated: result.count ?? 0 });
      }

      case 'enable_all_spots': {
        const result = await sql`
          UPDATE time_slots ts
          SET available = TRUE, updated_at = NOW()
          WHERE NOT EXISTS (
            SELECT 1
            FROM bookings b
            WHERE b.slot_date = ts.slot_date
              AND b.slot_time = ts.slot_time
              AND b.status <> 'cancelled'
          )
        `;
        return NextResponse.json({ ok: true, updated: result.count ?? 0 });
      }

      case 'disable_spots_range': {
        const { from, to } = body.payload ?? {};
        if (!from || !to) {
          return NextResponse.json({ error: 'From and To dates are required' }, { status: 400 });
        }
        const result = await sql`
          UPDATE time_slots ts
          SET available = FALSE, is_sos = FALSE, sos_surcharge = NULL, sos_label = NULL, updated_at = NOW()
          WHERE ts.slot_date >= ${from}::date
            AND ts.slot_date <= ${to}::date
            AND NOT EXISTS (
              SELECT 1
              FROM bookings b
              WHERE b.slot_date = ts.slot_date
                AND b.slot_time = ts.slot_time
                AND b.status <> 'cancelled'
            )
        `;
        return NextResponse.json({ ok: true, updated: result.count ?? 0 });
      }

      case 'enable_spots_range': {
        const { from, to } = body.payload ?? {};
        if (!from || !to) {
          return NextResponse.json({ error: 'From and To dates are required' }, { status: 400 });
        }
        const result = await sql`
          UPDATE time_slots ts
          SET available = TRUE, updated_at = NOW()
          WHERE ts.slot_date >= ${from}::date
            AND ts.slot_date <= ${to}::date
            AND NOT EXISTS (
              SELECT 1
              FROM bookings b
              WHERE b.slot_date = ts.slot_date
                AND b.slot_time = ts.slot_time
                AND b.status <> 'cancelled'
            )
        `;
        return NextResponse.json({ ok: true, updated: result.count ?? 0 });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/admin/tools error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
