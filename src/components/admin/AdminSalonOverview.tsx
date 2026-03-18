'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Image as ImageIcon,
  LayoutGrid,
  MessageSquare,
  Package,
  Sparkles,
} from 'lucide-react';

type Stats = {
  freeSlotsToday: number;
  revenueToday: number;
  revenueThisWeek: number;
};

interface BookingRow {
  id: string;
  contactFirstName: string;
  contactLastName: string | null;
  serviceName: string;
  slotDate: string;
  slotTime: string;
  status: string;
  createdAt: string;
}

interface OrderRow {
  id: string;
  status: string;
  amountTotal: number;
  orderType: string;
  customerName: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface ProductRow {
  id: string;
  nameEt: string;
  stock: number;
  active: boolean;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n: number) {
  return `€${Math.round(n)}`;
}

function relTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function dayLabels(days: number) {
  const out: { key: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    });
  }
  return out;
}

function orderDayKey(o: OrderRow) {
  const raw = o.status === 'paid' && o.paidAt ? o.paidAt : o.createdAt;
  return raw.slice(0, 10);
}

export function AdminSalonOverview({
  stats,
}: {
  stats: Stats;
}) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [bRes, oRes, pRes] = await Promise.all([
          fetch('/api/bookings?limit=80', { cache: 'no-store' }),
          fetch('/api/orders?limit=200', { cache: 'no-store' }),
          fetch('/api/products?admin=1&lang=et', { cache: 'no-store' }),
        ]);
        if (cancelled) return;
        if (bRes.ok) {
          const d = (await bRes.json()) as { bookings?: BookingRow[] };
          setBookings(
            (d.bookings ?? []).map((x) => ({
              id: String(x.id),
              contactFirstName: x.contactFirstName,
              contactLastName: x.contactLastName,
              serviceName: x.serviceName,
              slotDate: x.slotDate,
              slotTime: x.slotTime,
              status: x.status,
              createdAt: x.createdAt,
            }))
          );
        }
        if (oRes.ok) {
          const d = (await oRes.json()) as { orders?: OrderRow[] };
          setOrders(d.orders ?? []);
        }
        if (pRes.ok) {
          const d = (await pRes.json()) as { products?: ProductRow[] };
          setProducts(d.products ?? []);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const upcoming = useMemo(() => {
    const t = todayIso();
    return [...bookings]
      .filter((b) => b.slotDate >= t && b.status !== 'cancelled')
      .sort((a, b) => `${a.slotDate} ${a.slotTime}`.localeCompare(`${b.slotDate} ${b.slotTime}`))
      .slice(0, 7);
  }, [bookings]);

  const newOrdersPending = useMemo(() => orders.filter((o) => o.status === 'pending').length, [orders]);

  const lowStock = useMemo(
    () => products.filter((p) => p.active && p.stock < 5).slice(0, 5),
    [products]
  );

  const [revenueTab, setRevenueTab] = useState<'today' | 'week' | 'month'>('week');

  const chartData = useMemo(() => {
    const paid = orders.filter((o) => o.status === 'paid');
    if (revenueTab === 'today') {
      const td = todayIso();
      const v = paid.filter((o) => orderDayKey(o) === td).reduce((s, o) => s + o.amountTotal, 0);
      return { type: 'single' as const, total: v, label: 'Today (paid orders)' };
    }
    if (revenueTab === 'week') {
      const days = dayLabels(7);
      const vals = days.map(({ key }) =>
        paid.filter((o) => orderDayKey(o) === key).reduce((s, o) => s + o.amountTotal, 0)
      );
      return { type: 'bars' as const, labels: days.map((d) => d.label), values: vals };
    }
    const weeks: { label: string; value: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const end = new Date();
      end.setDate(end.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const startS = start.toISOString().slice(0, 10);
      const endS = end.toISOString().slice(0, 10);
      let sum = 0;
      for (const o of paid) {
        const k = orderDayKey(o);
        if (k >= startS && k <= endS) sum += o.amountTotal;
      }
      weeks.push({ label: `W${4 - w}`, value: sum });
    }
    return {
      type: 'bars' as const,
      labels: weeks.map((x) => x.label),
      values: weeks.map((x) => x.value),
    };
  }, [orders, revenueTab]);

  const activity = useMemo(() => {
    const items: { id: string; text: string; time: string; href: string }[] = [];
    for (const b of [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)) {
      const name = `${b.contactFirstName} ${b.contactLastName ?? ''}`.trim();
      items.push({
        id: `b-${b.id}`,
        text: `Booking · ${name} · ${b.serviceName}`,
        time: b.createdAt,
        href: '/admin/bookings',
      });
    }
    for (const o of [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)) {
      const label =
        o.orderType === 'booking_deposit'
          ? 'Deposit order'
          : o.orderType === 'product_purchase'
            ? 'Product order'
            : 'Order';
      items.push({
        id: `o-${o.id}`,
        text: `${label} #${o.id} · ${o.status} · ${formatMoney(o.amountTotal)}`,
        time: o.createdAt,
        href: '/admin/orders',
      });
    }
    return items.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 10);
  }, [bookings, orders]);

  const maxBar = useMemo(() => {
    if (chartData.type !== 'bars') return 1;
    return Math.max(...chartData.values, 1);
  }, [chartData]);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Free slot alert */}
      {stats.freeSlotsToday > 0 && (
        <section className="rounded-2xl border border-[#e8ddd8] bg-[linear-gradient(135deg,#fff8fa_0%,#fffefc_100%)] p-5 shadow-[0_8px_32px_-12px_rgba(194,77,134,0.15)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fce8f0] text-[#b85c8a]">
                <Sparkles className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="font-brand text-lg font-semibold text-[#2a2228]">Open slots today</h2>
                <p className="mt-1 text-sm text-[#6d6268]">
                  <span className="font-semibold tabular-nums text-[#c24d86]">{stats.freeSlotsToday}</span> free slots
                  available — fill your calendar.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/booking"
                className="inline-flex items-center justify-center rounded-full border border-[#e5c4d4] bg-white px-4 py-2.5 text-sm font-semibold text-[#8b4d6a] shadow-sm transition hover:bg-[#fff5f9]"
              >
                Promote slots
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#9c4d72_0%,#c24d86_55%,#a93d71_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-md"
              >
                Add booking
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Upcoming + revenue */}
        <div className="space-y-6 lg:col-span-7">
          <section className="rounded-2xl border border-[#ebe6e3] bg-white p-5 shadow-[0_4px_24px_-8px_rgba(42,36,40,0.08)] sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a8989e]">Schedule</p>
                <h2 className="mt-1 font-brand text-xl font-semibold text-[#2a2228]">Upcoming bookings</h2>
              </div>
              <Link
                href="/admin/bookings"
                className="text-sm font-medium text-[#b85c8a] hover:text-[#9d4d72] inline-flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {!loaded ? (
              <p className="py-8 text-center text-sm text-[#9a8a94]">Loading…</p>
            ) : upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e8e0dc] bg-[#faf8f6] py-10 text-center">
                <p className="text-sm text-[#6d6268]">No upcoming appointments.</p>
                <Link href="/admin/slots" className="mt-3 inline-block text-sm font-medium text-[#c24d86]">
                  Manage availability
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((b) => {
                  const isToday = b.slotDate === todayIso();
                  const dateLabel = isToday
                    ? 'Today'
                    : new Date(`${b.slotDate}T12:00:00`).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      });
                  return (
                    <li key={b.id}>
                      <Link
                        href="/admin/bookings"
                        className="flex items-center gap-4 rounded-xl border border-[#f0ebe8] bg-[#fffcfc] p-3 transition hover:border-[#e5d0d8] hover:bg-[#fff8fa] hover:shadow-sm"
                      >
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#f5eeef] text-center">
                          <span className="text-[10px] font-medium uppercase text-[#a8989e]">{dateLabel}</span>
                          <span className="text-sm font-semibold tabular-nums text-[#2a2228]">{b.slotTime.slice(0, 5)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[#2a2228]">
                            {b.contactFirstName} {b.contactLastName ?? ''}
                          </p>
                          <p className="truncate text-sm text-[#6d6268]">{b.serviceName}</p>
                        </div>
                        <span
                          className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium sm:inline-block ${
                            b.status === 'confirmed'
                              ? 'bg-[#fce8f0] text-[#9d4d6a]'
                              : b.status === 'pending_payment'
                                ? 'bg-[#fff4e6] text-[#a67c2a]'
                                : 'bg-[#f0eeeb] text-[#6d6268]'
                          }`}
                        >
                          {b.status.replace('_', ' ')}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[#ebe6e3] bg-white p-5 shadow-[0_4px_24px_-8px_rgba(42,36,40,0.08)] sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a8989e]">Shop revenue</p>
                <h2 className="mt-1 font-brand text-xl font-semibold text-[#2a2228]">Revenue snapshot</h2>
                <p className="mt-0.5 text-xs text-[#9a8a94]">Paid product orders (Stripe)</p>
              </div>
              <div className="flex rounded-full border border-[#ebe6e3] bg-[#faf8f6] p-1">
                {(['today', 'week', 'month'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setRevenueTab(tab)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                      revenueTab === tab ? 'bg-white text-[#2a2228] shadow-sm' : 'text-[#8a7c82] hover:text-[#5c4f55]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            {chartData.type === 'single' ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-4xl font-semibold tabular-nums text-[#2a2228] sm:text-5xl">
                  {formatMoney(chartData.total)}
                </p>
                <p className="mt-2 text-sm text-[#6d6268]">{chartData.label}</p>
              </div>
            ) : (
              <div className="flex h-36 items-end gap-1.5 sm:gap-2 sm:h-44">
                {chartData.labels.map((label, i) => {
                  const v = chartData.values[i] ?? 0;
                  const h = Math.max(8, (v / maxBar) * 100);
                  return (
                    <div key={label + i} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex w-full flex-1 items-end justify-center">
                        <div
                          className="w-full max-w-[44px] rounded-t-lg bg-[linear-gradient(180deg,#e8b8cc_0%,#c24d86_100%)] opacity-90 transition hover:opacity-100"
                          style={{ height: `${h}%` }}
                          title={formatMoney(v)}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-[#9a8a94]">{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-4 border-t border-[#f0ebe8] pt-4 text-xs text-[#8a7c82]">
              <span>
                Today total: <strong className="text-[#2a2228]">{formatMoney(stats.revenueToday)}</strong>
              </span>
              <span>
                Week total: <strong className="text-[#2a2228]">{formatMoney(stats.revenueThisWeek)}</strong>
              </span>
            </div>
          </section>
        </div>

        {/* Orders + activity */}
        <div className="space-y-6 lg:col-span-5">
          <section className="rounded-2xl border border-[#ebe6e3] bg-white p-5 shadow-[0_4px_24px_-8px_rgba(42,36,40,0.08)] sm:p-6">
            <h2 className="font-brand text-lg font-semibold text-[#2a2228]">Orders & inventory</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href="/admin/orders"
                className="rounded-xl border border-[#f0ebe8] bg-[#faf8f6] p-4 transition hover:border-[#e5d8d4] hover:bg-[#fff8f6]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a8989e]">New orders</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-[#2a2228]">{loaded ? newOrdersPending : '—'}</p>
                <p className="mt-1 text-xs text-[#6d6268]">Awaiting payment</p>
              </Link>
              <Link
                href="/admin/products"
                className="rounded-xl border border-[#f0ebe8] bg-[#faf8f6] p-4 transition hover:border-[#e5d8d4] hover:bg-[#fff8f6]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a8989e]">Low stock</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-[#b85c6a]">{loaded ? lowStock.length : '—'}</p>
                <p className="mt-1 text-xs text-[#6d6268]">Products &lt; 5 units</p>
              </Link>
            </div>
            {loaded && lowStock.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-[#f0ebe8] pt-4">
                {lowStock.map((p) => (
                  <li key={p.id}>
                    <Link
                      href="/admin/products"
                      className="flex justify-between rounded-lg px-2 py-1.5 text-sm text-[#5c4f55] hover:bg-[#fff5f8]"
                    >
                      <span className="truncate">{p.nameEt}</span>
                      <span className="shrink-0 tabular-nums text-[#c24d86]">{p.stock} left</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/admin/orders"
                className="text-sm font-medium text-[#b85c8a] hover:text-[#9d4d72] inline-flex items-center gap-1"
              >
                All orders <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-[#e0d8d4]">·</span>
              <Link href="/admin/products" className="text-sm font-medium text-[#b85c8a] hover:text-[#9d4d72]">
                Manage products
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-[#ebe6e3] bg-white p-5 shadow-[0_4px_24px_-8px_rgba(42,36,40,0.08)] sm:p-6">
            <h2 className="font-brand text-lg font-semibold text-[#2a2228]">Activity</h2>
            <p className="mt-0.5 text-xs text-[#9a8a94]">Recent bookings & orders</p>
            <ul className="mt-4 space-y-0 divide-y divide-[#f5f0ed]">
              {!loaded ? (
                <li className="py-6 text-center text-sm text-[#9a8a94]">Loading…</li>
              ) : activity.length === 0 ? (
                <li className="py-6 text-center text-sm text-[#9a8a94]">No recent activity.</li>
              ) : (
                activity.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="block py-3 transition hover:bg-[#faf8f6]/80">
                      <p className="text-sm text-[#3d3539]">{item.text}</p>
                      <p className="mt-0.5 text-[11px] text-[#a8989e]">{relTime(item.time)}</p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>

      {/* Quick action grid */}
      <section>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a8989e]">Shortcuts</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: '/admin/bookings', label: 'Bookings', desc: 'Schedule & clients', icon: Calendar },
            { href: '/admin/slots', label: 'Slots', desc: 'Availability', icon: LayoutGrid },
            { href: '/admin/services', label: 'Services', desc: 'Treatments & pricing', icon: Sparkles },
            { href: '/admin/products', label: 'Products', desc: 'Shop catalog', icon: Package },
            { href: '/admin/gallery', label: 'Gallery', desc: 'Portfolio images', icon: ImageIcon },
            { href: '/admin/feedback', label: 'Feedback', desc: 'Client messages', icon: MessageSquare },
          ].map(({ href, label, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 rounded-2xl border border-[#ebe6e3] bg-white p-5 shadow-[0_4px_20px_-10px_rgba(42,36,40,0.06)] transition hover:border-[#e5ccd6] hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f8f0f3] text-[#b85c8a] transition group-hover:bg-[#fce8f0]">
                <Icon className="h-6 w-6" strokeWidth={1.6} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#2a2228]">{label}</p>
                <p className="text-sm text-[#8a7c82]">{desc}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-[#d4c8cc] transition group-hover:text-[#c24d86]" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
