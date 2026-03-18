import { headers } from 'next/headers';

type Summary = {
  ok: true;
  funnel: Array<{
    key: string;
    label: string;
    count: number;
    dropPctFromPrev: number;
    highlight: boolean;
  }>;
  slotHeatmap: Array<{ slotId: string; clicks: number }>;
  servicePerformance: Array<{ serviceId: string; serviceName: string | null; selected: number; bookings: number; conversionPct: number }>;
  deviceConversion: { mobileSuccess: number; desktopSuccess: number };
  abandonment: Array<{ reason: string; count: number }>;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function FunnelBlock({ steps }: { steps: Summary['funnel'] }) {
  const max = Math.max(1, ...steps.map((s) => s.count));
  return (
    <div className="rounded-[28px] border border-[#efe5ea] bg-white/85 p-6 shadow-[0_22px_60px_-44px_rgba(57,33,52,0.28)] backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">Booking funnel</p>
      <h1 className="mt-2 font-brand text-3xl font-semibold tracking-tight text-[#1f171d]">Conversion overview</h1>
      <div className="mt-6 space-y-4">
        {steps.map((s, i) => {
          const w = (s.count / max) * 100;
          const drop = i === 0 ? '—' : `${Math.round(s.dropPctFromPrev * 100)}% drop`;
          return (
            <div key={s.key} className={`rounded-2xl p-4 ${s.highlight ? 'bg-[#fff4fb] ring-1 ring-[#c24d86]/20' : 'bg-[#fbf8fa] ring-1 ring-[#f1e6ec]'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#2f2530]">{s.label}</p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#8a7a88]">{drop}</p>
                </div>
                <p className="font-brand text-2xl font-semibold tabular-nums text-[#1f171d]">{s.count}</p>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#e8b8d4_0%,#c24d86_52%,#a93d71_100%)] transition-[width] duration-700 ease-out"
                  style={{ width: `${clamp(w, 2, 100)}%` }}
                />
              </div>
              {s.highlight ? <p className="mt-2 text-[11px] font-semibold text-[#8b3b62]">Highest drop-off</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlotHeatmap({ rows }: { rows: Summary['slotHeatmap'] }) {
  const max = Math.max(1, ...rows.map((r) => r.clicks));
  return (
    <div className="rounded-[28px] border border-[#efe5ea] bg-white/85 p-6 shadow-[0_22px_60px_-44px_rgba(57,33,52,0.28)] backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">Slot demand</p>
      <h2 className="mt-2 font-brand text-2xl font-semibold tracking-tight text-[#1f171d]">Heatmap (clicks)</h2>
      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-[#7a6a72]">No slot clicks yet.</p>
        ) : (
          rows.map((r, idx) => (
            <div key={`${r.slotId}-${idx}`} className="rounded-2xl bg-[#fbf8fa] p-4 ring-1 ring-[#f1e6ec]">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#2f2530]">{r.slotId}</p>
                <p className="font-brand text-lg font-semibold tabular-nums text-[#1f171d]">{r.clicks}</p>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#d6c7cf_0%,#c24d86_60%,#a93d71_100%)]"
                  style={{ width: `${clamp((r.clicks / max) * 100, 3, 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ServiceRanking({ rows }: { rows: Summary['servicePerformance'] }) {
  return (
    <div className="rounded-[28px] border border-[#efe5ea] bg-white/85 p-6 shadow-[0_22px_60px_-44px_rgba(57,33,52,0.28)] backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">Services</p>
      <h2 className="mt-2 font-brand text-2xl font-semibold tracking-tight text-[#1f171d]">Performance ranking</h2>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-[720px] w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aa4]">
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Selected</th>
              <th className="px-3 py-2">Bookings</th>
              <th className="px-3 py-2">Conversion %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-sm text-[#7a6a72]">
                  No service events yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.serviceId} className="rounded-2xl bg-[#fbf8fa] ring-1 ring-[#f1e6ec]">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#2f2530]">{r.serviceName ?? r.serviceId}</p>
                    <p className="text-[12px] text-[#8a7a88]">{r.serviceId}</p>
                  </td>
                  <td className="px-3 py-3 font-semibold tabular-nums text-[#2f2530]">{r.selected}</td>
                  <td className="px-3 py-3 font-semibold tabular-nums text-[#2f2530]">{r.bookings}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#6a3b57] ring-1 ring-[#ead6e2]">
                      {Math.round(r.conversionPct)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeviceAndAbandonment({ device, abandonment }: { device: Summary['deviceConversion']; abandonment: Summary['abandonment'] }) {
  const totalSuccess = device.mobileSuccess + device.desktopSuccess;
  const mobilePct = totalSuccess > 0 ? (device.mobileSuccess / totalSuccess) * 100 : 0;
  const topAbandon = abandonment[0];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[26px] border border-[#efe5ea] bg-white/85 p-6 shadow-[0_18px_46px_-34px_rgba(57,33,52,0.26)] backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">Mobile vs desktop conversion</p>
        <p className="mt-2 font-brand text-4xl font-semibold tabular-nums text-[#1f171d]">{Math.round(mobilePct)}%</p>
        <p className="mt-2 text-sm text-[#6f6168]">mobile share of successes</p>
        <div className="mt-4 flex items-center justify-between text-sm text-[#6f6168]">
          <span>Mobile</span>
          <span className="font-semibold tabular-nums text-[#2f2530]">{device.mobileSuccess}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-[#6f6168]">
          <span>Desktop</span>
          <span className="font-semibold tabular-nums text-[#2f2530]">{device.desktopSuccess}</span>
        </div>
      </div>
      <div className="rounded-[26px] border border-[#efe5ea] bg-white/85 p-6 shadow-[0_18px_46px_-34px_rgba(57,33,52,0.26)] backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a79aa4]">Abandonment breakdown</p>
        <p className="mt-2 font-brand text-2xl font-semibold text-[#1f171d]">
          {topAbandon ? topAbandon.reason : '—'}
        </p>
        <p className="mt-1 text-sm text-[#6f6168]">top abandon reason</p>
        <div className="mt-5 space-y-2">
          {abandonment.slice(0, 5).map((a) => (
            <div key={a.reason} className="flex items-center justify-between rounded-2xl bg-[#fbf8fa] px-4 py-2.5 ring-1 ring-[#f1e6ec]">
              <span className="text-sm font-medium text-[#5d4558]">{a.reason}</span>
              <span className="font-semibold tabular-nums text-[#2f2530]">{a.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function AdminFunnelAnalyticsPage() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const base = host ? `${proto}://${host}` : '';

  const res = await fetch(`${base}/api/admin/funnel-analytics/summary`, { cache: 'no-store' });
  const data = (await res.json()) as Summary | { error: string };

  if (!('ok' in data) || !data.ok) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-[26px] border border-[#efe5ea] bg-white p-6 shadow-[0_18px_46px_-34px_rgba(57,33,52,0.26)]">
          <p className="text-sm font-semibold text-[#2f2530]">Funnel analytics unavailable</p>
            <p className="mt-2 text-sm text-[#7a6a72]">
              {typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : 'Failed to load analytics.'}
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fffdfa_0%,_#fff6fb_52%,_#f8f1f5_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a79aa4]">Premium admin analytics</p>
          <h1 className="mt-2 font-brand text-4xl font-semibold tracking-tight text-[#1f171d]">Booking Funnel</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-[#6f6168]">Tracked from CTA → service → slots → payment.</p>
        </header>

        <section className="grid gap-6 xl:grid-cols-2">
          <FunnelBlock steps={data.funnel} />
          <SlotHeatmap rows={data.slotHeatmap} />
        </section>

        <section className="mt-8">
          <ServiceRanking rows={data.servicePerformance} />
        </section>

        <section className="mt-8">
          <DeviceAndAbandonment device={data.deviceConversion} abandonment={data.abandonment} />
        </section>
      </div>
    </div>
  );
}

