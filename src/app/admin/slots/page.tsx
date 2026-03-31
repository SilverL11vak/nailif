'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { TimeSlot } from '@/store/booking-types';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Plus,
  Settings2,
  ShieldOff,
  Trash2,
} from 'lucide-react';

type UndoAction = {
  type: 'block' | 'unblock' | 'sos';
  times: string[];
  previousStates: Record<string, { available: boolean; isSos?: boolean; sosSurcharge?: number | null; sosLabel?: string | null }>;
};

const WORK_HOURS_STORAGE_KEY_START = 'nailify_slots_workStart';
const WORK_HOURS_STORAGE_KEY_END = 'nailify_slots_workEnd';

type BookingCell = {
  slotDate: string;
  slotTime: string;
  status: string;
  serviceName: string;
  clientName: string;
};

type SlotWithStatus = TimeSlot & { status?: string };

type SlotState = 'free' | 'blocked' | 'booked' | 'sos';

const sosLabels = ['Kiire aeg', 'Täna saadaval', 'Viimane aeg'];

const TIME_OPTIONS = (() => {
  const list: string[] = [];
  for (let hour = 8; hour <= 20; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 20 && minute === 30) break;
      list.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return list;
})();

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildTimeGrid() {
  const list: string[] = [];
  for (let hour = 8; hour <= 19; hour += 1) {
    for (const minute of [0, 30]) {
      list.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return list;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getTimesInRange(start: string, end: string, stepMinutes = 30): string[] {
  const startM = timeToMinutes(start);
  let endM = timeToMinutes(end);
  if (endM <= startM) endM = startM + 12 * 60;
  const list: string[] = [];
  for (let m = startM; m < endM; m += stepMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    list.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return list;
}

function buildDays(from: Date, count: number) {
  return Array.from({ length: count }).map((_, i) => {
    const date = new Date(from);
    date.setDate(from.getDate() + i);
    const iso = toIsoDate(date);
    return {
      iso,
      label: date.toLocaleDateString('et-EE', { weekday: 'short' }),
      day: date.getDate(),
      month: date.toLocaleDateString('et-EE', { month: 'short' }),
      isToday: i === 0,
    };
  });
}

const timeGrid = buildTimeGrid();

export default function AdminSlotsPage() {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(toIsoDate(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<BookingCell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sosEnabled, setSosEnabled] = useState(false);
  const [sosSurcharge, setSosSurcharge] = useState('0');
  const [sosLabel, setSosLabel] = useState(sosLabels[0]);
  const [workStart, setWorkStart] = useState(() => {
    if (typeof window === 'undefined') return '09:00';
    return window.localStorage.getItem(WORK_HOURS_STORAGE_KEY_START) || '09:00';
  });
  const [workEnd, setWorkEnd] = useState(() => {
    if (typeof window === 'undefined') return '18:00';
    return window.localStorage.getItem(WORK_HOURS_STORAGE_KEY_END) || '18:00';
  });
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkStart, setBulkStart] = useState('09:00');
  const [bulkEnd, setBulkEnd] = useState('18:00');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastUndoAction, setToastUndoAction] = useState<UndoAction | null>(null);
  const [dayTransitioning, setDayTransitioning] = useState(false);
  const [generatorFeedback, setGeneratorFeedback] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generatorFeedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const days = useMemo(() => buildDays(weekStart, 21), [weekStart]);

  const workingHoursTimes = useMemo(
    () => getTimesInRange(workStart, workEnd).filter((t) => timeGrid.includes(t)),
    [workStart, workEnd]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(WORK_HOURS_STORAGE_KEY_START, workStart);
      window.localStorage.setItem(WORK_HOURS_STORAGE_KEY_END, workEnd);
    } catch {}
  }, [workStart, workEnd]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    const timeParam = params.get('time');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) setSelectedDate(dateParam);
    if (timeParam && /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeParam)) setSelectedTime(timeParam);
  }, []);

  useEffect(() => {
    setSelectedTime(null);
    setDayTransitioning(true);
    const t = setTimeout(() => setDayTransitioning(false), 140);
    return () => clearTimeout(t);
  }, [selectedDate]);

  useEffect(() => {
    return () => {
      if (generatorFeedbackRef.current) clearTimeout(generatorFeedbackRef.current);
    };
  }, []);

  const showToast = useCallback((message: string, undo?: UndoAction) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    setToastUndoAction(undo ?? null);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      setToastUndoAction(null);
      toastTimerRef.current = null;
    }, 4000);
  }, []);

  const loadSlots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fromDate = new Date();
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + 45);
      const from = toIsoDate(fromDate);
      const to = toIsoDate(toDate);
      const [slotsRes, bookingsRes] = await Promise.all([
        fetch(`/api/slots?admin=1&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: 'no-store' }),
        // Compact mode: admin slots UI uses it only for booking details (client name / service name).
        fetch('/api/bookings?limit=500&compact=1', { cache: 'no-store' }),
      ]);

      if (!slotsRes.ok) throw new Error('Aegade laadimine ebaonnestus');
      if (!bookingsRes.ok) throw new Error('Broneeringute laadimine ebaonnestus');

      const slotsData = (await slotsRes.json()) as { slots?: TimeSlot[] };
      const bookingsData = (await bookingsRes.json()) as {
        bookings?: Array<{
          slotDate: string;
          slotTime: string;
          status: string;
          serviceName: string;
          contactFirstName: string;
          contactLastName: string | null;
        }>;
      };

      setSlots(slotsData.slots ?? []);
      setBookings(
        (bookingsData.bookings ?? [])
          .filter((b) => b.status !== 'cancelled')
          .map((b) => ({
            slotDate: b.slotDate,
            slotTime: b.slotTime,
            status: b.status,
            serviceName: b.serviceName,
            clientName: `${b.contactFirstName} ${b.contactLastName ?? ''}`.trim(),
          }))
      );
    } catch (e) {
      console.error(e);
      setError('Aegade laadimine ebaonnestus.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const selectedDaySlots = useMemo(
    () => slots.filter((s) => s.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
    [slots, selectedDate]
  );
  const slotMap = useMemo(() => {
    const m = new Map<string, TimeSlot>();
    selectedDaySlots.forEach((s) => m.set(s.time, s));
    return m;
  }, [selectedDaySlots]);

  // Booking detail lookup for booked slots (client name/service).
  // Slot availability state comes from API-provided `slot.status`, not this overlay map.
  const bookedMap = useMemo(() => {
    const m = new Map<string, BookingCell>();
    bookings
      .filter((b) => b.slotDate === selectedDate)
      .forEach((b) => m.set(b.slotTime, b));
    return m;
  }, [bookings, selectedDate]);

  const slotState = useCallback(
    (time: string): SlotState => {
      const slot = slotMap.get(time) as SlotWithStatus | undefined;
      const status = slot?.status;
      if (status === 'booked') return 'booked';
      if (status === 'sos') return 'sos';
      if (status === 'free') return 'free';
      if (status === 'blocked') return 'blocked';
      // Back-compat fallback (shouldn't be needed once API always returns `status`).
      if (slot?.available && slot.isSos) return 'sos';
      if (slot?.available) return 'free';
      return 'blocked';
    },
    [slotMap]
  );

  const dayAvailability = useMemo(() => {
    const map = new Map<string, { free: number; booked: number; sos: number; blocked: number }>();
    days.forEach((d) => {
      const daySlots = slots.filter((s) => s.date === d.iso);
      const free = daySlots.filter((s) => (s as SlotWithStatus).status === 'free').length;
      const booked = daySlots.filter((s) => (s as SlotWithStatus).status === 'booked').length;
      const sos = daySlots.filter((s) => (s as SlotWithStatus).status === 'sos').length;
      const blocked = daySlots.filter((s) => (s as SlotWithStatus).status === 'blocked').length;
      map.set(d.iso, { free, booked, sos, blocked });
    });
    return map;
  }, [days, slots]);

  useEffect(() => {
    if (!selectedTime) {
      setSosEnabled(false);
      setSosSurcharge('0');
      setSosLabel(sosLabels[0]);
      return;
    }
    const existing = slotMap.get(selectedTime);
    setSosEnabled(Boolean(existing?.isSos));
    setSosSurcharge(existing?.sosSurcharge ? String(existing.sosSurcharge) : '0');
    setSosLabel(existing?.sosLabel || sosLabels[0]);
  }, [selectedTime, slotMap]);

  const upsertSlot = useCallback(
    async (date: string, time: string, available: boolean, extras?: Partial<TimeSlot>) => {
      const existing = slots.find((s) => s.date === date && s.time === time);
      if (existing) {
        await fetch('/api/slots', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existing.id,
            available,
            count: available ? Math.max(existing.count ?? 1, 1) : 0,
            isSos: available ? extras?.isSos ?? existing.isSos ?? false : false,
            sosSurcharge: available ? extras?.sosSurcharge ?? existing.sosSurcharge ?? null : null,
            sosLabel: available ? extras?.sosLabel ?? existing.sosLabel ?? null : null,
          }),
        });
        return;
      }
      await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time,
          available,
          count: available ? 1 : 0,
          isSos: extras?.isSos ?? false,
          sosSurcharge: extras?.sosSurcharge ?? null,
          sosLabel: extras?.sosLabel ?? null,
        }),
      });
    },
    [slots]
  );

  const getSlotPreviousState = useCallback(
    (time: string) => {
      const slot = slotMap.get(time);
      return {
        available: slot?.available ?? false,
        isSos: slot?.isSos ?? false,
        sosSurcharge: slot?.sosSurcharge ?? null,
        sosLabel: slot?.sosLabel ?? null,
      };
    },
    [slotMap]
  );

  const setSlotStatus = useCallback(
    async (time: string, available: boolean, sosExtras?: { isSos: boolean; sosSurcharge?: number; sosLabel?: string }) => {
      if (slotState(time) === 'booked') return;
      const prev = getSlotPreviousState(time);
      setIsSaving(true);
      setError(null);
      try {
        await upsertSlot(selectedDate, time, available, sosExtras);
        await loadSlots();
        showToast(available ? 'Aeg vabastatud' : 'Aeg blokeeritud', {
          type: available ? 'unblock' : 'block',
          times: [time],
          previousStates: { [time]: prev },
        });
      } catch (err) {
        console.error(err);
        setError('Aja muutmine ebaonnestus.');
      } finally {
        setIsSaving(false);
      }
    },
    [slotState, getSlotPreviousState, selectedDate, loadSlots, showToast, upsertSlot]
  );

  const applyPresetDay = async (makeAvailable: boolean) => {
    setIsSaving(true);
    setError(null);
    setGeneratorFeedback(null);
    if (generatorFeedbackRef.current) clearTimeout(generatorFeedbackRef.current);
    try {
      const toApply = workingHoursTimes.filter((time) => slotState(time) !== 'booked');
      await Promise.all(
        toApply.map(async (time) => upsertSlot(selectedDate, time, makeAvailable))
      );
      await loadSlots();
      if (makeAvailable && toApply.length > 0) {
        setGeneratorFeedback(`${toApply.length} aega genereeritud`);
        generatorFeedbackRef.current = setTimeout(() => {
          setGeneratorFeedback(null);
          generatorFeedbackRef.current = null;
        }, 3200);
      }
    } catch (e) {
      console.error(e);
      setError('Päeva malli rakendamine ebaõnnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const blockAllDay = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all(
        timeGrid.map(async (time) => {
          if (slotState(time) === 'booked') return;
          await upsertSlot(selectedDate, time, false);
        })
      );
      await loadSlots();
    } catch (err) {
      console.error(err);
      setError('Kõigi aegade blokeerimine ebaõnnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const unblockAllDay = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all(
        timeGrid.map(async (time) => {
          if (slotState(time) === 'booked') return;
          await upsertSlot(selectedDate, time, true);
        })
      );
      await loadSlots();
    } catch (err) {
      console.error(err);
      setError('Kõigi aegade vabastamine ebaõnnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const bulkAddSlots = async () => {
    const times = getTimesInRange(bulkStart, bulkEnd).filter((t) => timeGrid.includes(t));
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all(
        times.map(async (time) => {
          if (slotState(time) === 'booked') return;
          await upsertSlot(selectedDate, time, true);
        })
      );
      await loadSlots();
      setBulkModalOpen(false);
    } catch (err) {
      console.error(err);
      setError('Aegade lisamine ebaonnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveSos = async () => {
    if (!selectedTime || slotState(selectedTime) === 'booked') return;
    setIsSaving(true);
    setError(null);
    try {
      const parsed = Number(sosSurcharge);
      const safe = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
      await upsertSlot(selectedDate, selectedTime, true, {
        isSos: sosEnabled,
        sosSurcharge: sosEnabled ? safe : undefined,
        sosLabel: sosEnabled ? sosLabel : undefined,
      });
      await loadSlots();
      showToast('SOS salvestatud');
    } catch (e) {
      console.error(e);
      setError('SOS seadete salvestamine ebaonnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const performUndo = useCallback(
    async (action: UndoAction) => {
      setIsSaving(true);
      setError(null);
      try {
        await Promise.all(
          action.times.map((time) =>
            upsertSlot(selectedDate, time, action.previousStates[time]?.available ?? true, {
              isSos: action.previousStates[time]?.isSos,
              sosSurcharge: action.previousStates[time]?.sosSurcharge ?? undefined,
              sosLabel: action.previousStates[time]?.sosLabel ?? undefined,
            })
          )
        );
        await loadSlots();
        showToast('Toiming tühistatud');
      } catch (err) {
        console.error(err);
        setError('Tühistamine ebaõnnestus.');
      } finally {
        setIsSaving(false);
      }
      setToastUndoAction(null);
      setToastMessage(null);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    },
    [selectedDate, loadSlots, showToast, upsertSlot]
  );

  const selectedBooking = selectedTime ? bookedMap.get(selectedTime) : undefined;
  const stats = useMemo(() => {
    const daySlots = slots.filter((s) => s.date === selectedDate);
    const free = daySlots.filter((s) => s.available && !s.isSos).length;
    const sos = daySlots.filter((s) => s.available && s.isSos).length;
    const booked = daySlots.filter((s) => (s as SlotWithStatus).status === 'booked').length;
    const blocked = daySlots.filter((s) => !s.available).length;
    return { total: daySlots.length, free, sos, booked, blocked };
  }, [slots, selectedDate]);

  const selectedDayLabel = useMemo(() => {
    const d = days.find((x) => x.iso === selectedDate);
    return d ? `${d.label}, ${d.day}. ${d.month}` : selectedDate;
  }, [days, selectedDate]);

  const stateLabel = (s: SlotState) => ({ booked: 'Broneeritud', sos: 'SOS', free: 'Vaba', blocked: 'Blokeeritud' }[s]);

  const goPrevWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() - 7);
    setWeekStart(next);
  };
  const goNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const handleSlotToggle = useCallback(
    (time: string) => {
      const state = slotState(time);
      if (state === 'booked') return;
      const makeAvailable = state === 'blocked';
      void setSlotStatus(time, makeAvailable);
    },
    [setSlotStatus, slotState]
  );

  const handleSlotDetails = useCallback(
    (time: string) => {
      setSelectedTime(time);
    },
    []
  );

  const handleDeleteSlot = useCallback(() => {
    if (!selectedTime || slotState(selectedTime) === 'booked') return;
    void setSlotStatus(selectedTime, false);
    setSelectedTime(null);
  }, [selectedTime, slotState, setSlotStatus]);

  const selectedSlotState = selectedTime ? slotState(selectedTime) : null;
  const selectedSlot = selectedTime ? slotMap.get(selectedTime) : undefined;

  return (
    <main>
      <div className="admin-v2-section-gap">
        <header className="admin-v2-surface overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-[#ead8e3] via-[#f2e8ee] to-transparent" aria-hidden />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-[#2a2228] md:text-3xl">Vabad ajad</h1>
              <p className="text-sm text-[#756574]">Halda oma päev kiiresti ja lihtsalt</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin" className="admin-v2-btn-secondary px-4 py-2 text-sm">
                <ChevronLeft className="h-4 w-4" />
                Tagasi
              </Link>
              <Link href="/admin/bookings" className="admin-v2-btn-ghost px-4 py-2 text-sm">
                Broneeringud
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/85 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="admin-v2-surface p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#3c3039]">{selectedDayLabel}</p>
            <p className="text-xs text-[#8c7986]">Vali päev</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrevWeek}
              className="admin-v2-btn-secondary h-11 w-11 shrink-0 rounded-full p-0"
              aria-label="Eelmine nädal"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-1 gap-3 overflow-x-auto px-1 py-1 scroll-smooth">
              {days.map((day) => {
                const isSelected = day.iso === selectedDate;
                const av = dayAvailability.get(day.iso);
                const hasFree = (av?.free ?? 0) > 0;
                const hasBooked = (av?.booked ?? 0) > 0;
                const allBlocked = !hasFree && !hasBooked && (av?.blocked ?? 0) > 0;
                return (
                  <button
                    key={day.iso}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day.iso);
                      setSelectedTime(null);
                    }}
                    className={`flex min-w-[92px] shrink-0 flex-col items-center rounded-2xl border px-3 py-3 text-center transition-all duration-200 ${
                      isSelected
                        ? 'scale-[1.03] border-[#c24d86] bg-[#fdf2f8] text-[#5a334a] shadow-[0_12px_25px_-18px_rgba(194,77,134,0.7)]'
                        : 'border-[#ecdfe7] bg-white text-[#5f4d5a] hover:border-[#d9c2d0] hover:bg-[#fff9fc]'
                    } ${day.isToday && !isSelected ? 'ring-2 ring-[#d8bfd0]/70 ring-offset-1' : ''}`}
                  >
                    <span className="text-[11px] font-medium uppercase tracking-[0.2em] opacity-80">{day.label}</span>
                    <span className="mt-1 text-2xl font-semibold leading-none">{day.day}</span>
                    <span className="mt-2 flex h-2.5 items-center gap-1">
                      {hasBooked && <span className="h-2.5 w-2.5 rounded-full bg-rose-400" title="Broneeritud" />}
                      {hasFree && !hasBooked && <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" title="Vaba" />}
                      {allBlocked && <span className="h-2 w-2 rounded-full bg-slate-400" title="Blokeeritud" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={goNextWeek}
              className="admin-v2-btn-secondary h-11 w-11 shrink-0 rounded-full p-0"
              aria-label="Järgmine nädal"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section className="admin-v2-surface p-4 sm:p-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => void applyPresetDay(true)}
              disabled={isSaving}
              className="admin-v2-btn-primary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {isSaving ? 'Töötlen...' : 'Täida päev'}
            </button>
            <button
              type="button"
              onClick={() => void applyPresetDay(false)}
              disabled={isSaving}
              className="admin-v2-btn-primary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Tühjenda päev
            </button>
            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              disabled={isSaving}
              className="admin-v2-btn-primary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Lisa ajad
            </button>
            <button
              type="button"
              onClick={() => void blockAllDay()}
              disabled={isSaving}
              className="admin-v2-btn-secondary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Blokeeri kõik
            </button>
            <button
              type="button"
              onClick={() => void unblockAllDay()}
              disabled={isSaving}
              className="admin-v2-btn-secondary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Vabasta kõik
            </button>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="admin-v2-surface p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-[#2e2530]">Ajad</h2>
                <p className="text-xs text-[#8f7a88]">Klikk: vaba/blokeeritud. Paremklikk: detailid.</p>
              </div>
              <span className="rounded-full border border-[#ebdbe6] bg-white px-3 py-1 text-xs font-medium text-[#735f6d]">
                30 min samm
              </span>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-sm text-slate-500">Laen aegu...</div>
            ) : (
              <div className="relative">
                {dayTransitioning && (
                  <div className="absolute inset-0 z-10 rounded-2xl bg-gradient-to-r from-transparent via-white/60 to-transparent animate-pulse" aria-hidden />
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {timeGrid.map((time) => {
                    const state = slotState(time);
                    const isSelected = selectedTime === time;
                    const booking = bookedMap.get(time);
                    const isBooked = state === 'booked';
                    const slotLabel = state === 'sos' ? 'Vaba (SOS)' : stateLabel(state);
                    const stateStyles = isBooked
                      ? 'border-rose-200 bg-rose-50/80 text-rose-900'
                      : state === 'blocked'
                        ? 'border-slate-200 bg-slate-100/90 text-slate-700 hover:-translate-y-0.5 hover:border-slate-300'
                        : 'border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:-translate-y-0.5 hover:border-emerald-300';

                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => handleSlotToggle(time)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          handleSlotDetails(time);
                        }}
                        disabled={isSaving && !isBooked}
                        className={`flex min-h-[96px] flex-col justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-150 ${
                          stateStyles
                        } ${
                          isSelected ? 'ring-2 ring-[#ad5b84]/35 ring-offset-2 shadow-[0_10px_20px_-14px_rgba(73,50,66,0.55)]' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block text-xl font-semibold leading-none">{time}</span>
                            <span className="mt-1 block text-xs font-medium tracking-wide text-current/80">{slotLabel}</span>
                          </div>
                          {isBooked ? (
                            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                          ) : state === 'blocked' ? (
                            <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                          ) : (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          )}
                        </div>
                        {isBooked && booking && (
                          <span className="mt-1 flex items-center gap-1 text-[11px] text-rose-700/80">
                            <span className="truncate">{booking.clientName}</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-[#f0e4eb] pt-4 text-xs text-[#7f6a78]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Vaba
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Broneeritud
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Blokeeritud
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> SOS (vaba)
                  </span>
                </div>
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <div className="admin-v2-surface-soft p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#967f8c]">Päeva kokkuvõte</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-[#9b8793]">Kokku ajad</p>
                  <p className="mt-1 text-2xl font-semibold text-[#2f2731]">{stats.total}</p>
                </div>
                <div className="rounded-xl bg-emerald-50/90 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-700">Vabad</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-800">{stats.free + stats.sos}</p>
                </div>
                <div className="rounded-xl bg-rose-50/90 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-rose-700">Broneeritud</p>
                  <p className="mt-1 text-2xl font-semibold text-rose-800">{stats.booked}</p>
                </div>
                <div className="rounded-xl bg-slate-100/90 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-slate-600">Blokeeritud</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-700">{stats.blocked}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-[#8f7a88]">SOS aegu: {stats.sos}</p>
            </div>

            <div className="admin-v2-surface-soft p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#967f8c]">
                <Settings2 className="h-3.5 w-3.5" />
                Kiire täitmine
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] text-slate-500">Algus</span>
                  <select
                    value={workStart}
                    onChange={(event) => setWorkStart(event.target.value)}
                    className="admin-v2-select mt-0.5 w-full px-2.5 py-1.5 text-sm"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-500">Lõpp</span>
                  <select
                    value={workEnd}
                    onChange={(event) => setWorkEnd(event.target.value)}
                    className="admin-v2-select mt-0.5 w-full px-2.5 py-1.5 text-sm"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={() => void applyPresetDay(true)}
                disabled={isSaving}
                className="admin-v2-btn-primary mt-3 w-full py-2.5 text-sm disabled:opacity-50"
              >
                Täida automaatselt
              </button>
              {generatorFeedback && (
                <p className="mt-2 text-center text-xs font-medium text-emerald-700">{generatorFeedback}</p>
              )}
            </div>

            <div className="admin-v2-surface-soft p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#967f8c]">Mass actionid</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => void unblockAllDay()}
                  disabled={isSaving}
                  className="admin-v2-btn-secondary w-full justify-center border-emerald-200 bg-emerald-50/80 py-2.5 text-sm text-emerald-800 disabled:opacity-50"
                >
                  Vabasta kõik ajad
                </button>
                <button
                  type="button"
                  onClick={() => void blockAllDay()}
                  disabled={isSaving}
                  className="admin-v2-btn-secondary w-full justify-center py-2.5 text-sm disabled:opacity-50"
                >
                  Blokeeri kõik ajad
                </button>
              </div>
            </div>

            {selectedTime && (
              <div className="admin-v2-surface-soft p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#967f8c]">Valitud aeg</p>
                  <button
                    type="button"
                    onClick={() => setSelectedTime(null)}
                    className="text-xs font-medium text-[#8e7684] hover:text-[#694e60]"
                  >
                    Sulge
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xl font-semibold text-[#2f2731]">{selectedTime}</p>
                    <p className="text-xs text-[#8f7a88]">{selectedDate}</p>
                    {selectedSlotState && (
                      <span className="mt-1 inline-flex rounded-full border border-[#ecdfe7] bg-white px-2.5 py-1 text-xs font-medium text-[#735f6d]">
                        {selectedSlotState === 'sos' ? 'Vaba (SOS)' : stateLabel(selectedSlotState)}
                      </span>
                    )}
                  </div>

                  {selectedBooking ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                      <p className="text-xs font-medium text-rose-800">Broneeritud aeg</p>
                      <p className="font-medium text-[#3b2e38]">{selectedBooking.clientName}</p>
                      <p className="text-xs text-[#755968]">{selectedBooking.serviceName}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void setSlotStatus(selectedTime, true)}
                          disabled={isSaving}
                          className="admin-v2-btn-secondary flex-1 border-emerald-200 bg-emerald-50/80 py-2 text-sm text-emerald-800 disabled:opacity-50"
                        >
                          Vaba
                        </button>
                        <button
                          type="button"
                          onClick={() => void setSlotStatus(selectedTime, false)}
                          disabled={isSaving}
                          className="admin-v2-btn-secondary flex-1 py-2 text-sm disabled:opacity-50"
                        >
                          Blokeeri
                        </button>
                      </div>

                      <div className="border-t border-[#eee2e9] pt-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-[#765f6e]">SOS märgistus</span>
                          <button
                            type="button"
                            onClick={() => setSosEnabled((prev) => !prev)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                              sosEnabled ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {sosEnabled ? 'Sees' : 'Väljas'}
                          </button>
                        </div>
                        {sosEnabled && (
                          <>
                            <label className="block">
                              <span className="text-[11px] text-slate-500">Lisatasu €</span>
                              <input
                                type="number"
                                min={0}
                                value={sosSurcharge}
                                onChange={(event) => setSosSurcharge(event.target.value)}
                                className="admin-v2-input mt-0.5 w-full px-2 py-1.5 text-sm"
                              />
                            </label>
                            <label className="mt-2 block">
                              <span className="text-[11px] text-slate-500">Silt</span>
                              <select
                                value={sosLabel}
                                onChange={(event) => setSosLabel(event.target.value)}
                                className="admin-v2-select mt-0.5 w-full px-2 py-1.5 text-sm"
                              >
                                {sosLabels.map((label) => (
                                  <option key={label} value={label}>{label}</option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              onClick={() => void saveSos()}
                              disabled={isSaving}
                              className="admin-v2-btn-primary mt-2 w-full py-2 text-sm disabled:opacity-50"
                            >
                              Salvesta SOS
                            </button>
                          </>
                        )}
                      </div>

                      {selectedSlot && (
                        <button
                          type="button"
                          onClick={handleDeleteSlot}
                          disabled={isSaving}
                          className="admin-v2-btn-danger w-full py-2 text-sm disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Blokeeri aeg
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Toast + undo */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-[#eadbe4] bg-white/95 px-4 py-3 shadow-[0_20px_35px_-22px_rgba(73,50,66,0.6)] backdrop-blur">
            <span className="text-sm text-slate-700">{toastMessage}</span>
            {toastUndoAction && (
              <button
                type="button"
                onClick={() => void performUndo(toastUndoAction!)}
                disabled={isSaving}
                className="admin-v2-btn-ghost shrink-0 px-2.5 py-1 text-xs disabled:opacity-50"
              >
                Võta tagasi
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk add modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/20" onClick={() => setBulkModalOpen(false)} aria-hidden />
          <div className="admin-v2-surface relative w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold text-slate-800">Lisa ajad</h3>
            <p className="mt-1 text-sm text-slate-500">Vali vahemik. Lisatakse 30 minuti intervalliga.</p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Algus</span>
                <select
                  value={bulkStart}
                  onChange={(e) => setBulkStart(e.target.value)}
                  className="admin-v2-select mt-0.5 w-full px-3 py-2 text-sm"
                >
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Lõpp</span>
                <select
                  value={bulkEnd}
                  onChange={(e) => setBulkEnd(e.target.value)}
                  className="admin-v2-select mt-0.5 w-full px-3 py-2 text-sm"
                >
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="admin-v2-btn-secondary flex-1 py-2 text-sm"
              >
                Tühista
              </button>
              <button
                type="button"
                onClick={() => void bulkAddSlots()}
                disabled={isSaving}
                className="admin-v2-btn-primary flex-1 py-2 text-sm disabled:opacity-50"
              >
                {isSaving ? '...' : 'Lisa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}







