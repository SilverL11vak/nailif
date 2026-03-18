'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Calendar, Pencil, CheckCircle, XCircle, Plus, Phone } from 'lucide-react';

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
  const router = useRouter();
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
      completed: activeBookings.filter((b) => b.status === 'completed').length,
      todayRevenue: activeBookings
        .filter((b) => b.slotDate === todayIso && (b.status === 'completed' || b.paymentStatus === 'paid'))
        .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0),
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
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminPageHeader
          overline="Nailify Haldus"
          title="Broneeringud"
          subtitle="Haldage tänaseid ja tulevasi broneeringuid"
          backHref="/admin"
          backLabel="Halduspaneel"
          primaryAction={{ label: '+ Uus broneering', onClick: () => router.push('/book') }}
          secondaryLinks={[{ label: 'Vabad ajad', href: '/admin/slots' }]}
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Laen broneeringuid...
          </div>
        )}

        {!loading && (
          <>
            {/* KPI summary row */}
            <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Tänased broneeringud</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{summaryCounts.today}</p>
              </div>
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Tulevased</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{summaryCounts.upcoming}</p>
              </div>
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Lõpetatud</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{summaryCounts.completed}</p>
              </div>
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Tühistatud</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{summaryCounts.cancelled}</p>
              </div>
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Päeva käive</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">€{summaryCounts.todayRevenue}</p>
              </div>
            </section>

            {/* Segmented filter bar */}
            <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white p-1 shadow-sm scrollbar-thin">
                {viewTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setView(tab.key);
                      setSelectedBookingIds(new Set());
                    }}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                      view === tab.key
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`min-w-[1.25rem] rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                      view === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
              {view === 'cancelled' && selectedBookingIds.size > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={bulkRestore}
                    disabled={actionLoading !== null}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {actionLoading === 'bulk-restore' ? 'Taastan...' : `Taasta ${selectedBookingIds.size}`}
                  </button>
                  <button
                    type="button"
                    onClick={bulkDelete}
                    disabled={actionLoading !== null}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                  >
                    {actionLoading === 'bulk-delete' ? 'Kustutan...' : `Kustuta ${selectedBookingIds.size}`}
                  </button>
                </div>
              )}
            </section>

            {/* Empty state */}
            {displayedBookings.length === 0 && (
              <section className="flex flex-col items-center justify-center rounded-2xl border border-[#e5e7eb] bg-white py-16 px-6 shadow-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Calendar className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <p className="mt-4 text-center text-base font-medium text-slate-700">
                  {view === 'today' ? 'Täna pole broneeringuid' : view === 'cancelled' ? 'Tühistatud broneeringuid ei ole' : 'Selles vaates broneeringuid ei ole'}
                </p>
                <p className="mt-1 text-center text-sm text-slate-500">
                  {view === 'today' ? 'Lisa uus broneering või vaata tulevasi.' : 'Muuda filtreid või lisa broneering.'}
                </p>
                {view !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => router.push('/book')}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Loo uus broneering
                  </button>
                )}
              </section>
            )}

            {/* Timeline list + detail panel */}
            {displayedBookings.length > 0 && (
              <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
                {/* Timeline booking cards */}
                <article className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                  {view === 'cancelled' && (
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-800">Tühistatud broneeringud</h2>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={selectedBookingIds.size === displayedBookings.length && displayedBookings.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-[#e5e7eb] text-slate-900"
                        />
                        <span>Vali kõik</span>
                      </label>
                    </div>
                  )}
                  <div className="space-y-3">
                    {displayedBookings.map((booking, idx) => {
                      const isSelected = selectedBookingIds.has(booking.id);
                      const prev = displayedBookings[idx - 1];
                      const showTimeDivider = !prev || prev.slotTime.slice(0, 2) !== booking.slotTime.slice(0, 2);
                      return (
                        <div key={booking.id}>
                          {showTimeDivider && view !== 'cancelled' && (
                            <div className="flex items-center gap-3 py-2">
                              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                {booking.slotTime.slice(0, 5)}
                              </span>
                              <div className="h-px flex-1 bg-[#e5e7eb]" />
                            </div>
                          )}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleSelection(booking.id)}
                            onKeyDown={(e) => e.key === 'Enter' && toggleSelection(booking.id)}
                            className={`flex cursor-pointer flex-wrap items-center gap-4 rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
                              isSelected
                                ? 'border-slate-900 bg-slate-50 shadow-sm ring-2 ring-slate-900/10'
                                : 'border-[#e5e7eb] bg-white hover:border-slate-200'
                            }`}
                          >
                            <div className="flex shrink-0 flex-col items-center text-center">
                              <span className="text-lg font-semibold tabular-nums text-slate-900">{booking.slotTime.slice(0, 5)}</span>
                              <span className="text-xs text-slate-500">{booking.serviceDuration} min</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900">
                                {booking.contactFirstName} {booking.contactLastName ?? ''}
                              </p>
                              <p className="text-sm text-slate-600">{booking.serviceName}</p>
                              {booking.addOns && booking.addOns.length > 0 && (
                                <p className="mt-0.5 text-xs text-slate-500">
                                  + {booking.addOns.map((a) => a.name).join(', ')}
                                </p>
                              )}
                              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                <Phone className="h-3.5 w-3.5" />
                                {booking.contactPhone}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusUi(booking.status)}`}>
                                  {statusLabel(booking.status)}
                                </span>
                                <span className="rounded-full border border-[#e5e7eb] bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                  {paymentLabel(booking.paymentStatus)}
                                </span>
                              </div>
                              {view !== 'cancelled' ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); openEdit(booking); }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Muuda
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); void patchBooking(booking.id, { status: 'completed', paymentStatus: 'paid' }); }}
                                    disabled={savingId === booking.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Lõpeta
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); void patchBooking(booking.id, { status: 'cancelled' }); }}
                                    disabled={savingId === booking.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Tühista
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); void patchBooking(booking.id, { status: 'confirmed' }); }}
                                    disabled={savingId === booking.id}
                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                  >
                                    Taasta
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Kustuta broneering lõplikult?')) void deleteBooking(booking.id);
                                    }}
                                    disabled={actionLoading === booking.id}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
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

                {/* Detail panel (right side / slide-over on mobile) */}
                {selectedBooking && view !== 'cancelled' && (
                  <>
                    <div className="fixed inset-0 z-40 bg-slate-900/20 xl:hidden" aria-hidden onClick={() => setSelectedBookingIds(new Set())} />
                    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col rounded-l-2xl border border-[#e5e7eb] border-r-0 bg-white shadow-xl xl:static xl:inset-auto xl:max-w-none xl:rounded-2xl xl:border-r xl:shadow-sm xl:sticky xl:top-6 xl:h-fit xl:self-start">
                      <button type="button" onClick={() => setSelectedBookingIds(new Set())} className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 xl:hidden" aria-label="Sulge">
                        <XCircle className="h-5 w-5" />
                      </button>
                    <div className="flex flex-col max-h-[calc(100vh-8rem)] xl:max-h-[calc(100vh-10rem)]">
                      <div className="overflow-y-auto p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Broneeringu detailid</p>
                            <h2 className="mt-1 text-xl font-semibold text-slate-900">
                              {selectedBooking.contactFirstName} {selectedBooking.contactLastName ?? ''}
                            </h2>
                          </div>
                          <div className="flex gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusUi(selectedBooking.status)}`}>
                              {statusLabel(selectedBooking.status)}
                            </span>
                            <span className="rounded-full border border-[#e5e7eb] bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                              {paymentLabel(selectedBooking.paymentStatus)}
                            </span>
                          </div>
                        </div>

                        <section className="mt-5 rounded-xl border border-[#e5e7eb] bg-slate-50/50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Kliendile</p>
                          <p className="mt-1 font-medium text-slate-900">
                            {selectedBooking.contactFirstName} {selectedBooking.contactLastName ?? ''}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                            <Phone className="h-4 w-4 shrink-0" />
                            {selectedBooking.contactPhone}
                          </p>
                        </section>

                        <section className="mt-4 rounded-xl border border-[#e5e7eb] bg-slate-50/50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Aeg ja teenus</p>
                          <p className="mt-1 text-sm text-slate-800">{formatDate(selectedBooking.slotDate)} kell {selectedBooking.slotTime}</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{selectedBooking.serviceName}</p>
                          <p className="text-sm text-slate-500">{selectedBooking.serviceDuration} min</p>
                        </section>

                        <section className="mt-4 rounded-xl border border-[#e5e7eb] bg-slate-50/50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Makse</p>
                          <p className="mt-1 text-sm text-slate-800">Kokku: €{selectedBooking.totalPrice}</p>
                          <p className="text-sm text-slate-600">Ettemaks: €{selectedBooking.depositAmount ?? 0}</p>
                          <p className="mt-1 text-xs text-slate-500">{paymentLabel(selectedBooking.paymentStatus)}</p>
                        </section>

                        {selectedBooking.addOns && selectedBooking.addOns.length > 0 && (
                          <section className="mt-4 rounded-xl border border-[#e5e7eb] bg-slate-50/50 p-4">
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Lisateenused</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {selectedBooking.addOns.map((addOn, index) => (
                                <span key={`${selectedBooking.id}-addon-${addOn.id ?? index}`} className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                                  {addOn.name} (+€{addOn.price}{addOn.duration ? `, ${addOn.duration} min` : ''})
                                </span>
                              ))}
                            </div>
                          </section>
                        )}

                        {(selectedBooking.contactNotes || selectedBooking.inspirationNote) && (
                          <section className="mt-4 rounded-xl border border-[#e5e7eb] bg-slate-50/50 p-4">
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Märkused</p>
                            {selectedBooking.contactNotes && <p className="mt-2 text-sm text-slate-700">{selectedBooking.contactNotes}</p>}
                            {selectedBooking.inspirationNote && <p className="mt-2 text-sm text-slate-600 italic">{selectedBooking.inspirationNote}</p>}
                          </section>
                        )}

                        {(selectedBooking.inspirationImage || selectedBooking.currentNailImage) && (
                          <section className="mt-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Pildid</p>
                            <div className="grid grid-cols-2 gap-3">
                              {selectedBooking.inspirationImage && (
                                <button
                                  type="button"
                                  onClick={() => setFullscreenImage({ src: selectedBooking.inspirationImage!, alt: 'Inspiratsioonifoto' })}
                                  className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#e5e7eb] bg-slate-100 transition hover:border-slate-300"
                                >
                                  <Image src={selectedBooking.inspirationImage!} alt="Inspiratsioonifoto" fill className="object-cover" unoptimized />
                                  <span className="absolute bottom-1 left-1 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">Inspiratsioon</span>
                                </button>
                              )}
                              {selectedBooking.currentNailImage && (
                                <button
                                  type="button"
                                  onClick={() => setFullscreenImage({ src: selectedBooking.currentNailImage!, alt: 'Praeguste küünte foto' })}
                                  className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#e5e7eb] bg-slate-100 transition hover:border-slate-300"
                                >
                                  <Image src={selectedBooking.currentNailImage!} alt="Praeguste küünte foto" fill className="object-cover" unoptimized />
                                  <span className="absolute bottom-1 left-1 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">Praegused küüned</span>
                                </button>
                              )}
                            </div>
                          </section>
                        )}
                      </div>

                      <div className="border-t border-[#e5e7eb] bg-white p-4">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(selectedBooking)}
                            disabled={savingId === selectedBooking.id}
                            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                          >
                            Muuda
                          </button>
                          <button
                            type="button"
                            disabled={savingId === selectedBooking.id}
                            onClick={() => void patchBooking(selectedBooking.id, { status: 'confirmed' })}
                            className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                          >
                            Kinnita
                          </button>
                          <button
                            type="button"
                            disabled={savingId === selectedBooking.id}
                            onClick={() => void patchBooking(selectedBooking.id, { status: 'completed', paymentStatus: 'paid' })}
                            className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                          >
                            Märgi lõpetatuks
                          </button>
                          <button
                            type="button"
                            disabled={savingId === selectedBooking.id}
                            onClick={() => void patchBooking(selectedBooking.id, { status: 'cancelled' })}
                            className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            Tühista
                          </button>
                          <button
                            type="button"
                            disabled={savingId === selectedBooking.id}
                            onClick={() => void patchBooking(selectedBooking.id, { paymentStatus: selectedBooking.paymentStatus === 'paid' ? 'unpaid' : 'paid' })}
                            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            {selectedBooking.paymentStatus === 'paid' ? 'Märgi tasumata' : 'Märgi makstuks'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Kustuta broneering lõplikult?')) void deleteBooking(selectedBooking.id);
                            }}
                            disabled={actionLoading === selectedBooking.id}
                            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                          >
                            Kustuta
                          </button>
                        </div>
                      </div>
                    </div>
                  </aside>
                  </>
                )}

                {view === 'cancelled' && selectedBookingIds.size === 0 && displayedBookings.length > 0 && (
                  <aside className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                    <p className="text-center text-sm text-slate-500">Vali broneering nimekirjast, et taastada või kustutada.</p>
                  </aside>
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

      {fullscreenImage && (
        <FullscreenImageModal
          src={fullscreenImage.src}
          alt={fullscreenImage.alt}
          onClose={() => setFullscreenImage(null)}
        />
      )}
    </main>
  );
}
