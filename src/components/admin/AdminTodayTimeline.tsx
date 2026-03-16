'use client';

import Link from 'next/link';
import { useState } from 'react';

interface TodayBookingItem {
  id: string;
  clientName: string;
  serviceName: string;
  slotTime: string;
  status: string;
  paymentStatus: string;
}

function statusLabel(status: string) {
  if (status === 'confirmed') return 'Kinnitatud';
  if (status === 'completed') return 'Lopetatud';
  if (status === 'cancelled') return 'Tuhistatud';
  if (status === 'pending_payment') return 'Makse ootel';
  return status;
}

function paymentLabel(status: string) {
  if (status === 'paid') return 'Makstud';
  if (status === 'pending') return 'Makse ootel';
  if (status === 'failed') return 'Makse ebaonnestus';
  return 'Tasumata';
}

export function AdminTodayTimeline({ items }: { items: TodayBookingItem[] }) {
  const [bookings, setBookings] = useState(items);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patchBooking = async (id: string, payload: Record<string, unknown>) => {
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      });
      if (!response.ok) throw new Error('Uuendamine ebaonnestus');
      setBookings((prev) => prev.map((booking) => (booking.id === id ? { ...booking, ...payload } : booking)));
    } catch (patchError) {
      console.error(patchError);
      setError('Ajajoone muutmine ebaonnestus.');
    } finally {
      setSavingId(null);
    }
  };

  const confirmCancel = async (booking: TodayBookingItem) => {
    const isConfirmed = window.confirm(`Kas tuhistada broneering: ${booking.clientName} (${booking.slotTime})?`);
    if (!isConfirmed) return;
    await patchBooking(booking.id, { status: 'cancelled' });
  };

  return (
    <article className="admin-panel rounded-3xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#6b7280]">Tana tegevused</p>
          <h2 className="mt-1 text-lg font-semibold text-[#111827]">Broneeringute ajajoon</h2>
        </div>
        <Link href="/admin/bookings?view=today" className="rounded-xl border border-[#d1d5db] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151]">
          Ava koik
        </Link>
      </div>

      {error ? <p className="mb-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">{error}</p> : null}

      <div className="space-y-2.5">
        {bookings.length === 0 ? <p className="text-sm text-[#6b7280]">Tana pole broneeringuid.</p> : null}
        {bookings.map((booking) => (
          <div key={booking.id} className="rounded-2xl border border-[#e5e7eb] bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#111827]">
                  {booking.slotTime} - {booking.clientName}
                </p>
                <p className="text-xs text-[#6b7280]">{booking.serviceName}</p>
                <p className="mt-1 text-[11px] text-[#4b5563]">
                  {statusLabel(booking.status)} - {paymentLabel(booking.paymentStatus)}
                </p>
              </div>
              <Link href={`/admin/bookings?view=today&edit=${booking.id}`} className="rounded-lg border border-[#d1d5db] bg-white px-2 py-1 text-xs text-[#374151]">
                Vaata infot
              </Link>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <button disabled={savingId === booking.id} onClick={() => void patchBooking(booking.id, { status: 'confirmed' })} className="rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-2 py-1 text-xs text-[#374151] disabled:opacity-60">
                Kinnita
              </button>
              <button disabled={savingId === booking.id} onClick={() => void patchBooking(booking.id, { status: 'completed', paymentStatus: 'paid' })} className="rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-2 py-1 text-xs text-[#374151] disabled:opacity-60">
                Lopeta
              </button>
              <button
                disabled={savingId === booking.id}
                onClick={() =>
                  void patchBooking(booking.id, {
                    paymentStatus: booking.paymentStatus === 'paid' ? 'unpaid' : 'paid',
                  })
                }
                className="rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-2 py-1 text-xs text-[#374151] disabled:opacity-60"
              >
                {booking.paymentStatus === 'paid' ? 'Margi tasumata' : 'Margi makstud'}
              </button>
              <button disabled={savingId === booking.id} onClick={() => void confirmCancel(booking)} className="rounded-lg border border-[#fecaca] bg-[#fff1f2] px-2 py-1 text-xs text-[#b91c1c] disabled:opacity-60">
                Tuhista
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
