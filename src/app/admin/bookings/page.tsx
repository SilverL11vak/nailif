'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

interface Booking {
  id: string;
  source: 'guided' | 'fast';
  status: 'confirmed' | 'cancelled' | 'pending_payment' | 'completed' | string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice?: number;
  slotDate: string;
  slotTime: string;
  contactFirstName: string;
  contactLastName: string | null;
  contactPhone: string;
  contactEmail: string | null;
  contactNotes: string | null;
  inspirationImage?: string | null;
  currentNailImage?: string | null;
  inspirationNote?: string | null;
  addOns?: Array<{ id?: string; name: string; price: number; duration?: number }>;
  totalPrice: number;
  totalDuration?: number;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | string;
  depositAmount?: number;
  stripeSessionId?: string | null;
  createdAt: string;
}

interface ServiceOption {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface EditDraft {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  slotDate: string;
  slotTime: string;
  status: Booking['status'];
  paymentStatus: Booking['paymentStatus'];
  contactNotes: string;
}

function statusUi(status: string) {
  if (status === 'confirmed') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'completed') return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
  if (status === 'cancelled') return 'bg-rose-50 text-rose-700 border border-rose-200';
  if (status === 'pending_payment') return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
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

function toIsoDateFromNowPlus(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function toInputTime(time: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time) ? time : '10:00';
}

export default function AdminBookingsPage() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [view, setView] = useState<'today' | 'upcoming' | 'all'>('today');
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [urlHandled, setUrlHandled] = useState(false);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/bookings?limit=250', { cache: 'no-store' });
      if (!response.ok) throw new Error('Broneeringute laadimine ebaonnestus');
      const data = (await response.json()) as { bookings?: Booking[] };
      setBookings(data.bookings ?? []);
    } catch (loadError) {
      console.error(loadError);
      setError('Broneeringute laadimine ebaonnestus.');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await fetch('/api/services?admin=1&lang=et', { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { services?: ServiceOption[] };
      if (Array.isArray(data.services)) setServices(data.services);
    } catch {
      setServices([]);
    }
  };

  useEffect(() => {
    void Promise.all([loadBookings(), loadServices()]);
  }, []);

  useEffect(() => {
    if (urlHandled || bookings.length === 0) return;
    const viewParam = searchParams.get('view');
    const editParam = searchParams.get('edit');
    if (viewParam === 'today' || viewParam === 'upcoming' || viewParam === 'all') {
      setView(viewParam);
    }
    if (editParam) {
      const booking = bookings.find((item) => item.id === editParam);
      if (booking) {
        setSelectedBookingId(booking.id);
        openEdit(booking);
      }
    } else {
      setSelectedBookingId(bookings[0]?.id ?? null);
    }
    setUrlHandled(true);
  }, [bookings, searchParams, urlHandled]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    const sorted = [...bookings].sort((a, b) =>
      `${a.slotDate} ${a.slotTime}`.localeCompare(`${b.slotDate} ${b.slotTime}`)
    );
    if (view === 'today') return sorted.filter((booking) => booking.slotDate === todayIso);
    if (view === 'upcoming') return sorted.filter((booking) => booking.slotDate >= todayIso);
    return sorted;
  }, [bookings, todayIso, view]);

  const selectedBooking = filtered.find((item) => item.id === selectedBookingId) ?? filtered[0] ?? null;

  const patchBooking = async (id: string, payload: Record<string, unknown>) => {
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      });
      if (!response.ok) throw new Error('Broneeringu uuendamine ebaonnestus');
      const data = (await response.json()) as { booking?: Partial<Booking> };

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id
            ? {
                ...booking,
                ...payload,
                ...data.booking,
              }
            : booking
        )
      );
      return true;
    } catch (updateError) {
      console.error(updateError);
      setError('Broneeringu uuendamine ebaonnestus.');
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const openEdit = (booking: Booking) => {
    setEditDraft({
      id: booking.id,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      serviceDuration: booking.serviceDuration,
      servicePrice: booking.servicePrice ?? booking.totalPrice,
      slotDate: booking.slotDate,
      slotTime: toInputTime(booking.slotTime),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      contactNotes: booking.contactNotes ?? '',
    });
  };

  const onServiceChange = (serviceId: string) => {
    if (!editDraft) return;
    const selected = services.find((service) => service.id === serviceId);
    if (!selected) {
      setEditDraft((prev) => (prev ? { ...prev, serviceId } : prev));
      return;
    }
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            serviceId: selected.id,
            serviceName: selected.name,
            serviceDuration: selected.duration,
            servicePrice: selected.price,
          }
        : prev
    );
  };

  const saveEditDraft = async () => {
    if (!editDraft) return;
    const success = await patchBooking(editDraft.id, {
      status: editDraft.status,
      paymentStatus: editDraft.paymentStatus,
      slotDate: editDraft.slotDate,
      slotTime: editDraft.slotTime,
      serviceId: editDraft.serviceId,
      serviceName: editDraft.serviceName,
      serviceDuration: editDraft.serviceDuration,
      servicePrice: editDraft.servicePrice,
      totalPrice: editDraft.servicePrice,
      totalDuration: editDraft.serviceDuration,
      contactNotes: editDraft.contactNotes,
    });
    if (success) setEditDraft(null);
  };

  const summaryCounts = useMemo(
    () => ({
      total: filtered.length,
      paid: filtered.filter((booking) => booking.paymentStatus === 'paid').length,
      pending: filtered.filter((booking) => booking.status === 'pending_payment').length,
    }),
    [filtered]
  );

  return (
    <main className="admin-cockpit-bg px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1300px]">
        <header className="admin-cockpit-shell mb-6 rounded-[28px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6b7280]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#111827]">Broneeringud</h1>
              <p className="mt-2 text-sm text-[#4b5563]">Koik broneeringu detailid ja tegevused uhes vaates.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563]" href="/admin">
                Halduspaneel
              </Link>
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563]" href="/admin/slots">
                Vabad ajad
              </Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        <section className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="admin-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Vaates kokku</p>
            <p className="mt-1 text-2xl font-semibold text-[#111827]">{summaryCounts.total}</p>
          </div>
          <div className="admin-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Makstud</p>
            <p className="mt-1 text-2xl font-semibold text-[#111827]">{summaryCounts.paid}</p>
          </div>
          <div className="admin-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Makse ootel</p>
            <p className="mt-1 text-2xl font-semibold text-[#111827]">{summaryCounts.pending}</p>
          </div>
        </section>

        <section className="mb-4 flex flex-wrap gap-2">
          {[
            { key: 'today', label: 'Tanased' },
            { key: 'upcoming', label: 'Tulevased' },
            { key: 'all', label: 'Koik' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key as 'today' | 'upcoming' | 'all')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                view === item.key ? 'bg-[#111827] text-white' : 'bg-white text-[#4b5563] border border-[#d1d5db]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </section>

        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {loading && <div className="rounded-2xl bg-white p-6 text-sm text-[#4b5563]">Laen broneeringuid...</div>}
        {!loading && filtered.length === 0 && <div className="rounded-2xl bg-white p-6 text-sm text-[#4b5563]">Selles vaates broneeringuid ei ole.</div>}

        {!loading && filtered.length > 0 && (
          <section className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
            <article className="admin-panel rounded-3xl p-4">
              <h2 className="mb-3 text-base font-semibold text-[#111827]">Broneeringute nimekiri</h2>
              <div className="space-y-2">
                {filtered.map((booking) => {
                  const active = selectedBooking?.id === booking.id;
                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => setSelectedBookingId(booking.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        active
                          ? 'border-[#9ca3af] bg-[#f9fafb] shadow-[0_10px_26px_-20px_rgba(15,23,42,0.5)]'
                          : 'border-[#e5e7eb] bg-white hover:bg-[#fbfbfc]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">
                            {booking.contactFirstName} {booking.contactLastName ?? ''}
                          </p>
                          <p className="text-xs text-[#4b5563]">
                            {booking.slotDate} kell {booking.slotTime}
                          </p>
                          <p className="mt-1 text-xs text-[#6b7280]">{booking.serviceName}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusUi(booking.status)}`}>
                          {statusLabel(booking.status)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </article>

            {selectedBooking && (
              <article className="admin-panel rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Broneeringu detailid</p>
                    <h2 className="mt-1 text-xl font-semibold text-[#111827]">
                      {selectedBooking.contactFirstName} {selectedBooking.contactLastName ?? ''}
                    </h2>
                    <p className="text-sm text-[#4b5563]">{selectedBooking.contactPhone}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusUi(selectedBooking.status)}`}>
                      {statusLabel(selectedBooking.status)}
                    </span>
                    <span className="rounded-full border border-[#d1d5db] bg-[#f9fafb] px-2.5 py-1 text-xs text-[#4b5563]">
                      {paymentLabel(selectedBooking.paymentStatus)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white p-3 text-sm text-[#374151]">
                    <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[#6b7280]">Aeg ja teenus</p>
                    <p>{selectedBooking.slotDate} kell {selectedBooking.slotTime}</p>
                    <p>{selectedBooking.serviceName}</p>
                    <p>{selectedBooking.serviceDuration} min</p>
                  </div>
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white p-3 text-sm text-[#374151]">
                    <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[#6b7280]">Makse info</p>
                    <p>Teenuse hind: EUR {selectedBooking.servicePrice ?? selectedBooking.totalPrice}</p>
                    <p>Kokku: EUR {selectedBooking.totalPrice}</p>
                    <p>Ettemaks: EUR {selectedBooking.depositAmount ?? 0}</p>
                  </div>
                </div>

                {(selectedBooking.contactNotes || selectedBooking.inspirationNote) && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {selectedBooking.contactNotes && (
                      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-3">
                        <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[#6b7280]">Kliendi markused</p>
                        <p className="text-sm text-[#374151]">{selectedBooking.contactNotes}</p>
                      </div>
                    )}
                    {selectedBooking.inspirationNote && (
                      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-3">
                        <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[#6b7280]">Inspiratsiooni markus</p>
                        <p className="text-sm text-[#374151]">{selectedBooking.inspirationNote}</p>
                      </div>
                    )}
                  </div>
                )}

                {(selectedBooking.inspirationImage || selectedBooking.currentNailImage) && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {selectedBooking.inspirationImage && (
                      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-2">
                        <p className="mb-2 text-xs text-[#6b7280]">Inspiratsioonifoto</p>
                        <div className="relative h-40 w-full overflow-hidden rounded-xl">
                          <Image src={selectedBooking.inspirationImage} alt="Inspiratsioonifoto" fill className="object-cover" unoptimized />
                        </div>
                      </div>
                    )}
                    {selectedBooking.currentNailImage && (
                      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-2">
                        <p className="mb-2 text-xs text-[#6b7280]">Praeguste kuunte foto</p>
                        <div className="relative h-40 w-full overflow-hidden rounded-xl">
                          <Image src={selectedBooking.currentNailImage} alt="Praeguste kuunte foto" fill className="object-cover" unoptimized />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedBooking.addOns && selectedBooking.addOns.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-[#e5e7eb] bg-white p-3">
                    <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[#6b7280]">Lisateenused</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBooking.addOns.map((addOn, index) => (
                        <span key={`${selectedBooking.id}-addon-${addOn.id ?? index}`} className="rounded-full border border-[#d1d5db] bg-[#f9fafb] px-3 py-1 text-xs text-[#374151]">
                          {addOn.name} (+EUR {addOn.price}
                          {addOn.duration ? `, ${addOn.duration} min` : ''})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button disabled={savingId === selectedBooking.id} onClick={() => void patchBooking(selectedBooking.id, { status: 'confirmed' })} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 disabled:opacity-60">Kinnita</button>
                  <button disabled={savingId === selectedBooking.id} onClick={() => void patchBooking(selectedBooking.id, { status: 'completed', paymentStatus: 'paid' })} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 disabled:opacity-60">Margi lopetatuks</button>
                  <button disabled={savingId === selectedBooking.id} onClick={() => void patchBooking(selectedBooking.id, { status: 'cancelled' })} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-60">Tuhista</button>
                  <button disabled={savingId === selectedBooking.id} onClick={() => void patchBooking(selectedBooking.id, { paymentStatus: selectedBooking.paymentStatus === 'paid' ? 'unpaid' : 'paid' })} className="rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-sm font-medium text-[#374151] disabled:opacity-60">
                    {selectedBooking.paymentStatus === 'paid' ? 'Margi tasumata' : 'Margi makstuks'}
                  </button>
                  <button onClick={() => openEdit(selectedBooking)} className="rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151]">Muuda detaile</button>
                  {selectedBooking.status === 'confirmed' && (
                    <Link href={`/book?service=${encodeURIComponent(selectedBooking.serviceId)}&date=${encodeURIComponent(toIsoDateFromNowPlus(28))}&time=${encodeURIComponent(selectedBooking.slotTime)}`} className="rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-sm font-medium text-[#374151]">
                      Broneeri sama teenus 4 nadala parast
                    </Link>
                  )}
                </div>
              </article>
            )}
          </section>
        )}
      </div>

      {editDraft && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-[#d1d5db] bg-white p-6 shadow-[0_30px_52px_-24px_rgba(61,45,55,0.5)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Broneeringu muutmine</p>
                <h2 className="text-xl font-semibold text-[#111827]">Kiirmuutja</h2>
              </div>
              <button onClick={() => setEditDraft(null)} className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#4b5563]">Sule</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-[#4b5563]">
                Teenus
                <select value={editDraft.serviceId} onChange={(event) => onServiceChange(event.target.value)} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm">
                  <option value={editDraft.serviceId}>{editDraft.serviceName}</option>
                  {services
                    .filter((service) => service.id !== editDraft.serviceId)
                    .map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - {service.duration} min - EUR {service.price}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm text-[#4b5563]">
                Kuupaev
                <input type="date" value={editDraft.slotDate} onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, slotDate: event.target.value } : prev))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-[#4b5563]">
                Kellaaeg
                <input type="time" step={1800} value={editDraft.slotTime} onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, slotTime: event.target.value } : prev))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-[#4b5563]">
                Staatus
                <select value={editDraft.status} onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, status: event.target.value as Booking['status'] } : prev))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm">
                  <option value="confirmed">Kinnitatud</option>
                  <option value="pending_payment">Makse ootel</option>
                  <option value="completed">Lopetatud</option>
                  <option value="cancelled">Tuhistatud</option>
                </select>
              </label>
              <label className="text-sm text-[#4b5563]">
                Makse
                <select value={editDraft.paymentStatus} onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, paymentStatus: event.target.value as Booking['paymentStatus'] } : prev))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm">
                  <option value="unpaid">Tasumata</option>
                  <option value="pending">Makse ootel</option>
                  <option value="paid">Makstud</option>
                  <option value="failed">Makse ebaonnestus</option>
                </select>
              </label>
              <label className="text-sm text-[#4b5563]">
                Hind (EUR)
                <input type="number" min={0} value={editDraft.servicePrice} onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, servicePrice: Number(event.target.value || 0) } : prev))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-[#4b5563]">
                Kestus (min)
                <input type="number" min={15} step={15} value={editDraft.serviceDuration} onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, serviceDuration: Number(event.target.value || 15) } : prev))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
              </label>
            </div>

            <label className="mt-3 block text-sm text-[#4b5563]">
              Kliendi marke
              <textarea value={editDraft.contactNotes} onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, contactNotes: event.target.value } : prev))} className="mt-1 min-h-24 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" placeholder="Naiteks kuju, pikkus, tundlikkus voi eelistused." />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditDraft(null)} className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm text-[#374151]">Loobu</button>
              <button onClick={() => void saveEditDraft()} disabled={savingId === editDraft.id} className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Salvesta muudatused</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
