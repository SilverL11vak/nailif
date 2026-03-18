import { ensureAnalyticsTables } from '@/lib/analytics';
import { sql } from '@/lib/db';

export type AdminAnalyticsSummary = {
  ok: true;
  kpis: {
    sessionsToday: number;
    sessionsTrendPct: number;
    completedBookings: number;
    completedTrendPct: number;
    revenueToday: number;
    revenueTrendPct: number;
    abandonRate: number;
    abandonTrendPct: number;
  };
  funnel: {
    steps: Array<{
      key: string;
      label: string;
      count: number;
      dropPctFromPrev: number;
      highlight: boolean;
    }>;
  };
  slotDemand: Array<{ slotId: string; clicks: number; conversionRate: number }>;
  serviceConversion: Array<{
    serviceId: string;
    serviceName: string | null;
    views: number;
    selected: number;
    bookings: number;
    conversionRate: number;
  }>;
  abandonIntel: {
    mostCommonStep: number | null;
    avgSecondsBeforeAbandon: number | null;
    mobileSessions: number;
    desktopSessions: number;
  };
  timeline: Array<{ hour: number; sessions: number; bookings: number }>;
  recommendations: string[];
};

function pct(n: number, d: number) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return 0;
  return (n / d) * 100;
}

export async function getAdminAnalyticsSummary(): Promise<AdminAnalyticsSummary> {
  await ensureAnalyticsTables();

  const [today] = await sql<
    Array<{
      sessions_today: string;
      sessions_yesterday: string;
      success_today: string;
      success_yesterday: string;
      abandon_today: string;
      abandon_yesterday: string;
      revenue_today: string | null;
      revenue_yesterday: string | null;
    }>
  >`
    WITH bounds AS (
      SELECT
        date_trunc('day', now()) AS t0,
        date_trunc('day', now()) + interval '1 day' AS t1,
        date_trunc('day', now()) - interval '1 day' AS y0,
        date_trunc('day', now()) AS y1
    ),
    sessions AS (
      SELECT
        COUNT(*) FILTER (WHERE started_at >= (SELECT t0 FROM bounds) AND started_at < (SELECT t1 FROM bounds))::int AS sessions_today,
        COUNT(*) FILTER (WHERE started_at >= (SELECT y0 FROM bounds) AND started_at < (SELECT y1 FROM bounds))::int AS sessions_yesterday
      FROM booking_analytics_sessions
    ),
    events AS (
      SELECT
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'booking_success' AND created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds))::int AS success_today,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'booking_success' AND created_at >= (SELECT y0 FROM bounds) AND created_at < (SELECT y1 FROM bounds))::int AS success_yesterday,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'booking_abandon' AND created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds))::int AS abandon_today,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'booking_abandon' AND created_at >= (SELECT y0 FROM bounds) AND created_at < (SELECT y1 FROM bounds))::int AS abandon_yesterday,
        COALESCE(SUM(NULLIF((metadata->>'totalPrice')::numeric, NULL)) FILTER (WHERE event_type = 'booking_success' AND created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)), 0)::numeric AS revenue_today,
        COALESCE(SUM(NULLIF((metadata->>'totalPrice')::numeric, NULL)) FILTER (WHERE event_type = 'booking_success' AND created_at >= (SELECT y0 FROM bounds) AND created_at < (SELECT y1 FROM bounds)), 0)::numeric AS revenue_yesterday
      FROM booking_analytics_events
    )
    SELECT
      sessions.sessions_today::text,
      sessions.sessions_yesterday::text,
      events.success_today::text,
      events.success_yesterday::text,
      events.abandon_today::text,
      events.abandon_yesterday::text,
      events.revenue_today::text AS revenue_today,
      events.revenue_yesterday::text AS revenue_yesterday
    FROM sessions, events
    LIMIT 1
  `;

  const sessionsToday = Number(today?.sessions_today ?? 0);
  const sessionsYesterday = Number(today?.sessions_yesterday ?? 0);
  const successToday = Number(today?.success_today ?? 0);
  const successYesterday = Number(today?.success_yesterday ?? 0);
  const abandonToday = Number(today?.abandon_today ?? 0);
  const abandonYesterday = Number(today?.abandon_yesterday ?? 0);
  const revenueToday = Number(today?.revenue_today ?? 0);
  const revenueYesterday = Number(today?.revenue_yesterday ?? 0);

  const abandonRateToday = sessionsToday > 0 ? abandonToday / sessionsToday : 0;
  const abandonRateYesterday = sessionsYesterday > 0 ? abandonYesterday / sessionsYesterday : 0;

  const funnelRows = await sql<
    Array<{
      open: number;
      service: number;
      slot: number;
      details: number;
      pay: number;
      success: number;
    }>
  >`
    WITH bounds AS (
      SELECT date_trunc('day', now()) AS t0, date_trunc('day', now()) + interval '1 day' AS t1
    ),
    by_session AS (
      SELECT
        session_id,
        MAX(CASE WHEN event_type = 'booking_open' THEN 1 ELSE 0 END)::int AS open,
        MAX(CASE WHEN event_type = 'booking_service_selected' THEN 1 ELSE 0 END)::int AS service,
        MAX(CASE WHEN event_type = 'booking_slot_selected' THEN 1 ELSE 0 END)::int AS slot,
        MAX(CASE WHEN event_type = 'booking_details_started' THEN 1 ELSE 0 END)::int AS details,
        MAX(CASE WHEN event_type = 'booking_payment_start' THEN 1 ELSE 0 END)::int AS pay,
        MAX(CASE WHEN event_type = 'booking_success' THEN 1 ELSE 0 END)::int AS success
      FROM booking_analytics_events
      WHERE created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)
      GROUP BY session_id
    )
    SELECT
      COALESCE(SUM(open), 0)::int AS open,
      COALESCE(SUM(service), 0)::int AS service,
      COALESCE(SUM(slot), 0)::int AS slot,
      COALESCE(SUM(details), 0)::int AS details,
      COALESCE(SUM(pay), 0)::int AS pay,
      COALESCE(SUM(success), 0)::int AS success
    FROM by_session
    LIMIT 1
  `;

  const funnel = funnelRows[0] ?? { open: 0, service: 0, slot: 0, details: 0, pay: 0, success: 0 };

  const slotDemand = await sql<Array<{ slot_id: string; clicks: number; conversion_rate: number }>>`
    WITH bounds AS (
      SELECT date_trunc('day', now()) AS t0, date_trunc('day', now()) + interval '1 day' AS t1
    )
    SELECT
      slot_id,
      COUNT(*)::int AS clicks,
      CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE converted = true)::numeric / COUNT(*)::numeric) ELSE 0 END AS conversion_rate
    FROM booking_analytics_slot_clicks
    WHERE created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)
    GROUP BY slot_id
    ORDER BY clicks DESC
    LIMIT 12
  `;

  const serviceTable = await sql<
    Array<{ service_id: string; service_name: string | null; selected: number; bookings: number; conversion_rate: number }>
  >`
    WITH bounds AS (
      SELECT date_trunc('day', now()) AS t0, date_trunc('day', now()) + interval '1 day' AS t1
    ),
    selected AS (
      SELECT
        service_id,
        COUNT(DISTINCT session_id)::int AS selected,
        MAX(NULLIF(metadata->>'serviceName', '')) AS service_name
      FROM booking_analytics_events
      WHERE event_type = 'booking_service_selected'
        AND created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)
        AND service_id IS NOT NULL
      GROUP BY service_id
    ),
    booked AS (
      SELECT
        service_id,
        COUNT(DISTINCT session_id)::int AS bookings
      FROM booking_analytics_events
      WHERE event_type = 'booking_success'
        AND created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)
        AND service_id IS NOT NULL
      GROUP BY service_id
    )
    SELECT
      s.service_id,
      s.service_name,
      s.selected,
      COALESCE(b.bookings, 0)::int AS bookings,
      CASE WHEN s.selected > 0 THEN (COALESCE(b.bookings, 0)::numeric / s.selected::numeric) ELSE 0 END AS conversion_rate
    FROM selected s
    LEFT JOIN booked b ON b.service_id = s.service_id
    ORDER BY bookings DESC, selected DESC
    LIMIT 40
  `;

  const abandonIntelRow = await sql<
    Array<{
      most_common_step: number | null;
      avg_seconds_before_abandon: number | null;
      mobile_sessions: number;
      desktop_sessions: number;
    }>
  >`
    WITH bounds AS (
      SELECT date_trunc('day', now()) AS t0, date_trunc('day', now()) + interval '1 day' AS t1
    ),
    abandon_events AS (
      SELECT
        (step)::int AS step,
        session_id,
        created_at
      FROM booking_analytics_events
      WHERE event_type = 'booking_abandon'
        AND created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)
    ),
    most_step AS (
      SELECT step
      FROM abandon_events
      WHERE step IS NOT NULL
      GROUP BY step
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ),
    avg_time AS (
      SELECT AVG(EXTRACT(EPOCH FROM (s.ended_at - s.started_at))) AS avg_seconds
      FROM booking_analytics_sessions s
      WHERE s.ended_at IS NOT NULL
        AND s.end_reason IS NOT NULL
        AND s.ended_at >= (SELECT t0 FROM bounds) AND s.ended_at < (SELECT t1 FROM bounds)
        AND s.end_reason IN ('page_unload', 'inactivity_timeout', 'abandon')
    ),
    device AS (
      SELECT user_agent
      FROM booking_analytics_sessions
      WHERE started_at >= (SELECT t0 FROM bounds) AND started_at < (SELECT t1 FROM bounds)
    )
    SELECT
      (SELECT step FROM most_step)::int AS most_common_step,
      (SELECT avg_seconds FROM avg_time)::numeric AS avg_seconds_before_abandon,
      COUNT(*) FILTER (WHERE user_agent ILIKE '%mobi%' OR user_agent ILIKE '%iphone%' OR user_agent ILIKE '%android%' OR user_agent ILIKE '%ipad%')::int AS mobile_sessions,
      COUNT(*) FILTER (WHERE NOT (user_agent ILIKE '%mobi%' OR user_agent ILIKE '%iphone%' OR user_agent ILIKE '%android%' OR user_agent ILIKE '%ipad%'))::int AS desktop_sessions
    FROM device
    LIMIT 1
  `;

  const abandonIntel = abandonIntelRow[0] ?? {
    most_common_step: null,
    avg_seconds_before_abandon: null,
    mobile_sessions: 0,
    desktop_sessions: 0,
  };

  const timeline = await sql<Array<{ hour: number; sessions: number; bookings: number }>>`
    WITH bounds AS (
      SELECT date_trunc('day', now()) AS t0, date_trunc('day', now()) + interval '1 day' AS t1
    ),
    hours AS (
      SELECT generate_series(0, 23) AS hour
    ),
    s AS (
      SELECT EXTRACT(HOUR FROM started_at)::int AS hour, COUNT(*)::int AS sessions
      FROM booking_analytics_sessions
      WHERE started_at >= (SELECT t0 FROM bounds) AND started_at < (SELECT t1 FROM bounds)
      GROUP BY 1
    ),
    b AS (
      SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(DISTINCT session_id)::int AS bookings
      FROM booking_analytics_events
      WHERE event_type = 'booking_success'
        AND created_at >= (SELECT t0 FROM bounds) AND created_at < (SELECT t1 FROM bounds)
      GROUP BY 1
    )
    SELECT
      h.hour::int AS hour,
      COALESCE(s.sessions, 0)::int AS sessions,
      COALESCE(b.bookings, 0)::int AS bookings
    FROM hours h
    LEFT JOIN s ON s.hour = h.hour
    LEFT JOIN b ON b.hour = h.hour
    ORDER BY h.hour ASC
  `;

  // Recommendations: lightweight rule engine (read-only).
  const funnelDrop = [
    { key: 'open->service', from: funnel.open, to: funnel.service },
    { key: 'service->slot', from: funnel.service, to: funnel.slot },
    { key: 'slot->details', from: funnel.slot, to: funnel.details },
    { key: 'details->pay', from: funnel.details, to: funnel.pay },
    { key: 'pay->success', from: funnel.pay, to: funnel.success },
  ].map((x) => ({ ...x, dropPct: x.from > 0 ? 1 - x.to / x.from : 0 }));

  funnelDrop.sort((a, b) => b.dropPct - a.dropPct);
  const biggestDrop = funnelDrop[0];

  const recs: string[] = [];
  if (biggestDrop && biggestDrop.dropPct >= 0.35) {
    const label =
      biggestDrop.key === 'service->slot'
        ? 'Time selection'
        : biggestDrop.key === 'slot->details'
          ? 'Details step'
          : biggestDrop.key === 'details->pay'
            ? 'Payment step'
            : biggestDrop.key === 'pay->success'
              ? 'Stripe completion'
              : 'Service selection';
    recs.push(`Biggest drop is at ${label}. Tighten clarity + reassurance here.`);
  }
  if (abandonRateToday >= 0.55 && sessionsToday >= 10) {
    recs.push('Abandon rate is high today. Consider adding stronger urgency + trust cues earlier.');
  }
  const mobile = abandonIntel.mobile_sessions;
  const desktop = abandonIntel.desktop_sessions;
  if (mobile + desktop > 0 && mobile / Math.max(1, mobile + desktop) >= 0.7) {
    recs.push('Most sessions are mobile. Prioritize sticky CTA reachability and reduce form friction.');
  }
  const topSlot = slotDemand[0];
  if (topSlot && topSlot.clicks >= 8 && Number(topSlot.conversion_rate) < 0.2) {
    recs.push('Top clicked slot converts poorly. Consider checking the next-step transition and messaging.');
  }
  const weakService = serviceTable.find((s) => s.selected >= 6 && Number(s.conversion_rate) < 0.15);
  if (weakService) {
    recs.push(`Service ${weakService.service_name ?? weakService.service_id} converts poorly. Review price/value framing.`);
  }
  if (recs.length === 0) {
    recs.push('Looks stable today. Next: track service impressions to separate interest vs selection.');
  }

  const kpis = {
    sessionsToday,
    sessionsTrendPct: pct(sessionsToday - sessionsYesterday, Math.max(1, sessionsYesterday)),
    completedBookings: successToday,
    completedTrendPct: pct(successToday - successYesterday, Math.max(1, successYesterday)),
    revenueToday,
    revenueTrendPct: pct(revenueToday - revenueYesterday, Math.max(1, revenueYesterday)),
    abandonRate: abandonRateToday,
    abandonTrendPct: pct(abandonRateToday - abandonRateYesterday, Math.max(0.0001, abandonRateYesterday)),
  };

  const funnelSteps = [
    { key: 'booking_open', label: 'Open', count: funnel.open },
    { key: 'booking_service_selected', label: 'Service', count: funnel.service },
    { key: 'booking_slot_selected', label: 'Time', count: funnel.slot },
    { key: 'booking_details_started', label: 'Details', count: funnel.details },
    { key: 'booking_payment_start', label: 'Payment', count: funnel.pay },
    { key: 'booking_success', label: 'Success', count: funnel.success },
  ];

  const drops = funnelSteps.map((s, i) => {
    if (i === 0) return { to: s.key, dropPct: 0 };
    const prev = funnelSteps[i - 1];
    const dropPct = prev.count > 0 ? 1 - s.count / prev.count : 0;
    return { to: s.key, dropPct };
  });
  const biggestDropToKey = drops.slice(1).sort((a, b) => b.dropPct - a.dropPct)[0]?.to ?? null;

  return {
    ok: true,
    kpis,
    funnel: {
      steps: funnelSteps.map((s, idx) => {
        const prev = idx === 0 ? null : funnelSteps[idx - 1];
        const dropPctFromPrev = prev && prev.count ? 1 - s.count / prev.count : 0;
        return {
          ...s,
          dropPctFromPrev: idx === 0 ? 0 : dropPctFromPrev,
          highlight: biggestDropToKey === s.key,
        };
      }),
    },
    slotDemand: slotDemand.map((r) => ({
      slotId: r.slot_id,
      clicks: r.clicks,
      conversionRate: Number(r.conversion_rate),
    })),
    serviceConversion: serviceTable.map((r) => ({
      serviceId: r.service_id,
      serviceName: r.service_name,
      views: r.selected,
      selected: r.selected,
      bookings: r.bookings,
      conversionRate: Number(r.conversion_rate),
    })),
    abandonIntel: {
      mostCommonStep: abandonIntel.most_common_step,
      avgSecondsBeforeAbandon: abandonIntel.avg_seconds_before_abandon ? Number(abandonIntel.avg_seconds_before_abandon) : null,
      mobileSessions: abandonIntel.mobile_sessions,
      desktopSessions: abandonIntel.desktop_sessions,
    },
    timeline,
    recommendations: recs,
  };
}

