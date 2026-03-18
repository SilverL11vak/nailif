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
      <section className="mb-8 rounded-2xl border border-[#ebe6e3] bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(42,36,40,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a8989e]">Funnel intelligence</p>
            <p className="mt-1 text-sm font-medium text-[#5c4f55]">No analytics data yet.</p>
          </div>
          <Link
            href="/admin/analytics"
            className="inline-flex items-center justify-center rounded-full border border-[#e5ddd8] bg-white px-4 py-2 text-sm font-semibold text-[#5c4f55] shadow-sm hover:bg-[#faf8f6]"
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
    <section className="mb-8 overflow-hidden rounded-2xl border border-[#ebe6e3] bg-[linear-gradient(180deg,#ffffff_0%,#fff7fb_100%)] shadow-[0_6px_28px_-16px_rgba(42,36,40,0.14)]">
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b18aa2]">Operational intelligence</p>
          <p className="mt-2 font-brand text-2xl font-semibold tracking-tight text-[#2a2228]">Today’s funnel snapshot</p>
          <p className="mt-1 text-sm text-[#7a6e74]">Read-only insights from live booking events.</p>
        </div>
        <Link
          href="/admin/analytics"
          className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#9c4d72_0%,#c24d86_55%,#a93d71_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_26px_-10px_rgba(194,77,134,0.5)]"
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
          <div key={item.label} className="rounded-2xl border border-[#f1e6ec] bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a8989e]">{item.label}</p>
            <p className="mt-2 line-clamp-2 text-lg font-semibold text-[#2a2228]">{item.value}</p>
            <p className="mt-1 text-[12px] text-[#9a8a94]">{item.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

