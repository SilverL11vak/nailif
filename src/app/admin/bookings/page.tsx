'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Phone,
  Filter,
  LayoutGrid,
  List,
  Move,
  Pencil,
  Plus,
  Search,
  Settings2,
  MessageSquare,
  X,
  XCircle,
} from 'lucide-react';
import type { TimeSlot } from '@/store/booking-types';
import type { BookingPricingSnapshot } from '@/store/booking-types';
import { calculateBookingCheckoutPricingFromBookingRecord } from '@/lib/booking-engine/pricing/calculate-booking-checkout-pricing';

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
  products?: Array<{ productId: string; name: string; unitPrice: number; quantity: number; imageUrl?: string | null }>;
  productsTotalPrice?: number;
  pricingSnapshot?: BookingPricingSnapshot | null;
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

interface PanelDraft {
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

const TIMELINE_START = 8;
const TIMELINE_END = 21;
const TOTAL_MIN = (TIMELINE_END - TIMELINE_START) * 60;

function toMin(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function durMin(b: Booking) {
  return b.totalDuration ?? b.serviceDuration ?? 60;
}

function endTimeLabel(b: Booking) {
  const duration = durMin(b);
  const end = toMin(b.slotTime) + duration;
  const hh = Math.floor(end / 60);
  const mm = end % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function isPrimeTime(time: string) {
  return toMin(time) >= 17 * 60;
}

function overlaps(a: Booking, b: Booking) {
  const as = toMin(a.slotTime);
  const ae = as + durMin(a);
  const bs = toMin(b.slotTime);
  const be = bs + durMin(b);
  return !(ae <= bs || be <= as);
}

function computeTimelineLayout(bookings: Booking[]) {
  const layout = new Map<string, { lane: number; lanes: number }>();
  const visited = new Set<string>();
  for (const start of bookings) {
    if (visited.has(start.id)) continue;
    const group: Booking[] = [];
    const stack = [start];
    visited.add(start.id);
    while (stack.length) {
      const cur = stack.pop()!;
      group.push(cur);
      for (const other of bookings) {
        if (visited.has(other.id)) continue;
        if (overlaps(cur, other)) {
          visited.add(other.id);
          stack.push(other);
        }
      }
    }
    group.sort((a, b) => toMin(a.slotTime) - toMin(b.slotTime));
    const laneEnds: number[] = [];
    for (const b of group) {
      const s = toMin(b.slotTime);
      const e = s + durMin(b);
      let L = 0;
      while (laneEnds[L] !== undefined && laneEnds[L] > s) L++;
      laneEnds[L] = e;
      layout.set(b.id, { lane: L, lanes: Math.max(laneEnds.length, 1) });
    }
    const maxL = Math.max(...group.map((b) => layout.get(b.id)!.lane)) + 1;
    for (const b of group) {
      const cur = layout.get(b.id)!;
      layout.set(b.id, { ...cur, lanes: maxL });
    }
  }
  return layout;
}

function toInputTime(time: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time) ? time : '10:00';
}

function formatDateLong(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function addDays(iso: string, delta: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function weekRangeMonday(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function statusAccent(status: string) {
  if (status === 'confirmed') return 'border-l-[#c24d86] bg-[#fffafc]';
  if (status === 'completed') return 'border-l-[#8b7fd8] bg-[#f8f7ff]';
  if (status === 'cancelled') return 'border-l-[#c4b4b8] bg-[#f7f5f5] opacity-80';
  if (status === 'pending_payment') return 'border-l-[#d4a574] bg-[#fffbf5]';
  return 'border-l-[#c9c2c4] bg-white';
}

function depositLabel(b: Booking) {
  const dep = b.depositAmount ?? 0;
  if (b.paymentStatus === 'paid') return { text: 'Deposit paid', tone: 'text-[#6b9b7a]' };
  if (b.paymentStatus === 'pending') return { text: 'Payment pending', tone: 'text-[#b8860b]' };
  if (dep > 0) return { text: `Deposit €${dep} pending`, tone: 'text-[#b85c8a]' };
  return { text: 'Unpaid', tone: 'text-[#8a7c82]' };
}

function getCheckoutTotals(booking: Booking) {
  return calculateBookingCheckoutPricingFromBookingRecord({
    servicePrice: booking.servicePrice ?? booking.totalPrice,
    totalPrice: booking.totalPrice,
    depositAmount: booking.depositAmount ?? 0,
    productsTotalPrice: booking.productsTotalPrice ?? 0,
    pricingSnapshot: booking.pricingSnapshot ?? null,
  });
}

function FullscreenImageModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image src={src} alt={alt} width={1200} height={900} className="max-h-[85vh] w-auto rounded-lg object-contain" unoptimized />
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [daySlots, setDaySlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [range, setRange] = useState<'day' | 'week'>('day');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paidFilter, setPaidFilter] = useState<string>('all');
  const [specialistFilter, setSpecialistFilter] = useState('all');
  const [panelBooking, setPanelBooking] = useState<Booking | null>(null);
  const [panelDraft, setPanelDraft] = useState<PanelDraft | null>(null);
  const [newSlotContext, setNewSlotContext] = useState<{ date: string; hour: number } | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; alt: string } | null>(null);
  const [panelSaved, setPanelSaved] = useState(false);
  const [quickMenuBookingId, setQuickMenuBookingId] = useState<string | null>(null);
  const [bulkFrom, setBulkFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [bulkTo, setBulkTo] = useState(() => addDays(new Date().toISOString().slice(0, 10), 6));
  const [bulkSpotsLoading, setBulkSpotsLoading] = useState(false);
  const [bulkSpotsMessage, setBulkSpotsMessage] = useState<string | null>(null);
  const longPressRef = useRef<number | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/bookings?limit=250', { cache: 'no-store' });
      if (!response.ok) throw new Error('load failed');
      const data = (await response.json()) as { bookings?: Booking[] };
      setBookings(data.bookings ?? []);
    } catch {
      setError('Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadServices = useCallback(async () => {
    try {
      const response = await fetch('/api/services?admin=1&lang=et', { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { services?: ServiceOption[] };
      if (Array.isArray(data.services)) setServices(data.services);
    } catch {
      setServices([]);
    }
  }, []);

  const loadDaySlots = useCallback(async (date: string) => {
    try {
      const response = await fetch(`/api/slots?date=${date}&admin=1&lang=et`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { slots?: TimeSlot[] };
      setDaySlots(data.slots ?? []);
    } catch {
      setDaySlots([]);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadBookings(), loadServices()]);
  }, [loadBookings, loadServices]);

  useEffect(() => {
    void loadDaySlots(viewDate);
  }, [viewDate, loadDaySlots]);

  useEffect(() => {
    const d = searchParams.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setViewDate(d);
  }, [searchParams]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (specialistFilter === 'sandra') {
        /* single specialist studio — all match */
      }
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (paidFilter === 'paid' && b.paymentStatus !== 'paid') return false;
      if (paidFilter === 'unpaid' && (b.paymentStatus === 'paid' || b.paymentStatus === 'pending')) return false;
      if (paidFilter === 'pending' && b.paymentStatus !== 'pending') return false;
      if (!q) return true;
      const blob = `${b.contactFirstName} ${b.contactLastName ?? ''} ${b.contactPhone} ${b.contactEmail ?? ''} ${b.serviceName}`.toLowerCase();
      return blob.includes(q);
    });
  }, [bookings, search, statusFilter, paidFilter, specialistFilter]);

  const repeatByPhone = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const phone = (b.contactPhone ?? '').trim();
      if (!phone) continue;
      map.set(phone, (map.get(phone) ?? 0) + 1);
    }
    return map;
  }, [bookings]);

  const bookingsForViewDate = useMemo(
    () => filteredBookings.filter((b) => b.slotDate === viewDate).sort((a, b) => a.slotTime.localeCompare(b.slotTime)),
    [filteredBookings, viewDate]
  );

  const weekStart = weekRangeMonday(viewDate);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const stats = useMemo(() => {
    const onDay = filteredBookings.filter((b) => b.slotDate === viewDate);
    const available = daySlots.filter((s) => s.available).length;
    const revenue = onDay
      .filter((b) => b.status !== 'cancelled' && (b.status === 'completed' || b.paymentStatus === 'paid'))
      .reduce((s, b) => s + (Number(b.totalPrice) || 0), 0);
    const pendingDeposits = onDay.filter(
      (b) =>
        b.status !== 'cancelled' &&
        b.status !== 'completed' &&
        (b.paymentStatus === 'unpaid' || b.paymentStatus === 'pending' || b.paymentStatus === 'failed')
    ).length;
    return {
      bookingsCount: onDay.filter((b) => b.status !== 'cancelled').length,
      available,
      revenue,
      pendingDeposits,
    };
  }, [filteredBookings, viewDate, daySlots]);

  const timelineLayout = useMemo(
    () => computeTimelineLayout(bookingsForViewDate.filter((b) => b.status !== 'cancelled')),
    [bookingsForViewDate]
  );

  const patchBooking = async (id: string, payload: Record<string, unknown>) => {
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Update failed');
      }
      const data = (await response.json()) as { booking?: Partial<Booking> };
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...payload, ...data.booking } : b))
      );
      if (panelBooking?.id === id && data.booking) {
        setPanelBooking((p) => (p ? { ...p, ...data.booking } : p));
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const applyMultiDaySpots = async (mode: 'enable' | 'disable') => {
    if (!bulkFrom || !bulkTo) return;
    setError(null);
    setBulkSpotsMessage(null);
    setBulkSpotsLoading(true);
    try {
      const response = await fetch('/api/admin/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode === 'enable' ? 'enable_spots_range' : 'disable_spots_range',
          payload: { from: bulkFrom, to: bulkTo },
        }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Bulk update failed');
      }
      const data = (await response.json()) as { updated?: number };
      setBulkSpotsMessage(
        mode === 'enable'
          ? `Vabastatud ${data.updated ?? 0} aega valitud perioodis.`
          : `Blokeeritud ${data.updated ?? 0} aega valitud perioodis.`
      );
      await loadDaySlots(viewDate);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mitme päeva muudatus ebaõnnestus.');
    } finally {
      setBulkSpotsLoading(false);
    }
  };

  const openPanel = (b: Booking) => {
    setNewSlotContext(null);
    setPanelBooking(b);
    setPanelDraft({
      id: b.id,
      serviceId: b.serviceId,
      serviceName: b.serviceName,
      serviceDuration: b.serviceDuration,
      servicePrice: b.servicePrice ?? b.totalPrice,
      slotDate: b.slotDate,
      slotTime: toInputTime(b.slotTime),
      status: b.status,
      paymentStatus: b.paymentStatus,
      contactNotes: b.contactNotes ?? '',
    });
    setPanelSaved(false);
  };

  const closePanel = () => {
    setPanelBooking(null);
    setPanelDraft(null);
    setNewSlotContext(null);
  };

  const onServiceChange = (serviceId: string) => {
    if (!panelDraft) return;
    const sel = services.find((s) => s.id === serviceId);
    if (!sel) {
      setPanelDraft((p) => (p ? { ...p, serviceId } : p));
      return;
    }
    setPanelDraft((p) =>
      p
        ? {
            ...p,
            serviceId: sel.id,
            serviceName: sel.name,
            serviceDuration: sel.duration,
            servicePrice: sel.price,
          }
        : p
    );
  };

  const savePanel = async () => {
    if (!panelDraft) return;
    const ok = await patchBooking(panelDraft.id, {
      status: panelDraft.status,
      paymentStatus: panelDraft.paymentStatus,
      slotDate: panelDraft.slotDate,
      slotTime: panelDraft.slotTime,
      serviceId: panelDraft.serviceId,
      serviceName: panelDraft.serviceName,
      serviceDuration: panelDraft.serviceDuration,
      servicePrice: panelDraft.servicePrice,
      totalPrice: panelDraft.servicePrice,
      totalDuration: panelDraft.serviceDuration,
      contactNotes: panelDraft.contactNotes,
    });
    if (ok) {
      setPanelSaved(true);
      setTimeout(() => setPanelSaved(false), 2000);
    }
  };

  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = TIMELINE_START; i < TIMELINE_END; i++) h.push(i);
    return h;
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f2ef] text-[#2a2428]">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#e8e2dd] bg-white/90 p-5 shadow-[0_8px_30px_-12px_rgba(42,36,40,0.12)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <Link
              href="/admin"
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ebe4df] bg-[#faf8f6] text-[#7a6d72] transition hover:bg-[#f3eeeb]"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b5a8ad]">Nailify Admin</p>
              <h1 className="font-brand text-2xl font-semibold tracking-tight text-[#2a2228] sm:text-3xl">Bookings</h1>
              <p className="mt-1 text-sm text-[#7a6e74]">{formatDateLong(viewDate)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/book')}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#9c4d72_0%,#c24d86_55%,#a93d71_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(194,77,134,0.45)]"
            >
              <Plus className="h-4 w-4" />
              Uus broneering
            </button>
            <Link
              href="/admin/slots"
              className="inline-flex items-center gap-2 rounded-full border border-[#e5ddd8] bg-white px-4 py-2.5 text-sm font-medium text-[#5c4f55] shadow-sm hover:bg-[#faf8f6]"
            >
              <Settings2 className="h-4 w-4" />
              Halda aegu
            </Link>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-sm ${
                filtersOpen ? 'border-[#c24d86] bg-[#fff5f9] text-[#9d3d6a]' : 'border-[#e5ddd8] bg-white text-[#5c4f55] hover:bg-[#faf8f6]'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <div className="relative flex-1 min-w-[140px] sm:max-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b5a8ad]" />
              <input
                type="search"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-[#e5ddd8] bg-[#faf8f6] py-2.5 pl-10 pr-4 text-sm outline-none ring-[#c24d86]/20 focus:border-[#d4a5bc] focus:ring-2"
              />
            </div>
          </div>
        </header>

        {filtersOpen && (
          <div className="mb-6 flex flex-wrap gap-4 rounded-2xl border border-[#e8e2dd] bg-white p-4 shadow-sm">
            <label className="flex flex-col gap-1 text-xs font-medium text-[#7a6e74]">
              Specialist
              <select
                value={specialistFilter}
                onChange={(e) => setSpecialistFilter(e.target.value)}
                className="rounded-xl border border-[#e5ddd8] bg-[#faf8f6] px-3 py-2 text-sm text-[#2a2428]"
              >
                <option value="all">All</option>
                <option value="sandra">Sandra</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-[#7a6e74]">
              Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-[#e5ddd8] bg-[#faf8f6] px-3 py-2 text-sm text-[#2a2428]"
              >
                <option value="all">All</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending_payment">Pending payment</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-[#7a6e74]">
              Payment
              <select
                value={paidFilter}
                onChange={(e) => setPaidFilter(e.target.value)}
                className="rounded-xl border border-[#e5ddd8] bg-[#faf8f6] px-3 py-2 text-sm text-[#2a2428]"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </label>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-2.5 text-sm text-rose-800">{error}</div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#e8e2dd] bg-white p-12 text-center text-sm text-[#8a7c82]">Loading schedule…</div>
        ) : (
          <>
            {/* Quick stats */}
            <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Bookings (day)', value: stats.bookingsCount, sub: 'On selected date' },
                { label: 'Available slots', value: stats.available, sub: 'Open times today' },
                { label: 'Revenue (day)', value: `€${stats.revenue}`, sub: 'Paid / completed' },
                { label: 'Pending deposits', value: stats.pendingDeposits, sub: 'Awaiting payment' },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-[#ebe6e3] bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(42,36,40,0.08)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a8989e]">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-[#2a2228]">{card.value}</p>
                  <p className="mt-1 text-xs text-[#9a8a94]">{card.sub}</p>
                </div>
              ))}
            </section>

            <section className="mb-6 rounded-2xl border border-[#ebe6e3] bg-white p-4 shadow-[0_4px_20px_-8px_rgba(42,36,40,0.08)]">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a8989e]">Multi-day spots</p>
                  <p className="mt-1 text-sm text-[#7a6e74]">Muuda mitme päeva vabu/blokeeritud aegu korraga. Broneeritud ajad jäävad alles.</p>
                </div>
                <div className="ml-auto flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-[#7a6e74]">
                    From
                    <input
                      type="date"
                      value={bulkFrom}
                      onChange={(e) => setBulkFrom(e.target.value)}
                      className="rounded-xl border border-[#e5ddd8] bg-[#faf8f6] px-3 py-2 text-sm text-[#2a2428]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-[#7a6e74]">
                    To
                    <input
                      type="date"
                      value={bulkTo}
                      onChange={(e) => setBulkTo(e.target.value)}
                      className="rounded-xl border border-[#e5ddd8] bg-[#faf8f6] px-3 py-2 text-sm text-[#2a2428]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void applyMultiDaySpots('enable')}
                    disabled={bulkSpotsLoading}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {bulkSpotsLoading ? '...' : 'Vabasta ajad'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void applyMultiDaySpots('disable')}
                    disabled={bulkSpotsLoading}
                    className="rounded-xl border border-[#e5ddd8] bg-white px-4 py-2 text-sm font-semibold text-[#5c4f55] hover:bg-[#faf8f6] disabled:opacity-50"
                  >
                    {bulkSpotsLoading ? '...' : 'Blokeeri ajad'}
                  </button>
                </div>
              </div>
              {bulkSpotsMessage ? (
                <p className="mt-3 text-sm text-emerald-700">{bulkSpotsMessage}</p>
              ) : null}
            </section>

            {/* Day / week + date nav */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-full border border-[#e5ddd8] bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setRange('day')}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                    range === 'day' ? 'bg-[#2a2228] text-white shadow-sm' : 'text-[#6d6268] hover:bg-[#faf8f6]'
                  }`}
                >
                  <List className="h-4 w-4" />
                  Day
                </button>
                <button
                  type="button"
                  onClick={() => setRange('week')}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                    range === 'week' ? 'bg-[#2a2228] text-white shadow-sm' : 'text-[#6d6268] hover:bg-[#faf8f6]'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Week
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewDate((d) => addDays(d, range === 'week' ? -7 : -1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5ddd8] bg-white text-[#5c4f55] hover:bg-[#faf8f6]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewDate(new Date().toISOString().slice(0, 10))}
                  className="rounded-full border border-[#e8dde2] bg-[#fff8fa] px-4 py-2 text-sm font-medium text-[#8b5c72]"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setViewDate((d) => addDays(d, range === 'week' ? 7 : 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5ddd8] bg-white text-[#5c4f55] hover:bg-[#faf8f6]"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {range === 'week' ? (
              <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                {weekDays.map((day) => {
                  const dayBookings = filteredBookings
                    .filter((b) => b.slotDate === day)
                    .sort((a, b) => a.slotTime.localeCompare(b.slotTime));
                  const isToday = day === new Date().toISOString().slice(0, 10);
                  return (
                    <div
                      key={day}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setViewDate(day);
                        setRange('day');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setViewDate(day);
                          setRange('day');
                        }
                      }}
                      className={`cursor-pointer rounded-2xl border p-3 text-left shadow-sm transition hover:shadow-md ${
                        isToday ? 'border-[#c24d86]/40 bg-[#fffafc]' : 'border-[#ebe6e3] bg-white'
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a8989e]">
                        {new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })}
                      </p>
                      <p className="text-lg font-semibold tabular-nums text-[#2a2228]">
                        {new Date(`${day}T12:00:00`).getDate()}
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {dayBookings.slice(0, 4).map((b) => {
                          const dep = depositLabel(b);
                          return (
                            <div
                              key={b.id}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewDate(day);
                                setRange('day');
                                openPanel(b);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setViewDate(day);
                                  setRange('day');
                                  openPanel(b);
                                }
                              }}
                              className={`rounded-lg border-l-[3px] px-2 py-1.5 text-left text-xs ${statusAccent(b.status)}`}
                            >
                              <p className="truncate font-medium text-[#2a2228]">
                                {b.slotTime.slice(0, 5)} · {b.contactFirstName}
                              </p>
                              <p className="truncate text-[10px] text-[#6d6268]">{b.serviceName}</p>
                              <p className={`text-[10px] ${dep.tone}`}>{dep.text}</p>
                            </div>
                          );
                        })}
                        {dayBookings.length > 4 && (
                          <p className="text-[10px] text-[#b5a8ad]">+{dayBookings.length - 4} more</p>
                        )}
                        {dayBookings.length === 0 && (
                          <p className="py-4 text-center text-[11px] text-[#c4b8bc]">Open day view</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            ) : (
              <section className="relative mb-8 overflow-hidden rounded-2xl border border-[#ebe6e3] bg-white shadow-[0_12px_40px_-20px_rgba(42,36,40,0.1)]">
                <div className="border-b border-[#f0ebe8] bg-[#faf8f6] px-4 py-3 sm:px-6">
                  <h2 className="text-sm font-semibold text-[#2a2228]">Timeline</h2>
                  <p className="text-xs text-[#8a7c82]">{TIMELINE_START}:00 – {TIMELINE_END}:00 · Click a free hour to add a booking</p>
                </div>
                <div className="flex">
                  <div className="w-14 shrink-0 border-r border-[#f0ebe8] bg-[#fcfaf9] sm:w-16">
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="flex h-[52px] items-start justify-end pr-2 pt-1 text-[11px] font-medium tabular-nums text-[#a8989e]"
                      >
                        {String(h).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                  <div className="relative min-h-[676px] flex-1">
                    {hours.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setNewSlotContext({ date: viewDate, hour: h })}
                        className="absolute left-0 right-0 border-b border-[#f5f0ed] transition hover:bg-[#fff5f8]/50"
                        style={{ top: `${((h - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100}%`, height: `${100 / (TIMELINE_END - TIMELINE_START)}%` }}
                      >
                        <span className="sr-only">Book slot {h}:00</span>
                      </button>
                    ))}
                    {bookingsForViewDate
                      .filter((b) => b.status !== 'cancelled')
                      .map((b) => {
                        const start = toMin(b.slotTime) - TIMELINE_START * 60;
                        const duration = durMin(b);
                        if (start < 0 || start >= TOTAL_MIN) return null;
                        const top = (start / TOTAL_MIN) * 100;
                        const height = Math.min((duration / TOTAL_MIN) * 100, 100 - top);
                        const L = timelineLayout.get(b.id) ?? { lane: 0, lanes: 1 };
                        const w = 100 / L.lanes;
                        const left = L.lane * w;
                        const dep = depositLabel(b);
                        const checkout = getCheckoutTotals(b);
                        const repeat = (repeatByPhone.get((b.contactPhone ?? '').trim()) ?? 0) >= 2;
                        const prime = isPrimeTime(b.slotTime);
                        const showMenu = quickMenuBookingId === b.id;
                        return (
                          <div
                            key={b.id}
                            className={`group absolute z-10 cursor-pointer overflow-hidden rounded-xl border border-[#ebe4df] shadow-[0_4px_16px_-6px_rgba(42,36,40,0.12)] transition hover:shadow-lg hover:ring-2 hover:ring-[#c24d86]/25 ${statusAccent(b.status)}`}
                            style={{
                              top: `${top}%`,
                              height: `${Math.max(height, 4)}%`,
                              left: `calc(${left}% + 4px)`,
                              width: `calc(${w}% - 8px)`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openPanel(b);
                            }}
                            onPointerDown={(e) => {
                              // long press to open quick menu on touch
                              if (e.pointerType !== 'touch') return;
                              if (longPressRef.current) window.clearTimeout(longPressRef.current);
                              longPressRef.current = window.setTimeout(() => {
                                setQuickMenuBookingId(b.id);
                              }, 420);
                            }}
                            onPointerUp={() => {
                              if (longPressRef.current) window.clearTimeout(longPressRef.current);
                              longPressRef.current = null;
                            }}
                          >
                            <div className={`flex h-full flex-col p-2 text-left sm:p-2.5 ${prime ? 'bg-[linear-gradient(135deg,rgba(255,245,250,0.95)_0%,rgba(255,252,252,0.7)_55%,rgba(255,248,251,0.9)_100%)]' : ''}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-[#2a2228]">
                                    {b.contactFirstName} {b.contactLastName ?? ''}
                                  </p>
                                  <p className="truncate text-[11px] text-[#6d6268]">{b.serviceName}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#5f4f58]">
                                      {b.slotTime.slice(0, 5)}–{endTimeLabel(b)}
                                    </span>
                                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#2a2228]">
                                      €{Math.round(checkout.payNowTotal || 0)} now
                                    </span>
                                    <span className={`rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold ${dep.tone}`}>
                                      {b.paymentStatus === 'paid' ? 'Deposit paid' : 'Deposit due'}
                                    </span>
                                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[#6d6268]">
                                      {duration}m
                                    </span>
                                    {repeat && (
                                      <span className="rounded-full bg-[#fce8f0] px-2 py-0.5 text-[10px] font-semibold text-[#9d4d6a]">
                                        Repeat
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="relative flex shrink-0 flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={`tel:${encodeURIComponent((b.contactPhone ?? '').trim())}`}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/60 bg-white/70 text-[#6d6268] opacity-0 transition group-hover:opacity-100 hover:text-[#2a2228]"
                                      title="Call"
                                    >
                                      <Phone className="h-3.5 w-3.5" />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => setQuickMenuBookingId((prev) => (prev === b.id ? null : b.id))}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/60 bg-white/70 text-[#6d6268] transition hover:text-[#2a2228]"
                                      aria-label="Quick actions"
                                      title="Quick actions"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </div>

                                  {showMenu && (
                                    <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-2xl border border-[#ecdce6] bg-white shadow-[0_22px_34px_-24px_rgba(57,33,52,0.5)]">
                                      <button
                                        type="button"
                                        onClick={() => { setQuickMenuBookingId(null); openPanel(b); }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#2a2228] hover:bg-[#fff7fb]"
                                      >
                                        <Move className="h-4 w-4 text-[#b85c8a]" /> Reschedule
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void patchBooking(b.id, { paymentStatus: 'paid' })}
                                        disabled={savingId === b.id}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#2a2228] hover:bg-[#fff7fb] disabled:opacity-50"
                                      >
                                        <CheckCircle2 className="h-4 w-4 text-[#6b9b7a]" /> Mark paid
                                      </button>
                                      <a
                                        href={`sms:${encodeURIComponent((b.contactPhone ?? '').trim())}`}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#2a2228] hover:bg-[#fff7fb]"
                                      >
                                        <MessageSquare className="h-4 w-4 text-[#b85c8a]" /> Message client
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => void patchBooking(b.id, { status: 'cancelled' })}
                                        disabled={savingId === b.id}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#a33a3a] hover:bg-rose-50 disabled:opacity-50"
                                      >
                                        <XCircle className="h-4 w-4" /> Block / cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {bookingsForViewDate.filter((b) => b.status === 'cancelled').map((b) => (
                      <div
                        key={`cx-${b.id}`}
                        className="absolute z-[5] cursor-pointer rounded-lg border border-dashed border-[#d4cccc] bg-[#faf8f8]/90 px-2 py-1 text-[10px] text-[#8a7c82] line-through opacity-90"
                        style={{
                          top: `${Math.max(0, ((toMin(b.slotTime) - TIMELINE_START * 60) / TOTAL_MIN) * 100)}%`,
                          left: '8px',
                          right: '8px',
                          minHeight: '28px',
                        }}
                        onClick={() => openPanel(b)}
                      >
                        {b.slotTime.slice(0, 5)} {b.contactFirstName} · cancelled
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Booking cards list (compact backup) */}
            {range === 'day' && bookingsForViewDate.length > 0 && (
              <section className="rounded-2xl border border-[#ebe6e3] bg-white p-4 shadow-sm sm:p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#a8989e]">Day list</h3>
                <div className="space-y-2">
                  {bookingsForViewDate.map((b) => {
                    const dep = depositLabel(b);
                    const checkout = getCheckoutTotals(b);
                    const repeat = (repeatByPhone.get((b.contactPhone ?? '').trim()) ?? 0) >= 2;
                    return (
                      <div
                        key={b.id}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f0ebe8] p-3 ${statusAccent(b.status)}`}
                      >
                        <button type="button" onClick={() => openPanel(b)} className="min-w-0 flex-1 text-left">
                          <p className="font-medium text-[#2a2228]">
                            {b.contactFirstName} {b.contactLastName ?? ''}
                          </p>
                          <p className="text-sm text-[#6d6268]">{b.serviceName}</p>
                          <p className="text-xs text-[#8a7c82]">
                            {b.slotTime.slice(0, 5)}–{endTimeLabel(b)} · {durMin(b)} min ·{' '}
                          <span className="font-semibold tabular-nums text-[#2a2228]">€{Math.round(checkout.payNowTotal || 0)}</span>{' '}
                            · <span className={dep.tone}>{dep.text}</span>
                            {repeat && <span className="ml-2 rounded-full bg-[#fce8f0] px-2 py-0.5 text-[10px] font-semibold text-[#9d4d6a]">Repeat</span>}
                          </p>
                        </button>
                        <div className="flex gap-1">
                          <a
                            href={`tel:${encodeURIComponent((b.contactPhone ?? '').trim())}`}
                            className="rounded-lg p-2 text-[#7a6d72] hover:bg-[#faf8f6]"
                            aria-label="Call client"
                            title="Call"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                          <a
                            href={`sms:${encodeURIComponent((b.contactPhone ?? '').trim())}`}
                            className="rounded-lg p-2 text-[#7a6d72] hover:bg-[#faf8f6]"
                            aria-label="Message client"
                            title="Message"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </a>
                          <button type="button" onClick={() => openPanel(b)} className="rounded-lg p-2 text-[#7a6d72] hover:bg-[#faf8f6]">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void patchBooking(b.id, { status: 'cancelled' })}
                            className="rounded-lg p-2 text-[#b85c6a] hover:bg-rose-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void patchBooking(b.id, { status: 'completed' })}
                            className="rounded-lg p-2 text-[#6b9b7a] hover:bg-emerald-50/80"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Slide-in panel */}
      {(panelBooking && panelDraft) || newSlotContext ? (
        <>
          <div className="fixed inset-0 z-[60] bg-[#2a2228]/20 backdrop-blur-[2px]" aria-hidden onClick={closePanel} />
          <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-[#ebe6e3] bg-[#fffcfc] shadow-[-12px_0_40px_-16px_rgba(42,36,40,0.15)]">
            <div className="flex items-center justify-between border-b border-[#f0ebe8] px-5 py-4">
              <h2 className="font-brand text-lg font-semibold text-[#2a2228]">
                {newSlotContext ? 'Uus broneering' : 'Broneeringu detailid'}
              </h2>
              <button type="button" onClick={closePanel} className="rounded-full p-2 text-[#7a6d72] hover:bg-[#f5f0ed]">
                <X className="h-5 w-5" />
              </button>
            </div>
            {newSlotContext && (
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
                <div className="rounded-xl border border-[#ebe6e3] bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#a8989e]">Suggested slot</p>
                  <p className="mt-2 text-sm text-[#2a2228]">
                    {formatDateLong(newSlotContext.date)} · {String(newSlotContext.hour).padStart(2, '0')}:00
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-[#6d6268]">
                  Open the public booking flow with this date pre-filled. Client completes service selection and contact details.
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/book?date=${newSlotContext.date}`)}
                  className="mt-auto w-full rounded-full bg-[linear-gradient(135deg,#9c4d72_0%,#c24d86_55%,#a93d71_100%)] py-3.5 text-sm font-semibold text-white shadow-lg"
                >
                  Open booking flow
                </button>
                <p className="text-center text-xs text-[#a8989e]">After checkout, the appointment appears here.</p>
              </div>
            )}
            {panelBooking && panelDraft && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#a8989e]">
                    Service
                    <select
                      value={panelDraft.serviceId}
                      onChange={(e) => onServiceChange(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#e5ddd8] bg-white px-3 py-2.5 text-sm"
                    >
                      <option value={panelDraft.serviceId}>{panelDraft.serviceName}</option>
                      {services
                        .filter((s) => s.id !== panelDraft.serviceId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {s.duration} min · €{s.price}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#a8989e]">Specialist</p>
                    <p className="mt-1.5 rounded-xl border border-[#f0ebe8] bg-[#faf8f6] px-3 py-2.5 text-sm text-[#5c4f55]">Sandra</p>
                    <p className="mt-1 text-[11px] text-[#a8989e]">Studio specialist (read-only)</p>
                  </div>
                  {panelBooking.products?.length ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#a8989e]">Retail products</p>
                      <div className="mt-1.5 space-y-1 rounded-xl border border-[#f0ebe8] bg-[#faf8f6] px-3 py-3">
                        {panelBooking.products.map((p) => (
                          <p key={p.productId} className="text-sm text-[#2a2228]">
                            {p.name}
                            {p.quantity > 1 ? ` x ${p.quantity}` : null} · €{Math.round(Number(p.unitPrice) || 0) * p.quantity}
                          </p>
                        ))}
                        <p className="pt-1 text-xs font-semibold text-[#b04b80]">
                          Products total: €{Math.round(Number(panelBooking.productsTotalPrice) || 0)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#a8989e]">Checkout totals</p>
                    <div className="mt-1.5 space-y-1 rounded-xl border border-[#f0ebe8] bg-[#faf8f6] px-3 py-3 text-sm text-[#2a2228]">
                      {(() => {
                        const checkout = getCheckoutTotals(panelBooking);
                        return (
                          <>
                            <p>Service total: €{Math.round(checkout.serviceTotal || 0)}</p>
                            <p>Products total: €{Math.round(checkout.productsTotal || 0)}</p>
                            <p>Deposit applied: €{Math.round(checkout.depositAmount || 0)}</p>
                            <p className="font-semibold text-[#b04b80]">Pay now: €{Math.round(checkout.payNowTotal || 0)}</p>
                            <p>Pay later: €{Math.round(checkout.payLaterTotal || 0)}</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#a8989e]">
                      Date
                      <input
                        type="date"
                        value={panelDraft.slotDate}
                        onChange={(e) => setPanelDraft((p) => (p ? { ...p, slotDate: e.target.value } : p))}
                        className="mt-1.5 w-full rounded-xl border border-[#e5ddd8] bg-white px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#a8989e]">
                      Time
                      <input
                        type="time"
                        step={300}
                        value={panelDraft.slotTime}
                        onChange={(e) => setPanelDraft((p) => (p ? { ...p, slotTime: e.target.value } : p))}
                        className="mt-1.5 w-full rounded-xl border border-[#e5ddd8] bg-white px-3 py-2.5 text-sm"
                      />
                    </label>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#a8989e]">Client</p>
                    <div className="mt-1.5 space-y-1 rounded-xl border border-[#f0ebe8] bg-[#faf8f6] px-3 py-3 text-sm">
                      <p className="font-medium text-[#2a2228]">
                        {panelBooking.contactFirstName} {panelBooking.contactLastName ?? ''}
                      </p>
                      <p className="text-[#6d6268]">{panelBooking.contactPhone}</p>
                      {panelBooking.contactEmail && <p className="text-[#6d6268]">{panelBooking.contactEmail}</p>}
                    </div>
                    <p className="mt-1 text-[11px] text-[#a8989e]">Contact fields are set at booking — not editable here</p>
                  </div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#a8989e]">
                    Payment status
                    <select
                      value={panelDraft.paymentStatus}
                      onChange={(e) =>
                        setPanelDraft((p) => (p ? { ...p, paymentStatus: e.target.value as Booking['paymentStatus'] } : p))
                      }
                      className="mt-1.5 w-full rounded-xl border border-[#e5ddd8] bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                    </select>
                  </label>
                  <p className="text-[11px] text-[#b5a8ad]">
                    Marking paid may require Stripe verification per your payment rules.
                  </p>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#a8989e]">
                    Booking status
                    <select
                      value={panelDraft.status}
                      onChange={(e) => setPanelDraft((p) => (p ? { ...p, status: e.target.value as Booking['status'] } : p))}
                      className="mt-1.5 w-full rounded-xl border border-[#e5ddd8] bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="pending_payment">Pending payment</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#a8989e]">
                    Notes
                    <textarea
                      value={panelDraft.contactNotes}
                      onChange={(e) => setPanelDraft((p) => (p ? { ...p, contactNotes: e.target.value } : p))}
                      rows={4}
                      className="mt-1.5 w-full rounded-xl border border-[#e5ddd8] bg-white px-3 py-2.5 text-sm"
                    />
                  </label>
                  {(panelBooking.inspirationImage || panelBooking.currentNailImage) && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#a8989e]">Photos</p>
                      <div className="grid grid-cols-2 gap-2">
                        {panelBooking.inspirationImage && (
                          <button
                            type="button"
                            onClick={() => setFullscreenImage({ src: panelBooking.inspirationImage!, alt: 'Inspiration' })}
                            className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#ebe6e3]"
                          >
                            <Image src={panelBooking.inspirationImage} alt="" fill className="object-cover" unoptimized />
                          </button>
                        )}
                        {panelBooking.currentNailImage && (
                          <button
                            type="button"
                            onClick={() => setFullscreenImage({ src: panelBooking.currentNailImage!, alt: 'Current' })}
                            className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#ebe6e3]"
                          >
                            <Image src={panelBooking.currentNailImage} alt="" fill className="object-cover" unoptimized />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="border-t border-[#f0ebe8] bg-white p-4 space-y-2">
                  {panelSaved && <p className="text-center text-xs font-medium text-[#6b9b7a]">Saved</p>}
                  <button
                    type="button"
                    onClick={() => void savePanel()}
                    disabled={savingId === panelDraft.id}
                    className="w-full rounded-full bg-[#2a2228] py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {savingId === panelDraft.id ? 'Saving…' : 'Save changes'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void patchBooking(panelDraft.id, { status: 'completed' })}
                      className="flex-1 rounded-xl border border-[#d4e5d9] bg-[#f6faf7] py-2 text-xs font-medium text-[#4a6b56]"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => void patchBooking(panelDraft.id, { status: 'cancelled' })}
                      className="flex-1 rounded-xl border border-[#edd4d8] bg-[#fff8f8] py-2 text-xs font-medium text-[#9d4d5c]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </>
      ) : null}

      {fullscreenImage && (
        <FullscreenImageModal src={fullscreenImage.src} alt={fullscreenImage.alt} onClose={() => setFullscreenImage(null)} />
      )}
    </main>
  );
}
