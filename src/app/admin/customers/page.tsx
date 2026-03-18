'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Search, Filter, ArrowUpDown, Users, ArrowRight, Star, ShieldAlert, CalendarClock, ShoppingBag } from 'lucide-react';

type CustomerListItem = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  preferredLanguage: 'et' | 'en' | null;
  notes: string | null;
  totalSpend: number;
  totalBookings: number;
  totalOrders: number;
  lastBookingAt: string | null;
  nextBookingAt: string | null;
  cancelRate: number;
  flags: string[];
};

type SortKey = 'updated' | 'spendDesc' | 'lastBookingDesc' | 'nextBookingAsc';

function money(n: number) {
  return `€${Math.round(n)}`;
}

function dateShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function timeShort(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');

  const [repeatOnly, setRepeatOnly] = useState(false);
  const [vipOnly, setVipOnly] = useState(false);
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [productBuyerOnly, setProductBuyerOnly] = useState(false);
  const [cancelsOftenOnly, setCancelsOftenOnly] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    params.set('sort', sort);
    if (repeatOnly) params.set('repeat', '1');
    if (vipOnly) params.set('vip', '1');
    if (inactiveOnly) params.set('inactive', '1');
    if (upcomingOnly) params.set('upcoming', '1');
    if (productBuyerOnly) params.set('productBuyer', '1');
    if (cancelsOftenOnly) params.set('cancelsOften', '1');
    return params.toString();
  }, [q, sort, repeatOnly, vipOnly, inactiveOnly, upcomingOnly, productBuyerOnly, cancelsOftenOnly]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/customers?${queryString}`, { cache: 'no-store' });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? 'Failed to load customers');
        }
        const data = (await res.json()) as { customers?: CustomerListItem[] };
        if (!cancelled) setCustomers(Array.isArray(data.customers) ? data.customers : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load customers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const kpi = useMemo(() => {
    const total = customers.length;
    const vip = customers.filter((c) => c.flags.includes('VIP')).length;
    const inactive = customers.filter((c) => c.flags.includes('Inactive')).length;
    const risky = customers.filter((c) => c.flags.includes('Cancels often')).length;
    return { total, vip, inactive, risky };
  }, [customers]);

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminPageHeader
          overline="CRM"
          title="Customers"
          subtitle="Unified client profiles across bookings and orders. Safe matching: email exact → phone exact."
          backHref="/admin"
          backLabel="Halduspaneel"
          secondaryLinks={[{ label: 'Bookings', href: '/admin/bookings' }, { label: 'Orders', href: '/admin/orders' }]}
        />

        <section className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f8f0f3] text-[#b85c8a]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Today focus</p>
                <p className="text-sm font-semibold text-slate-800">Who to prioritize</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-[#f1ece8] bg-[#fffdfd] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Customers</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">{kpi.total}</p>
              </div>
              <div className="rounded-xl border border-[#f1ece8] bg-[#fffdfd] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">VIP</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">{kpi.vip}</p>
              </div>
              <div className="rounded-xl border border-[#f1ece8] bg-[#fffdfd] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Inactive</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">{kpi.inactive}</p>
              </div>
              <div className="rounded-xl border border-[#f1ece8] bg-[#fffdfd] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Risky</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">{kpi.risky}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#e5e7eb] bg-slate-50 px-3 py-2.5">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, phone…"
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-700">
                <ArrowUpDown className="h-4 w-4 text-slate-500" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="bg-transparent text-sm focus:outline-none"
                >
                  <option value="updated">Recently updated</option>
                  <option value="spendDesc">Highest spend</option>
                  <option value="lastBookingDesc">Last booking</option>
                  <option value="nextBookingAsc">Next booking</option>
                </select>
              </label>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                <Filter className="h-4 w-4 text-slate-500" />
                Filters
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: 'repeat', label: 'Repeat clients', state: repeatOnly, set: setRepeatOnly, icon: Star },
              { key: 'vip', label: 'High value', state: vipOnly, set: setVipOnly, icon: Star },
              { key: 'cancels', label: 'Cancels often', state: cancelsOftenOnly, set: setCancelsOftenOnly, icon: ShieldAlert },
              { key: 'inactive', label: 'Inactive', state: inactiveOnly, set: setInactiveOnly, icon: ShieldAlert },
              { key: 'upcoming', label: 'Has upcoming', state: upcomingOnly, set: setUpcomingOnly, icon: CalendarClock },
              { key: 'buyer', label: 'Product buyer', state: productBuyerOnly, set: setProductBuyerOnly, icon: ShoppingBag },
            ].map(({ key, label, state, set, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => set(!state)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  state ? 'border-[#e5c4d4] bg-[#fff2f9] text-[#8b4d6a]' : 'border-[#e5e7eb] bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">{error}</div>
        )}

        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Customer list</h2>
            <p className="text-sm text-slate-500">{loading ? 'Loading…' : `${customers.length} customers`}</p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">Loading customers…</div>
          ) : customers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-14 text-center">
              <p className="text-sm font-medium text-slate-700">No customers found.</p>
              <p className="mt-1 text-xs text-slate-500">Try a different search or remove filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {customers.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/customers/${encodeURIComponent(c.id)}`}
                  className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-[#e5ccd6] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-800">{c.fullName}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{c.email ?? c.phone ?? '—'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total spend</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">{money(c.totalSpend)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.flags.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
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
                    {c.flags.length > 3 && <span className="text-[10px] font-semibold text-slate-400">+{c.flags.length - 3}</span>}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Bookings</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800">{c.totalBookings}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Orders</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800">{c.totalOrders}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="min-w-0">
                      <p className="truncate">
                        Last: {c.lastBookingAt ? `${dateShort(c.lastBookingAt)} ${timeShort(c.lastBookingAt)}` : '—'}
                      </p>
                      <p className="truncate">
                        Next: {c.nextBookingAt ? `${dateShort(c.nextBookingAt)} ${timeShort(c.nextBookingAt)}` : '—'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[#c24d86]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

