import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { ensureBookingFunnelEventsTable } from '@/lib/funnel-analytics';
import { sql } from '@/lib/db';

function pct(n: number, d: number) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return 0;
  return (n / d) * 100;
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureBookingFunnelEventsTable();
    const { searchParams } = new URL(request.url);
    const day = (searchParams.get('day') ?? '').trim(); // optional YYYY-MM-DD
    const dayClause = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;

    const [kpi] = await sql<
      Array<{
        cta: number;
        service: number;
        slot_viewed: number;
        slot_clicked: number;
        payment_started: number;
        success: number;
        mobile_success: number;
        desktop_success: number;
      }>
    >`
      WITH bounds AS (
        SELECT
          ${dayClause}::text AS day,
          CASE WHEN ${dayClause}::text IS NULL THEN date_trunc('day', now()) ELSE (${dayClause}::date)::timestamptz END AS t0,
          CASE WHEN ${dayClause}::text IS NULL THEN date_trunc('day', now()) + interval '1 day' ELSE ((${dayClause}::date + interval '1 day')::timestamptz) END AS t1
      ),
      base AS (
        SELECT *
        FROM booking_funnel_events
        WHERE created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)
      )
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'booking_cta_click')::int AS cta,
        COUNT(*) FILTER (WHERE event_name = 'service_selected')::int AS service,
        COUNT(*) FILTER (WHERE event_name = 'slot_viewed')::int AS slot_viewed,
        COUNT(*) FILTER (WHERE event_name = 'slot_clicked')::int AS slot_clicked,
        COUNT(*) FILTER (WHERE event_name = 'payment_started')::int AS payment_started,
        COUNT(*) FILTER (WHERE event_name = 'payment_success')::int AS success,
        COUNT(*) FILTER (WHERE event_name = 'payment_success' AND device = 'mobile')::int AS mobile_success,
        COUNT(*) FILTER (WHERE event_name = 'payment_success' AND device = 'desktop')::int AS desktop_success
      FROM base
      LIMIT 1
    `;

    const funnel = [
      { key: 'booking_cta_click', label: 'CTA', count: kpi?.cta ?? 0 },
      { key: 'service_selected', label: 'Service', count: kpi?.service ?? 0 },
      { key: 'slot_viewed', label: 'Slots viewed', count: kpi?.slot_viewed ?? 0 },
      { key: 'slot_clicked', label: 'Slot clicked', count: kpi?.slot_clicked ?? 0 },
      { key: 'payment_started', label: 'Payment start', count: kpi?.payment_started ?? 0 },
      { key: 'payment_success', label: 'Success', count: kpi?.success ?? 0 },
    ].map((s, i, arr) => {
      const prev = i === 0 ? null : arr[i - 1];
      const dropPct = prev && prev.count > 0 ? 1 - s.count / prev.count : 0;
      return { ...s, dropPctFromPrev: i === 0 ? 0 : dropPct };
    });
    const biggestDropKey =
      funnel.slice(1).sort((a, b) => (b.dropPctFromPrev ?? 0) - (a.dropPctFromPrev ?? 0))[0]?.key ?? null;

    const slotHeatmap = await sql<
      Array<{ slot_id: string | null; clicks: number }>
    >`
      WITH bounds AS (
        SELECT
          CASE WHEN ${dayClause}::text IS NULL THEN date_trunc('day', now()) ELSE (${dayClause}::date)::timestamptz END AS t0,
          CASE WHEN ${dayClause}::text IS NULL THEN date_trunc('day', now()) + interval '1 day' ELSE ((${dayClause}::date + interval '1 day')::timestamptz) END AS t1
      )
      SELECT slot_id, COUNT(*)::int AS clicks
      FROM booking_funnel_events
      WHERE event_name = 'slot_clicked'
        AND created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)
      GROUP BY slot_id
      ORDER BY clicks DESC
      LIMIT 20
    `;

    const servicePerf = await sql<
      Array<{ service_id: string | null; service_name: string | null; selected: number; success: number }>
    >`
      WITH bounds AS (
        SELECT
          CASE WHEN ${dayClause}::text IS NULL THEN date_trunc('day', now()) ELSE (${dayClause}::date)::timestamptz END AS t0,
          CASE WHEN ${dayClause}::text IS NULL THEN date_trunc('day', now()) + interval '1 day' ELSE ((${dayClause}::date + interval '1 day')::timestamptz) END AS t1
      ),
      sel AS (
        SELECT
          service_id,
          MAX(NULLIF(metadata->>'serviceName', '')) AS service_name,
          COUNT(*)::int AS selected
        FROM booking_funnel_events
        WHERE event_name = 'service_selected'
          AND created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)
        GROUP BY service_id
      ),
      suc AS (
        SELECT service_id, COUNT(*)::int AS success
        FROM booking_funnel_events
        WHERE event_name = 'payment_success'
          AND created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)
        GROUP BY service_id
      )
      SELECT
        sel.service_id,
        sel.service_name,
        sel.selected,
        COALESCE(suc.success, 0)::int AS success
      FROM sel
      LEFT JOIN suc ON suc.service_id = sel.service_id
      ORDER BY success DESC, selected DESC
      LIMIT 40
    `;

    const abandon = await sql<
      Array<{ reason: string | null; count: number }>
    >`
      WITH bounds AS (
        SELECT
          CASE WHEN ${dayClause}::text IS NULL THEN date_trunc('day', now()) ELSE (${dayClause}::date)::timestamptz END AS t0,
          CASE WHEN ${dayClause}::text IS NULL THEN date_trunc('day', now()) + interval '1 day' ELSE ((${dayClause}::date + interval '1 day')::timestamptz) END AS t1
      )
      SELECT
        NULLIF(metadata->>'reason', '') AS reason,
        COUNT(*)::int AS count
      FROM booking_funnel_events
      WHERE event_name = 'slot_abandoned'
        AND created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)
      GROUP BY reason
      ORDER BY count DESC
      LIMIT 12
    `;

    return NextResponse.json({
      ok: true,
      funnel: funnel.map((s) => ({ ...s, highlight: s.key === biggestDropKey })),
      slotHeatmap: slotHeatmap.map((r) => ({ slotId: r.slot_id ?? '—', clicks: r.clicks })),
      servicePerformance: servicePerf.map((r) => ({
        serviceId: r.service_id ?? '—',
        serviceName: r.service_name,
        selected: r.selected,
        bookings: r.success,
        conversionPct: pct(r.success, r.selected),
      })),
      deviceConversion: {
        mobileSuccess: kpi?.mobile_success ?? 0,
        desktopSuccess: kpi?.desktop_success ?? 0,
      },
      abandonment: abandon.map((r) => ({ reason: r.reason ?? 'unknown', count: r.count })),
    });
  } catch (error) {
    console.error('GET /api/admin/funnel-analytics/summary error:', error);
    return NextResponse.json({ error: 'Failed to load funnel analytics' }, { status: 500 });
  }
}

