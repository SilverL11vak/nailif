'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ArrowRight, Calendar, ClipboardList, MessageSquare, Plus, ShoppingBag, Star, ShieldAlert } from 'lucide-react';

type CustomerDetailPayload = {
  customer: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    preferredLanguage: 'et' | 'en' | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    totalSpend: number;
    serviceSpend: number;
    productSpend: number;
    totalBookings: number;
    totalOrders: number;
    lastBooking: {
      id: number;
      status: string;
      payment_status: string;
      service_name: string;
      service_duration: number;
      total_price: number;
      slot_date: string;
      slot_time: string;
      created_at: string;
    } | null;
    nextBooking: {
      id: number;
      status: string;
      payment_status: string;
      service_name: string;
      service_duration: number;
      total_price: number;
      slot_date: string;
      slot_time: string;
      created_at: string;
    } | null;
  };
  bookings: Array<{
    id: number;
    status: string;
    payment_status: string;
    service_name: string;
    service_duration: number;
    total_price: number;
    slot_date: string;
    slot_time: string;
    created_at: string;
  }>;
  orders: Array<{
    id: number;
    order_type: string;
    status: string;
    amount_total: number;
    created_at: string;
    paid_at: string | null;
  }>;
  flags: string[];
  insights: {
    repeatClient: boolean;
    vip: boolean;
    cancelsOften: boolean;
    inactive: boolean;
    productBuyer: boolean;
    cancellationRate: number;
    averageSpend: number | null;
    lifetimeValue: number;
    mostBookedService: string | null;
    preferredHour: number | null;
    avgRebookIntervalDays: number | null;
    forecastLine: string;
  };
};

function money(n: number) {
  return `€${Math.round(n)}`;
}

function dateLabel(isoDate: string, time: string) {
  const dt = new Date(`${isoDate}T${time}:00`);
  return dt.toLocaleDateString('et-EE', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${time.slice(0, 5)}`;
}

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomerDetailPayload | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/customers/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? 'Kliendi laadimine ebaõnnestus');
        }
        const payload = (await res.json()) as CustomerDetailPayload;
        if (!cancelled) {
          setData(payload);
          setNotesDraft(payload.customer.notes ?? '');
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Kliendi laadimine ebaõnnestus');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const primaryFlags = useMemo(() => data?.flags ?? [], [data]);

  const saveNotes = async () => {
    if (!id) return;
    setSavingNotes(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesDraft }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Märkme salvestamine ebaõnnestus');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Märkme salvestamine ebaõnnestus');
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminPageHeader
          overline="CRM"
          title="Kliendi profiil"
          subtitle="Broneeringud ja tellimused ühes vaates."
          backHref="/admin/customers"
          backLabel="Kliendid"
          secondaryLinks={[{ label: 'Broneeringud', href: '/admin/bookings' }, { label: 'Tellimused', href: '/admin/orders' }]}
        />

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">{error}</div>
        )}

        {loading || !data ? (
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-10 text-center text-sm text-slate-500">
            Kliendi andmete laadimine...
          </div>
        ) : (
          <>
            {/* Ülevaade */}
            <section className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Ülevaade</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{data.customer.fullName}</h1>
                  <p className="mt-1 text-sm text-slate-600">
                    {data.customer.email ?? '—'} {data.customer.phone ? `· ${data.customer.phone}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {primaryFlags.map((f) => (
                      <span
                        key={f}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                          f.includes('VIP')
                            ? 'bg-amber-50 text-amber-800'
                            : f.includes('Cancels')
                              ? 'bg-rose-50 text-rose-700'
                              : f.includes('Inactive')
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-[#fff2f9] text-[#8b4d6a]'
                        }`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[520px] lg:grid-cols-3">
                  {[
                    { label: 'Kogukulu', value: money(data.summary.totalSpend), icon: Star },
                    { label: 'Broneeringud', value: String(data.summary.totalBookings), icon: Calendar },
                    { label: 'Tellimused', value: String(data.summary.totalOrders), icon: ShoppingBag },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Icon className="h-4 w-4" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider">{label}</p>
                      </div>
                      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-[#f1ece8] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Järgmine broneering</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {data.summary.nextBooking ? dateLabel(data.summary.nextBooking.slot_date, data.summary.nextBooking.slot_time) : '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{data.summary.nextBooking?.service_name ?? ''}</p>
                </div>
                <div className="rounded-2xl border border-[#f1ece8] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Viimane broneering</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {data.summary.lastBooking ? dateLabel(data.summary.lastBooking.slot_date, data.summary.lastBooking.slot_time) : '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{data.summary.lastBooking?.service_name ?? ''}</p>
                </div>
                <div className="rounded-2xl border border-[#f1ece8] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Märkmed</p>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={4}
                    placeholder="Sisemärkmed: eelistused, riskid, lisamüügi ideed..."
                    className="mt-2 w-full rounded-xl border border-[#e5e7eb] bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void saveNotes()}
                    disabled={savingNotes}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {savingNotes ? 'Salvestan...' : 'Salvesta märge'}
                  </button>
                </div>
              </div>
            </section>

            {/* Ülevaated + kiirtegevused */}
            <section className="mb-6 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Ülevaated</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Käitumine ja väärtus</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tühistamise määr</p>
                      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
                        {Math.round(data.insights.cancellationRate * 100)}%
                      </p>
                      {data.insights.cancelsOften && (
                        <p className="mt-1 text-xs font-medium text-rose-700">Märge: tühistab sageli</p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Keskmine teenusekulu</p>
                      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
                        {data.insights.averageSpend == null ? '—' : money(data.insights.averageSpend)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Arvestatud lõpetatud/tasutud broneeringute põhjal.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Enim broneeritud teenus</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {data.insights.mostBookedService ?? '—'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Eelistatud kellaaeg</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {data.insights.preferredHour == null ? '—' : `${String(data.insights.preferredHour).padStart(2, '0')}:00`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Keskmine kordusbroneeringu vahe: {data.insights.avgRebookIntervalDays == null ? '—' : `${data.insights.avgRebookIntervalDays} päeva`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#f1ece8] bg-white p-4">
                    <p className="text-sm font-medium text-slate-800">{data.insights.forecastLine}</p>
                    <p className="mt-1 text-xs text-slate-500">Prognoos täpsustub, kui kliendikaardile koguneb rohkem andmeid.</p>
                  </div>
                </section>
              </div>

              <div className="lg:col-span-5">
                <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Kiirtegevused</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Tee järgmiseks</h2>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => router.push('/book')}
                      className="inline-flex min-h-[48px] items-center justify-between rounded-2xl border border-[#e5ccd6] bg-[#fff2f9] px-4 py-3 text-sm font-semibold text-[#8b4d6a] transition hover:bg-[#ffe6f2]"
                    >
                      <span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Loo broneering</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <Link
                      href="/admin/bookings"
                      className="inline-flex min-h-[48px] items-center justify-between rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <span className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Ava broneeringud</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/admin/orders"
                      className="inline-flex min-h-[48px] items-center justify-between rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <span className="inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Ava tellimused</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                      href={data.customer.phone ? `sms:${encodeURIComponent(data.customer.phone)}` : undefined}
                      className={`inline-flex min-h-[48px] items-center justify-between rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${data.customer.phone ? '' : 'pointer-events-none opacity-50'}`}
                    >
                      <span className="inline-flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Saada kliendile sõnum</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Riskitase</p>
                    <div className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                      <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-600" />
                      <p>
                        {data.insights.cancelsOften
                          ? 'Kliendil on kõrgem tühistamise risk. Soovitame võtta ümberbroneerimisel ettemaksu kinnituse.'
                          : data.insights.inactive
                            ? 'Klient on olnud passiivne. Võid saata pehme taasaktiveerimise meeldetuletuse.'
                            : 'Olulisi riskisignaale ei tuvastatud.'}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </section>

            {/* Ajalugu */}
            <section className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Broneeringute ajalugu</h2>
                <p className="mt-1 text-xs text-slate-500">Lõpetatud / tühistatud / tulevased (uusim eespool).</p>
                <div className="mt-4 space-y-2">
                  {data.bookings.slice(0, 40).map((b) => (
                    <div key={b.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{b.service_name}</p>
                          <p className="mt-0.5 text-xs text-slate-600">{dateLabel(b.slot_date, b.slot_time)} · {b.service_duration}m</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-slate-900">{money(b.total_price)}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{b.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {data.bookings.length > 40 && (
                  <p className="mt-4 text-center text-xs text-slate-500">Näitan 40 kirjet {data.bookings.length}-st</p>
                )}
              </section>

              <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Tellimuste ajalugu</h2>
                <p className="mt-1 text-xs text-slate-500">Tasutud tellimused lisatakse tootekulu arvestusse.</p>
                <div className="mt-4 space-y-2">
                  {data.orders.slice(0, 40).map((o) => (
                    <div key={o.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">#{o.id} · {o.order_type}</p>
                          <p className="mt-0.5 text-xs text-slate-600">{new Date(o.created_at).toLocaleString('en-GB')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-slate-900">{money(o.amount_total)}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{o.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {data.orders.length > 40 && (
                  <p className="mt-4 text-center text-xs text-slate-500">Näitan 40 kirjet {data.orders.length}-st</p>
                )}
              </section>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
