'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Megaphone, MessageSquare, Plus, Sparkles } from 'lucide-react';

type Props = {
  todayBookingsCount: number;
  freeSlotsToday: number;
  revenueSecuredToday: number;
};

type SlotRow = { date: string; time: string; available?: boolean };

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function money(n: number) {
  return `€${Math.round(n)}`;
}

export function AdminDailyPerformanceStrip({ todayBookingsCount, freeSlotsToday, revenueSecuredToday }: Props) {
  const [primeTimeEmptySlots, setPrimeTimeEmptySlots] = useState<number | null>(null);

  const capacity = todayBookingsCount + freeSlotsToday;

  // Conservative estimate: use a studio-average ticket if we don't have per-slot pricing.
  const estAvgTicket = 55;
  const remainingPotential = useMemo(() => freeSlotsToday * estAvgTicket, [freeSlotsToday]);
  const forecast = useMemo(() => revenueSecuredToday + remainingPotential, [revenueSecuredToday, remainingPotential]);

  useEffect(() => {
    let cancelled = false;
    const loadPrimeTime = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(`/api/slots?admin=1&date=${encodeURIComponent(today)}&lang=et`, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const data = (await res.json()) as { slots?: SlotRow[] };
        const slots = Array.isArray(data.slots) ? data.slots : [];
        const prime = slots.filter((s) => (s.available ?? true) && toMinutes(s.time) >= 17 * 60).length;
        if (!cancelled) setPrimeTimeEmptySlots(prime);
      } catch {
        if (!cancelled) setPrimeTimeEmptySlots(null);
      }
    };
    void loadPrimeTime();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="admin-v2-surface mb-8 overflow-hidden">
      <div className="relative p-5 sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_20%_0%,rgba(194,77,134,0.12)_0%,transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="admin-v2-overline">Today performance</p>
            <h2 className="mt-1 font-brand text-[24px] font-semibold tracking-tight text-[#2a2228]">
              Salon Command Center
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#6f6168]">
              Urgency cues + revenue guidance for faster slot fill.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/booking"
              className="admin-v2-btn-secondary"
            >
              <Megaphone className="h-4 w-4" />
              Promote empty slots
            </Link>
            <Link
              href="/admin/slots"
              className="admin-v2-btn-secondary"
            >
              <Sparkles className="h-4 w-4" />
              Add last minute offer
            </Link>
            <Link
              href="/admin/bookings"
              className="admin-v2-btn-secondary"
            >
              <MessageSquare className="h-4 w-4" />
              Remind pending deposits
            </Link>
            <Link
              href="/book"
              className="admin-v2-btn-primary"
            >
              <Plus className="h-4 w-4" />
              Quick add walk-in
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="admin-v2-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a8989e]">Bookings today</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#2a2228]">
              {todayBookingsCount} <span className="text-[#b5a8ad]">/ {capacity}</span>
            </p>
            <p className="mt-1 text-xs text-[#9a8a94]">Booked vs capacity (booked + free slots).</p>
          </div>

          <div className="admin-v2-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a8989e]">Revenue secured</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#2a2228]">{money(revenueSecuredToday)}</p>
            <p className="mt-1 text-xs text-[#9a8a94]">Paid orders today (deposits + shop).</p>
          </div>

          <div className="admin-v2-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a8989e]">Remaining potential</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#2a2228]">{money(remainingPotential)}</p>
            <p className="mt-1 text-xs text-[#9a8a94]">Est. {money(estAvgTicket)} per open slot.</p>
          </div>

          <div className="admin-v2-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a8989e]">Prime-time empty</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#2a2228]">
              {primeTimeEmptySlots === null ? '—' : primeTimeEmptySlots}
            </p>
            <p className="mt-1 text-xs text-[#9a8a94]">Open slots from 17:00+ today.</p>
          </div>
        </div>

        <div className="admin-v2-surface-soft relative mt-4 p-4">
          <p className="text-sm font-medium text-[#5f4f58]">
            Revenue forecast:{' '}
            <span className="font-semibold text-[#2a2228]">{money(forecast)}</span>{' '}
            <span className="text-[#9a8a94]">(if remaining slots are filled)</span>
          </p>
        </div>
      </div>
    </section>
  );
}
