import Link from 'next/link';
import { getAdminAnalyticsSummary } from '@/lib/admin-analytics-summary';

function pickTopConvertingService(
  rows: Array<{ serviceId: string; serviceName: string | null; selected: number; bookings: number; conversionRate: number }>
) {
  const eligible = rows.filter((r) => r.selected >= 3);
  const sorted = (eligible.length ? eligible : rows).slice().sort((a, b) => {
    const byBookings = (b.bookings ?? 0) - (a.bookings ?? 0);
    if (byBookings !== 0) return byBookings;
    return (b.conversionRate ?? 0) - (a.conversionRate ?? 0);
  });
  return sorted[0] ?? null;
}

export async function AdminAnalyticsSummaryStrip() {
  let data: Awaited<ReturnType<typeof getAdminAnalyticsSummary>> | null = null;
  try {
    data = await getAdminAnalyticsSummary();
  } catch {
    data = null;
  }

  if (!data?.ok) {
    return (
      <section className="admin-v2-surface mb-8 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="admin-v2-overline">Funnel intelligence</p>
            <p className="mt-1 text-sm font-medium text-[#5c4f55]">No analytics data yet.</p>
          </div>
          <Link
            href="/admin/analytics"
            className="admin-v2-btn-secondary"
          >
            Open analytics
          </Link>
        </div>
      </section>
    );
  }

  const k = data.kpis;
  const biggestDrop = data.funnel.steps.find((s) => s.highlight)?.label ?? '—';
  const mostWantedSlot = data.slotDemand[0]?.slotId ?? '—';
  const topService = pickTopConvertingService(data.serviceConversion);
  const topServiceLabel = topService ? topService.serviceName ?? topService.serviceId : '—';

  return (
    <section className="admin-v2-surface mb-8 overflow-hidden">
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="admin-v2-overline">Operational intelligence</p>
          <p className="mt-2 font-brand text-2xl font-semibold tracking-tight text-[#2a2228]">Today’s funnel snapshot</p>
          <p className="mt-1 text-sm text-[#7a6e74]">Read-only insights from live booking events.</p>
        </div>
        <Link
          href="/admin/analytics"
          className="admin-v2-btn-primary"
        >
          View full analytics
        </Link>
      </div>

      <div className="grid gap-3 border-t border-[#f0e3ea] bg-white/70 px-5 py-5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Sessions today', value: String(k.sessionsToday), hint: 'session-started' },
          { label: 'Bookings today', value: String(k.completedBookings), hint: 'success' },
          { label: 'Top converting service', value: topServiceLabel, hint: topService ? `${Math.round(topService.conversionRate * 100)}%` : '—' },
          { label: 'Most wanted slot', value: mostWantedSlot, hint: data.slotDemand[0] ? `${data.slotDemand[0].clicks} clicks` : '—' },
          { label: 'Biggest drop-off', value: biggestDrop, hint: 'focus step' },
        ].map((item) => (
          <div key={item.label} className="admin-v2-card px-4 py-4">
            <p className="admin-v2-overline">{item.label}</p>
            <p className="mt-2 line-clamp-2 text-lg font-semibold text-[#2a2228]">{item.value}</p>
            <p className="mt-1 text-[12px] text-[#9a8a94]">{item.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

