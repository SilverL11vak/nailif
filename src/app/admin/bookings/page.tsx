'use client';

import Link from 'next/link';
import Image from 'next/image';
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

type ViewTab = 'today' | 'upcoming' | 'all' | 'cancelled';

function FullscreenImageModal({ 
  src, 
  alt, 
  onClose 
}: { 
  src: string; 
  alt: string; 
  onClose: () => void 
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image 
          src={src} 
          alt={alt} 
          width={1200}
          height={900}
          className="max-h-[85vh] w-auto rounded-lg object-contain"
          unoptimized
        />
      </div>
    </div>
  );
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
  if (status === 'completed') return 'Lõpetatud';
  if (status === 'cancelled') return 'Tühistatud';
  if (status === 'pending_payment') return 'Makse ootel';
  return status;
}

function paymentLabel(status: string) {
  if (status === 'paid') return 'Makstud';
  if (status === 'pending') return 'Makse ootel';
  if (status === 'failed') return 'Makse ebaõnnestus';
  return 'Tasumata';
}

function toInputTime(time: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time) ? time : '10:00';
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

export default function AdminBookingsPage() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [view, setView] = useState<ViewTab>('today');
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [urlHandled, setUrlHandled] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; alt: string } | null>(null);

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
    if (viewParam === 'today' || viewParam === 'upcoming' || viewParam === 'all' || viewParam === 'cancelled') {
      setView(viewParam);
    }
    setUrlHandled(true);
  }, [bookings, searchParams, urlHandled]);

  const todayIso = new Date().toISOString().slice(0, 10);
  
  const { activeBookings, cancelledBookings } = useMemo(() => {
    const sorted = [...bookings].sort((a, b) =>
      `${b.slotDate} ${b.slotTime}`.localeCompare(`${a.slotDate} ${a.slotTime}`)
    );
    return {
      activeBookings: sorted.filter(b => b.status !== 'cancelled'),
      cancelledBookings: sorted.filter(b => b.status === 'cancelled'),
    };
  }, [bookings]);

  const filtered = useMemo(() => {
    const sorted = [...activeBookings].sort((a, b) =>
      `${a.slotDate} ${a.slotTime}`.localeCompare(`${b.slotDate} ${b.slotTime}`)
    );
    if (view === 'today') return sorted.filter((booking) => booking.slotDate === todayIso);
    if (view === 'upcoming') return sorted.filter((booking) => booking.slotDate >= todayIso);
    if (view === 'all') return sorted;
    return [];
  }, [activeBookings, todayIso, view]);

  const displayedBookings = view === 'cancelled' ? cancelledBookings : filtered;

  const patchBooking = async (id: string, payload: Record<string, unknown>) => {
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      });
      if (!response.ok) throw new Error('Broneeringu uuendamine ebaõnnestus');
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
      setError('Broneeringu uuendamine ebaõnnestus.');
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const deleteBooking = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const response = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Broneeringu kustutamine ebaõnnestus');
      
      setBookings((prev) => prev.filter((booking) => booking.id !== id));
      setSelectedBookingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return true;
    } catch (deleteError) {
      console.error(deleteError);
      setError('Broneeringu kustutamine ebaõnnestus.');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const bulkRestore = async () => {
    if (selectedBookingIds.size === 0) return;
    setActionLoading('bulk-restore');
    setError(null);
    try {
      const promises = Array.from(selectedBookingIds).map((id) =>
        patchBooking(id, { status: 'confirmed' })
      );
      await Promise.all(promises);
      setSelectedBookingIds(new Set());
    } finally {
      setActionLoading(null);
    }
  };

  const bulkDelete = async () => {
    if (selectedBookingIds.size === 0) return;
    if (!confirm(`Kas kustutada ${selectedBookingIds.size} broneeringu?`)) return;
    setActionLoading('bulk-delete');
    setError(null);
    try {
      const promises = Array.from(selectedBookingIds).map((id) => deleteBooking(id));
      await Promise.all(promises);
      setSelectedBookingIds(new Set());
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedBookingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedBookingIds.size === displayedBookings.length) {
      setSelectedBookingIds(new Set());
    } else {
      setSelectedBookingIds(new Set(displayedBookings.map((b) => b.id)));
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

  const selectedBooking = displayedBookings.find((b) => selectedBookingIds.has(b.id));

  const summaryCounts = useMemo(
    () => ({
      total: activeBookings.length,
      today: activeBookings.filter((b) => b.slotDate === todayIso).length,
      upcoming: activeBookings.filter((b) => b.slotDate >= todayIso).length,
      cancelled: cancelledBookings.length,
    }),
    [activeBookings, cancelledBookings, todayIso]
  );

  const viewTabs: { key: ViewTab; label: string; count: number }[] = [
    { key: 'today', label: 'Tänased', count: summaryCounts.today },
    { key: 'upcoming', label: 'Tulevased', count: summaryCounts.upcoming },
    { key: 'all', label: 'Kõik', count: summaryCounts.total },
    { key: 'cancelled', label: 'Tühistatud', count: summaryCounts.cancelled },
  ];

  return (
    <main className="admin-cockpit-bg min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <header className="admin-cockpit-shell mb-6 rounded-[28px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6b7280]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#111827]">Broneeringud</h1>
              <p className="mt-2 text-sm text-[#4b5563]">Halda broneeringuid ja vaata detaile.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563] hover:bg-[#f9fafb]" href="/admin">
                Halduspaneel
              </Link>
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563] hover:bg-[#f9fafb]" href="/admin/slots">
                Vabad ajad
              </Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl bg-white p-6 text-sm text-[#4b5563]">Laen broneeringuid...</div>
        )}

        {!loading && (
          <>
            <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {viewTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setView(tab.key);
                      setSelectedBookingIds(new Set());
                    }}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      view === tab.key
                        ? 'bg-[#111827] text-white'
                        : 'bg-white text-[#4b5563] border border-[#d1d5db] hover:bg-[#f9fafb]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      view === tab.key ? 'bg-white/20 text-white' : 'bg-[#f3f4f6] text-[#6b7280]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {view === 'cancelled' && selectedBookingIds.size > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={bulkRestore}
                    disabled={actionLoading !== null}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 disabled:opacity-60"
                  >
                    {actionLoading === 'bulk-restore' ? 'Taastan...' : `Taasta ${selectedBookingIds.size}`}
                  </button>
                  <button
                    onClick={bulkDelete}
                    disabled={actionLoading !== null}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-60"
                  >
                    {actionLoading === 'bulk-delete' ? 'Kustutan...' : `Kustuta ${selectedBookingIds.size}`}
                  </button>
                </div>
              )}
            </section>

            {!loading && displayedBookings.length === 0 && (
              <div className="rounded-2xl bg-white p-6 text-sm text-[#4b5563]">
                {view === 'cancelled' ? 'Tühistatud broneeringuid ei ole.' : 'Selles vaates broneeringuid ei ole.'}
              </div>
            )}

            {!loading && displayedBookings.length > 0 && (
              <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
                <article className="admin-panel rounded-3xl p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-[#111827]">
                      {view === 'cancelled' ? 'Tühistatud broneeringud' : 'Broneeringute nimekiri'}
                    </h2>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#6b7280]">
                      <input
                        type="checkbox"
                        checked={selectedBookingIds.size === displayedBookings.length && displayedBookings.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-[#d1d5db] text-[#111827]"
                      />
                      <span>Vali kõik</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    {displayedBookings.map((booking) => {
                      const isSelected = selectedBookingIds.has(booking.id);
                      return (
                        <div
                          key={booking.id}
                          onClick={() => toggleSelection(booking.id)}
                          className={`cursor-pointer rounded-2xl border p-3 transition ${
                            isSelected
                              ? 'border-[#111827] bg-[#f9fafb] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.15)]'
                              : 'border-[#e5e7eb] bg-white hover:bg-[#fbfbfc]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(booking.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 h-4 w-4 flex-shrink-0 rounded border-[#d1d5db] text-[#111827]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-[#111827]">
                                    {booking.contactFirstName} {booking.contactLastName ?? ''}
                                  </p>
                                  <p className="text-xs text-[#4b5563]">
                                    {formatDate(booking.slotDate)} kell {booking.slotTime}
                                  </p>
                                  <p className="mt-1 text-xs text-[#6b7280]">{booking.serviceName}</p>
                                </div>
                                <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusUi(booking.status)}`}>
                                  {statusLabel(booking.status)}
                                </span>
                              </div>
                              {view === 'cancelled' && (
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void patchBooking(booking.id, { status: 'confirmed' });
                                    }}
                                    disabled={savingId === booking.id}
                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 disabled:opacity-60"
                                  >
                                    Taasta
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Kustuta broneering lõplikult?')) {
                                        void deleteBooking(booking.id);
                                      }
                                    }}
                                    disabled={actionLoading === booking.id}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 disabled:opacity-60"
                                  >
                                    Kustuta
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                {selectedBooking && view !== 'cancelled' && (
                  <article className="admin-panel sticky top-6 h-fit rounded-3xl p-5">
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
                        <p>{formatDate(selectedBooking.slotDate)} kell {selectedBooking.slotTime}</p>
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
                            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[#6b7280]">Kliendi märkused</p>
                            <p className="text-sm text-[#374151]">{selectedBooking.contactNotes}</p>
                          </div>
                        )}
                        {selectedBooking.inspirationNote && (
                          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-3">
                            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[#6b7280]">Inspiratsiooni märkus</p>
                            <p className="text-sm text-[#374151]">{selectedBooking.inspirationNote}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {(selectedBooking.inspirationImage || selectedBooking.currentNailImage) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {selectedBooking.inspirationImage && (
                          <button
                            onClick={() => setFullscreenImage({ src: selectedBooking.inspirationImage!, alt: 'Inspiratsioonifoto' })}
                            className="rounded-2xl border border-[#e5e7eb] bg-white p-2 text-left transition hover:border-[#9ca3af]"
                          >
                            <p className="mb-2 text-xs text-[#6b7280]">Inspiratsioonifoto</p>
                            <div className="relative h-32 w-full cursor-zoom-in overflow-hidden rounded-xl">
                              <Image src={selectedBooking.inspirationImage} alt="Inspiratsioonifoto" fill className="object-cover" unoptimized />
                            </div>
                          </button>
                        )}
                        {selectedBooking.currentNailImage && (
                          <button
                            onClick={() => setFullscreenImage({ src: selectedBooking.currentNailImage!, alt: 'Praeguste küünte foto' })}
                            className="rounded-2xl border border-[#e5e7eb] bg-white p-2 text-left transition hover:border-[#9ca3af]"
                          >
                            <p className="mb-2 text-xs text-[#6b7280]">Praeguste küünte foto</p>
                            <div className="relative h-32 w-full cursor-zoom-in overflow-hidden rounded-xl">
                              <Image src={selectedBooking.currentNailImage} alt="Praeguste küünte foto" fill className="object-cover" unoptimized />
                            </div>
                          </button>
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
                      <button
                        disabled={savingId === selectedBooking.id}
                        onClick={() => void patchBooking(selectedBooking.id, { status: 'confirmed' })}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 disabled:opacity-60"
                      >
                        Kinnita
                      </button>
                      <button
                        disabled={savingId === selectedBooking.id}
                        onClick={() => void patchBooking(selectedBooking.id, { status: 'completed', paymentStatus: 'paid' })}
                        className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 disabled:opacity-60"
                      >
                        Märgi lõpetatuks
                      </button>
                      <button
                        disabled={savingId === selectedBooking.id}
                        onClick={() => void patchBooking(selectedBooking.id, { status: 'cancelled' })}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-60"
                      >
                        Tühistatud
                      </button>
                      <button
                        disabled={savingId === selectedBooking.id}
                        onClick={() => void patchBooking(selectedBooking.id, { paymentStatus: selectedBooking.paymentStatus === 'paid' ? 'unpaid' : 'paid' })}
                        className="rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-sm font-medium text-[#374151] disabled:opacity-60"
                      >
                        {selectedBooking.paymentStatus === 'paid' ? 'Märgi tasumata' : 'Märgi makstuks'}
                      </button>
                      <button
                        onClick={() => openEdit(selectedBooking)}
                        className="rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151]"
                      >
                        Muuda
                      </button>
                    </div>
                  </article>
                )}

                {view === 'cancelled' && selectedBookingIds.size === 0 && (
                  <article className="admin-panel sticky top-6 h-fit rounded-3xl p-5">
                    <div className="text-center text-sm text-[#6b7280]">
                      <p>Vali broneering nimekirjast, et näha detaile või taastada/kustutada.</p>
                    </div>
                  </article>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {editDraft && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#d1d5db] bg-white p-6 shadow-[0_30px_52px_-24px_rgba(61,45,55,0.5)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Broneeringu muutmine</p>
                <h2 className="text-xl font-semibold text-[#111827]">Kiirmuutja</h2>
              </div>
              <button onClick={() => setEditDraft(null)} className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#4b5563]">
                Sule
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-[#4b5563]">
                Teenus
                <select
                  value={editDraft.serviceId}
                  onChange={(event) => onServiceChange(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm"
                >
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
                Kuupäev
                <input
                  type="date"
                  value={editDraft.slotDate}
                  onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, slotDate: event.target.value } : prev))}
                  className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-[#4b5563]">
                Kellaaeg
                <input
                  type="time"
                  step={1800}
                  value={editDraft.slotTime}
                  onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, slotTime: event.target.value } : prev))}
                  className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-[#4b5563]">
                Staatus
                <select
                  value={editDraft.status}
                  onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, status: event.target.value as Booking['status'] } : prev))}
                  className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm"
                >
                  <option value="confirmed">Kinnitatud</option>
                  <option value="pending_payment">Makse ootel</option>
                  <option value="completed">Lõpetatud</option>
                  <option value="cancelled">Tühistatud</option>
                </select>
              </label>
              <label className="text-sm text-[#4b5563]">
                Makse
                <select
                  value={editDraft.paymentStatus}
                  onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, paymentStatus: event.target.value as Booking['paymentStatus'] } : prev))}
                  className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm"
                >
                  <option value="unpaid">Tasumata</option>
                  <option value="pending">Makse ootel</option>
                  <option value="paid">Makstud</option>
                  <option value="failed">Makse ebaõnnestus</option>
                </select>
              </label>
              <label className="text-sm text-[#4b5563]">
                Hind (EUR)
                <input
                  type="number"
                  min={0}
                  value={editDraft.servicePrice}
                  onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, servicePrice: Number(event.target.value || 0) } : prev))}
                  className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-[#4b5563]">
                Kestus (min)
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={editDraft.serviceDuration}
                  onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, serviceDuration: Number(event.target.value || 15) } : prev))}
                  className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="mt-3 block text-sm text-[#4b5563]">
              Kliendi märkmed
              <textarea
                value={editDraft.contactNotes}
                onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, contactNotes: event.target.value } : prev))}
                className="mt-1 min-h-24 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm"
                placeholder="Näiteks kuju, pikkus, tundlikkus või eelistused."
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditDraft(null)}
                className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm text-[#374151]"
              >
                Loobu
              </button>
              <button
                onClick={() => void saveEditDraft()}
                disabled={savingId === editDraft.id}
                className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Salvesta muudatused
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
