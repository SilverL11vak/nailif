import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminAnalyticsToggle } from '@/components/admin/AdminAnalyticsToggle';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { getAdminAnalyticsSummary, type AdminAnalyticsSummary as Summary } from '@/lib/admin-analytics-summary';
import { getAnalyticsEnabled } from '@/lib/app-settings';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatTrend(pct: number) {
  const v = Number.isFinite(pct) ? pct : 0;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(0)}%`;
}

function TrendPill({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        up ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
      }`}
    >
      {formatTrend(value)}
    </span>
  );
}

function KpiCard({
  title,
  value,
  trend,
  suffix,
}: {
  title: string;
  value: string;
  trend: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-[26px] border border-[#efe5ea] bg-white/85 p-5 shadow-[0_18px_46px_-34px_rgba(57,33,52,0.26)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_60px_-44px_rgba(57,33,52,0.32)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a79aa4]">{title}</p>
          <p className="mt-2 font-brand text-[34px] font-semibold tracking-tight text-[#1f171d]">
            {value}
            {suffix ? <span className="ml-1 text-[16px] font-semibold text-[#6f6168]">{suffix}</span> : null}
          </p>
        </div>
        <TrendPill value={trend} />
      </div>
      <div className="mt-4 h-px w-full bg-[linear-gradient(90deg,rgba(194,77,134,0.22)_0%,rgba(194,77,134,0)_70%)]" />
      <p className="mt-3 text-sm text-[#6f6168]">vs yesterday</p>
    </div>
  );
}

function FunnelViz({ steps }: { steps: Summary['funnel']['steps'] }) {
  const max = Math.max(1, ...steps.map((s) => s.count));
  return (
    <div className="rounded-[28px] border border-[#efe5ea] bg-white/85 p-6 shadow-[0_22px_60px_-44px_rgba(57,33,52,0.28)] backdrop-blur-md">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">Funnel</p>
          <h2 className="mt-2 font-brand text-2xl font-semibold tracking-tight text-[#1f171d]">Booking completion</h2>
        </div>
        <p className="text-sm font-medium text-[#7a6a72]">Today</p>
      </div>

      <div className="mt-6 space-y-4">
        {steps.map((s, idx) => {
          const w = (s.count / max) * 100;
          const drop = idx === 0 ? 0 : s.dropPctFromPrev;
          const dropLabel = idx === 0 ? '—' : `${Math.round(drop * 100)}% drop`;
          return (
            <div key={s.key} className={`rounded-2xl p-4 ${s.highlight ? 'bg-[#fff4fb] ring-1 ring-[#c24d86]/20' : 'bg-[#fbf8fa] ring-1 ring-[#f1e6ec]'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[#2f2530]">{s.label}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#8a7a88]">{dropLabel}</p>
                </div>
                <div className="text-right">
                  <p className="font-brand text-xl font-semibold tabular-nums text-[#1f171d]">{s.count}</p>
                  <p className="text-[11px] font-medium text-[#9a8a94]">users</p>
                </div>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full bg-[linear-gradient(90deg,#e8b8d4_0%,#c24d86_52%,#a93d71_100%)] transition-[width] duration-700 ease-out`}
                  style={{ width: `${clamp(w, 2, 100)}%` }}
                />
              </div>
              {s.highlight ? (
                <p className="mt-2 text-[11px] font-semibold text-[#8b3b62]">Highest drop-off</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlotDemand({ items }: { items: Summary['slotDemand'] }) {
  const max = Math.max(1, ...items.map((i) => i.clicks));
  return (
    <div className="rounded-[28px] border border-[#efe5ea] bg-white/85 p-6 shadow-[0_22px_60px_-44px_rgba(57,33,52,0.28)] backdrop-blur-md">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">Slot demand</p>
          <h2 className="mt-2 font-brand text-2xl font-semibold tracking-tight text-[#1f171d]">Most clicked times</h2>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-[#7a6a72]">No slot clicks yet today.</p>
        ) : (
          items.map((i, idx) => {
            const w = (i.clicks / max) * 100;
            const badge =
              idx === 0 ? 'Most popular' : i.clicks >= 6 ? 'Trending' : i.clicks >= 3 ? 'Popular' : null;
            return (
              <div key={i.slotId} className="rounded-2xl bg-[#fbf8fa] p-4 ring-1 ring-[#f1e6ec]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#2f2530]">{i.slotId}</p>
                    <p className="mt-0.5 text-[12px] font-medium text-[#8a7a88]">
                      Conversion: <span className="font-semibold text-[#6a3b57]">{Math.round(i.conversionRate * 100)}%</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {badge ? (
                      <span className="rounded-full bg-[#fff4fb] px-2.5 py-1 text-[11px] font-semibold text-[#8b3b62] ring-1 ring-[#c24d86]/15">
                        {badge}
                      </span>
                    ) : null}
                    <span className="font-brand text-lg font-semibold tabular-nums text-[#1f171d]">{i.clicks}</span>
                  </div>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#d6c7cf_0%,#c24d86_60%,#a93d71_100%)] transition-[width] duration-700 ease-out"
                    style={{ width: `${clamp(w, 3, 100)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ServiceTable({ rows }: { rows: Summary['serviceConversion'] }) {
  return (
    <div className="rounded-[28px] border border-[#efe5ea] bg-white/85 p-6 shadow-[0_22px_60px_-44px_rgba(57,33,52,0.28)] backdrop-blur-md">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">Services</p>
          <h2 className="mt-2 font-brand text-2xl font-semibold tracking-tight text-[#1f171d]">Service conversion</h2>
        </div>
        <p className="text-sm font-medium text-[#7a6a72]">Sorted by bookings</p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-[720px] w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aa4]">
              <th className="px-3 py-2">Service Name</th>
              <th className="px-3 py-2">Views</th>
              <th className="px-3 py-2">Selected</th>
              <th className="px-3 py-2">Bookings</th>
              <th className="px-3 py-2">Conversion %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-[#7a6a72]" colSpan={5}>
                  No service selections yet today.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.serviceId} className="rounded-2xl bg-[#fbf8fa] ring-1 ring-[#f1e6ec]">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#2f2530]">{r.serviceName ?? r.serviceId}</p>
                    <p className="text-[12px] text-[#8a7a88]">{r.serviceId}</p>
                  </td>
                  <td className="px-3 py-3 font-semibold tabular-nums text-[#2f2530]">{r.views}</td>
                  <td className="px-3 py-3 font-semibold tabular-nums text-[#2f2530]">{r.selected}</td>
                  <td className="px-3 py-3 font-semibold tabular-nums text-[#2f2530]">{r.bookings}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#6a3b57] ring-1 ring-[#ead6e2]">
                      {Math.round(r.conversionRate * 100)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12px] text-[#9a8a94]">
        “Views” reflects first measurable per-service interaction today (service selected).
      </p>
    </div>
  );
}

function AbandonIntel({ data }: { data: Summary['abandonIntel'] }) {
  const total = data.mobileSessions + data.desktopSessions;
  const mobilePct = total > 0 ? (data.mobileSessions / total) * 100 : 0;
  const avg = data.avgSecondsBeforeAbandon;
  const mm = avg != null ? Math.floor(avg / 60) : null;
  const ss = avg != null ? Math.round(avg % 60) : null;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-[24px] border border-[#efe5ea] bg-white/85 p-5 shadow-[0_18px_46px_-34px_rgba(57,33,52,0.26)] backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a79aa4]">Most common abandon step</p>
        <p className="mt-2 font-brand text-3xl font-semibold tabular-nums text-[#1f171d]">
          {data.mostCommonStep ?? '—'}
        </p>
        <p className="mt-1 text-sm text-[#6f6168]">today</p>
      </div>
      <div className="rounded-[24px] border border-[#efe5ea] bg-white/85 p-5 shadow-[0_18px_46px_-34px_rgba(57,33,52,0.26)] backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a79aa4]">Avg time before abandon</p>
        <p className="mt-2 font-brand text-3xl font-semibold tabular-nums text-[#1f171d]">
          {avg == null ? '—' : `${mm}:${String(ss).padStart(2, '0')}`}
        </p>
        <p className="mt-1 text-sm text-[#6f6168]">mm:ss</p>
      </div>
      <div className="rounded-[24px] border border-[#efe5ea] bg-white/85 p-5 shadow-[0_18px_46px_-34px_rgba(57,33,52,0.26)] backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a79aa4]">Mobile vs desktop</p>
        <p className="mt-2 font-brand text-3xl font-semibold tabular-nums text-[#1f171d]">{Math.round(mobilePct)}%</p>
        <p className="mt-1 text-sm text-[#6f6168]">mobile share</p>
      </div>
    </div>
  );
}

function TimelineGraph({ points }: { points: Summary['timeline'] }) {
  const w = 680;
  const h = 220;
  const pad = 28;
  const maxY = Math.max(1, ...points.map((p) => Math.max(p.sessions, p.bookings)));
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / maxY) * (h - pad * 2);

  const pathFor = (key: 'sessions' | 'bookings') =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`)
      .join(' ');

  return (
    <div className="rounded-[28px] border border-[#efe5ea] bg-white/85 p-6 shadow-[0_22px_60px_-44px_rgba(57,33,52,0.28)] backdrop-blur-md">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">Timeline</p>
          <h2 className="mt-2 font-brand text-2xl font-semibold tracking-tight text-[#1f171d]">Sessions & bookings per hour</h2>
        </div>
        <div className="flex items-center gap-3 text-[12px] font-medium text-[#7a6a72]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#c24d86]" /> Sessions
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#2a2228]" /> Bookings
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg width={w} height={h} className="min-w-[680px]">
          <defs>
            <linearGradient id="roseLine" x1="0" x2="1">
              <stop offset="0" stopColor="#e8b8d4" />
              <stop offset="0.55" stopColor="#c24d86" />
              <stop offset="1" stopColor="#a93d71" />
            </linearGradient>
          </defs>
          <path d={pathFor('sessions')} fill="none" stroke="url(#roseLine)" strokeWidth="3" strokeLinecap="round" />
          <path d={pathFor('bookings')} fill="none" stroke="#2a2228" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        </svg>
      </div>

      <p className="mt-4 text-[12px] text-[#9a8a94]">Hours are shown from 00:00 to 23:00 (today).</p>
    </div>
  );
}

function Recommendations({ items }: { items: string[] }) {
  return (
    <div className="rounded-[28px] border border-[#efe5ea] bg-[linear-gradient(180deg,#fffdfb_0%,#fff6fb_100%)] p-6 shadow-[0_22px_60px_-44px_rgba(57,33,52,0.28)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a87a94]">Smart recommendations</p>
      <h2 className="mt-2 font-brand text-2xl font-semibold tracking-tight text-[#1f171d]">What to optimize today</h2>
      <ul className="mt-5 space-y-3 text-sm text-[#5d4558]">
        {items.map((r, idx) => (
          <li key={idx} className="rounded-2xl bg-white/80 p-4 ring-1 ring-[#efe0e8]">
            <span className="font-semibold text-[#8b3b62]">• </span>
            <span className="font-medium">{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const admin = await getAdminFromCookies();
  if (!admin) redirect('/admin/login');

  const analyticsEnabled = await getAnalyticsEnabled();
  let data: Summary | null = null;
  let error: string | null = null;
  try {
    data = await getAdminAnalyticsSummary();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load analytics.';
  }

  if (!data?.ok) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fffdfa_0%,_#fff6fb_52%,_#f8f1f5_100%)]">
        <header className="sticky top-0 z-40 border-b border-[#efe5ea] bg-white/85 backdrop-blur-md shadow-[0_6px_28px_-18px_rgba(57,33,52,0.22)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link href="/admin" className="font-brand text-lg font-semibold tracking-tight text-[#1f171d] hover:text-[#8b5c72]">
              Nailify Admin
            </Link>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <AdminSearch />
              <AdminLogoutButton />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <section className="mb-8">
            <AdminAnalyticsToggle initialEnabled={analyticsEnabled} />
          </section>
          <div className="rounded-[26px] border border-[#efe5ea] bg-white p-6 shadow-[0_18px_46px_-34px_rgba(57,33,52,0.26)]">
            <p className="text-sm font-semibold text-[#2f2530]">Analytics unavailable</p>
            <p className="mt-2 text-sm text-[#7a6a72]">{error ?? 'Failed to load analytics.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const k = data.kpis;
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fffdfa_0%,_#fff6fb_52%,_#f8f1f5_100%)]">
      <header className="sticky top-0 z-40 border-b border-[#efe5ea] bg-white/85 backdrop-blur-md shadow-[0_6px_28px_-18px_rgba(57,33,52,0.22)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/admin" className="font-brand text-lg font-semibold tracking-tight text-[#1f171d] hover:text-[#8b5c72]">
            Nailify Admin
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <AdminSearch />
            <AdminLogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a79aa4]">Salon Revenue Control Center</p>
          <h1 className="mt-2 font-brand text-4xl font-semibold tracking-tight text-[#1f171d]">Funnel Analytics</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-[#6f6168]">
            Live booking funnel health — sessions, drop-offs, slot demand, and conversion signals.
          </p>
        </header>

        <section className="mb-8">
          <AdminAnalyticsToggle initialEnabled={analyticsEnabled} />
        </section>

        {!analyticsEnabled ? (
          <div className="mb-8 rounded-[20px] border border-amber-200 bg-amber-50/90 p-5 text-[15px] text-amber-900">
            <p className="font-semibold">Analytics tracking is currently disabled.</p>
            <p className="mt-1 text-[14px] text-amber-800">
              No events or sessions are being collected. Turn the toggle above on when you want to resume tracking.
            </p>
          </div>
        ) : null}

        <div className={!analyticsEnabled ? 'opacity-60' : ''}>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Booking Sessions Today" value={String(k.sessionsToday)} trend={k.sessionsTrendPct} />
            <KpiCard title="Completed Bookings" value={String(k.completedBookings)} trend={k.completedTrendPct} />
            <KpiCard title="Revenue Today" value={k.revenueToday.toFixed(0)} suffix="€" trend={k.revenueTrendPct} />
            <KpiCard title="Abandon Rate" value={Math.round(k.abandonRate * 100).toString()} suffix="%" trend={k.abandonTrendPct} />
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <FunnelViz steps={data.funnel.steps} />
            <SlotDemand items={data.slotDemand} />
          </section>

          <section className="mt-8">
            <ServiceTable rows={data.serviceConversion} />
          </section>

          <section className="mt-8">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">Abandonment intelligence</p>
              <h2 className="mt-2 font-brand text-2xl font-semibold tracking-tight text-[#1f171d]">Where users hesitate</h2>
            </div>
            <AbandonIntel data={data.abandonIntel} />
          </section>

          <section className="mt-8">
            <TimelineGraph points={data.timeline} />
          </section>

          <section className="mt-8">
            <Recommendations items={data.recommendations} />
          </section>
        </div>
      </div>
    </div>
  );
}

