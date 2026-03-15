'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

interface Booking {
  id: string;
  source: 'guided' | 'fast';
  status: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  slotDate: string;
  slotTime: string;
  contactFirstName: string;
  contactLastName: string | null;
  contactPhone: string;
  contactEmail: string | null;
  contactNotes: string | null;
  totalPrice: number;
  paymentStatus: string;
  createdAt: string;
}

function statusUi(status: string) {
  if (status === 'confirmed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'cancelled') return 'bg-rose-50 text-rose-700';
  if (status === 'pending_payment') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}

function statusLabel(status: string) {
  if (status === 'confirmed') return 'Kinnitatud';
  if (status === 'cancelled') return 'Tühistatud';
  if (status === 'pending_payment') return 'Ootel';
  return status;
}

function paymentLabel(status: string) {
  if (status === 'paid') return 'Makstud';
  if (status === 'pending') return 'Makse ootel';
  if (status === 'failed') return 'Makse ebaõnnestus';
  return 'Tasumata';
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [view, setView] = useState<'today' | 'upcoming' | 'all'>('today');

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/bookings?limit=250', { cache: 'no-store' });
      if (!response.ok) throw new Error('Broneeringute laadimine ebaõnnestus');
      const data = (await response.json()) as { bookings?: Booking[] };
      setBookings(data.bookings ?? []);
    } catch (loadError) {
      console.error(loadError);
      setError('Broneeringute laadimine ebaõnnestus.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  const todayIso = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    const sorted = [...bookings].sort((a, b) =>
      `${a.slotDate} ${a.slotTime}`.localeCompare(`${b.slotDate} ${b.slotTime}`)
    );

    if (view === 'today') return sorted.filter((booking) => booking.slotDate === todayIso);
    if (view === 'upcoming') return sorted.filter((booking) => booking.slotDate >= todayIso);
    return sorted;
  }, [bookings, todayIso, view]);

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error('Staatuse uuendamine ebaõnnestus');
      setBookings((prev) => prev.map((booking) => (booking.id === id ? { ...booking, status } : booking)));
    } catch (updateError) {
      console.error(updateError);
      setError('Staatuse uuendamine ebaõnnestus.');
    } finally {
      setSavingId(null);
    }
  };

  const saveNotes = async (id: string) => {
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          contactNotes: notesDraft[id] ?? '',
        }),
      });
      if (!response.ok) throw new Error('Märkme salvestamine ebaõnnestus');
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id ? { ...booking, contactNotes: notesDraft[id] ?? '' } : booking
        )
      );
    } catch (saveError) {
      console.error(saveError);
      setError('Märkme salvestamine ebaõnnestus.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="admin-shell min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff4fa_40%,_#f7ecf4_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="admin-header mb-6 rounded-3xl border border-[#e8e2dc] bg-white/90 p-6 shadow-[0_28px_42px_-34px_rgba(57,45,39,0.42)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#b983a2]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#2f2230]">Broneeringud</h1>
              <p className="mt-2 text-sm text-[#6f5a6a]">Kaardivaade kliendi, teenuse ja ajaga.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-[#6f5d53]" href="/admin">
                Halduspaneel
              </Link>
              <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-[#6f5d53]" href="/admin/orders">
                Tellimused
              </Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        <section className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setView('today')}
            className={`rounded-full px-4 py-2 text-sm font-medium ${view === 'today' ? 'bg-[#8a5e76] text-white' : 'bg-white text-[#6f5a6a]'}`}
          >
            Tänased
          </button>
          <button
            onClick={() => setView('upcoming')}
            className={`rounded-full px-4 py-2 text-sm font-medium ${view === 'upcoming' ? 'bg-[#8a5e76] text-white' : 'bg-white text-[#6f5a6a]'}`}
          >
            Tulevased
          </button>
          <button
            onClick={() => setView('all')}
            className={`rounded-full px-4 py-2 text-sm font-medium ${view === 'all' ? 'bg-[#8a5e76] text-white' : 'bg-white text-[#6f5a6a]'}`}
          >
            Kõik
          </button>
        </section>

        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {loading && <div className="rounded-2xl bg-white p-6 text-sm text-[#6f5a6a]">Laen broneeringuid...</div>}

        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-sm text-[#6f5a6a]">Selles vaates broneeringuid ei ole.</div>
        )}

        <div className="space-y-3">
          {filtered.map((booking) => (
            <article
              key={booking.id}
              className="admin-surface rounded-3xl border border-[#ece3db] bg-white/95 p-5 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#8d7390]">
                    {booking.slotDate} · kell {booking.slotTime}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-[#2f2230]">
                    {booking.contactFirstName} {booking.contactLastName ?? ''}
                  </h2>
                  <p className="text-sm text-[#6f5a6a]">
                    {booking.serviceName} · {booking.serviceDuration} min · EUR {booking.totalPrice}
                  </p>
                  <p className="mt-1 text-xs text-[#8d7390]">{booking.contactPhone}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusUi(booking.status)}`}>
                    {statusLabel(booking.status)}
                  </span>
                  <span className="rounded-full bg-[#f1eff7] px-2.5 py-1 text-xs text-[#5e5c7f]">
                    {paymentLabel(booking.paymentStatus)}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  disabled={savingId === booking.id}
                  onClick={() => updateStatus(booking.id, 'confirmed')}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 disabled:opacity-60"
                >
                  Kinnita
                </button>
                <button
                  disabled={savingId === booking.id}
                  onClick={() => updateStatus(booking.id, 'cancelled')}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-60"
                >
                  Tühista
                </button>
                {booking.status === 'confirmed' && (
                  <Link
                    href={`/book?service=${encodeURIComponent(booking.serviceId)}&date=${encodeURIComponent(
                      (() => {
                        const base = new Date(`${booking.slotDate}T00:00:00`);
                        base.setDate(base.getDate() + 28);
                        return base.toISOString().slice(0, 10);
                      })()
                    )}&time=${encodeURIComponent(booking.slotTime)}`}
                    className="rounded-xl border border-[#ddd8ec] bg-[#f6f4ff] px-3 py-2 text-sm font-medium text-[#5e5887]"
                  >
                    Broneeri sama teenus 4 nädala pärast
                  </Link>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-[#ece3db] bg-[#fffcf7] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#9a7d95]">Kliendi märge</p>
                <textarea
                  value={notesDraft[booking.id] ?? booking.contactNotes ?? ''}
                  onChange={(event) =>
                    setNotesDraft((prev) => ({
                      ...prev,
                      [booking.id]: event.target.value,
                    }))
                  }
                  placeholder="Näiteks: eelistab mandlikuju, tundlik küünenahk, lühem pikkus..."
                  className="mt-2 min-h-20 w-full rounded-xl border border-[#e5ddd3] px-3 py-2 text-sm outline-none focus:border-[#8a5e76]"
                />
                <button
                  onClick={() => saveNotes(booking.id)}
                  disabled={savingId === booking.id}
                  className="mt-2 rounded-lg bg-[#8a5e76] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Salvesta märge
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
