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

export function AdminTodayTimeline({ items, showHeader = true }: { items: TodayBookingItem[]; showHeader?: boolean }) {
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

  const content = (
    <>
      {error ? <p className="mb-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">{error}</p> : null}

      <div className="space-y-2.5">
        {bookings.length === 0 && showHeader ? <p className="type-small admin-muted">Täna pole broneeringuid.</p> : null}
        {bookings.map((booking) => (
          <div key={booking.id} className="rounded-2xl border border-[var(--color-border-card-soft)] bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold admin-heading">
                  {booking.slotTime} — {booking.clientName}
                </p>
                <p className="type-small admin-muted">{booking.serviceName}</p>
                <p className="mt-1 text-[11px] admin-muted">
                  {statusLabel(booking.status)} — {paymentLabel(booking.paymentStatus)}
                </p>
              </div>
              <Link href={`/admin/bookings?view=today&edit=${booking.id}`} className="btn-secondary btn-secondary-sm text-xs">
                Vaata infot
              </Link>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <button disabled={savingId === booking.id} onClick={() => void patchBooking(booking.id, { status: 'confirmed' })} className="rounded-lg border border-[var(--color-border-card-soft)] bg-[#fff8fb] px-2 py-1 text-xs font-medium text-[var(--color-text-body)] hover:bg-[#fff4fa] disabled:opacity-60">
                Kinnita
              </button>
              <button disabled={savingId === booking.id} onClick={() => void patchBooking(booking.id, { status: 'completed', paymentStatus: 'paid' })} className="rounded-lg border border-[var(--color-border-card-soft)] bg-[#fff8fb] px-2 py-1 text-xs font-medium text-[var(--color-text-body)] hover:bg-[#fff4fa] disabled:opacity-60">
                Lõpeta
              </button>
              <button
                disabled={savingId === booking.id}
                onClick={() =>
                  void patchBooking(booking.id, {
                    paymentStatus: booking.paymentStatus === 'paid' ? 'unpaid' : 'paid',
                  })
                }
                className="rounded-lg border border-[var(--color-border-card-soft)] bg-[#fff8fb] px-2 py-1 text-xs font-medium text-[var(--color-text-body)] hover:bg-[#fff4fa] disabled:opacity-60"
              >
                {booking.paymentStatus === 'paid' ? 'Märgi tasumata' : 'Märgi makstud'}
              </button>
              <button disabled={savingId === booking.id} onClick={() => void confirmCancel(booking)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60">
                Tühista
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (!showHeader) {
    return <div className="contents">{content}</div>;
  }

  return (
    <article className="rounded-2xl border border-[var(--color-border-card-soft)] bg-white/90 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="type-overline text-[var(--color-text-muted)]">Täna tegevused</p>
          <h2 className="type-h4 admin-heading mt-1">Broneeringute ajajoon</h2>
        </div>
        <Link href="/admin/bookings?view=today" className="btn-secondary btn-secondary-sm">
          Ava kõik
        </Link>
      </div>
      {content}
    </article>
  );
}
