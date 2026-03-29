'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TimeSlot } from '@/store/booking-types';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Plus,
  Settings2,
  ShieldOff,
  Trash2,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Zap,
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
  const [blockAllConfirm, setBlockAllConfirm] = useState(false);
  const [unblockAllConfirm, setUnblockAllConfirm] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkStart, setBulkStart] = useState('09:00');
  const [bulkEnd, setBulkEnd] = useState('18:00');
  const [selectedTimes, setSelectedTimes] = useState<Set<string>>(new Set());
  const [lastShiftTime, setLastShiftTime] = useState<string | null>(null);
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragAnchor, setDragAnchor] = useState<string | null>(null);
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
    setSelectedTimes(new Set());
    setSelectedTime(null);
    setLastShiftTime(null);
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
    setBlockAllConfirm(false);
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
    setUnblockAllConfirm(false);
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

  const bulkApply = useCallback(
    async (
      type: 'block' | 'unblock' | 'sos',
      times: string[]
    ) => {
      const editable = times.filter((t) => slotState(t) !== 'booked');
      if (editable.length === 0) return;
      const previousStates: UndoAction['previousStates'] = {};
      editable.forEach((t) => {
        previousStates[t] = getSlotPreviousState(t);
      });
      setIsSaving(true);
      setError(null);
      try {
        if (type === 'block') {
          await Promise.all(editable.map((t) => upsertSlot(selectedDate, t, false)));
          showToast(`${editable.length} aega blokeeritud`, { type: 'block', times: editable, previousStates });
        } else if (type === 'unblock') {
          await Promise.all(editable.map((t) => upsertSlot(selectedDate, t, true)));
          showToast(`${editable.length} aega vabastatud`, { type: 'unblock', times: editable, previousStates });
        } else {
          await Promise.all(
            editable.map((t) => upsertSlot(selectedDate, t, true, { isSos: true, sosSurcharge: 0, sosLabel: sosLabels[0] }))
          );
          showToast(`${editable.length} aega märgitud SOS-ina`, { type: 'sos', times: editable, previousStates });
        }
        await loadSlots();
        setSelectedTimes(new Set());
        setSelectedTime(null);
      } catch (err) {
        console.error(err);
        setError('Toiming ebaonnestus.');
      } finally {
        setIsSaving(false);
      }
    },
    [selectedDate, slotState, getSlotPreviousState, loadSlots, showToast, upsertSlot]
  );

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

  const timeRange = useCallback((a: string, b: string) => {
    const i = timeGrid.indexOf(a);
    const j = timeGrid.indexOf(b);
    if (i === -1 || j === -1) return [];
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    return timeGrid.slice(lo, hi + 1);
  }, []);

  const handleSlotClick = useCallback(
    (time: string, isShift: boolean) => {
      if (slotState(time) === 'booked') return;
      if (isShift && lastShiftTime !== null) {
        const range = timeRange(lastShiftTime, time);
        setSelectedTimes((prev) => new Set([...prev, ...range]));
        setSelectedTime(time);
      } else {
        setSelectedTime(time);
        setSelectedTimes(new Set([time]));
      }
      setLastShiftTime(time);
    },
    [slotState, lastShiftTime, timeRange]
  );

  const handleSlotMouseDown = useCallback(
    (time: string) => {
      if (slotState(time) === 'booked') return;
      setDragAnchor(time);
      setSelectedTimes(new Set([time]));
      setSelectedTime(time);
      setLastShiftTime(time);
      setIsDragSelecting(true);
    },
    [slotState]
  );

  const handleSlotMouseEnter = useCallback(
    (time: string) => {
      if (!isDragSelecting || !dragAnchor || slotState(time) === 'booked') return;
      const range = timeRange(dragAnchor, time);
      setSelectedTimes((prev) => new Set([...prev, ...range]));
      setSelectedTime(time);
    },
    [isDragSelecting, dragAnchor, slotState, timeRange]
  );

  useEffect(() => {
    if (!isDragSelecting) return;
    const onUp = () => setIsDragSelecting(false);
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [isDragSelecting]);

  const clearSelection = useCallback(() => {
    setSelectedTime(null);
    setSelectedTimes(new Set());
    setLastShiftTime(null);
  }, []);

  const handleDeleteSlot = useCallback(() => {
    if (!selectedTime || slotState(selectedTime) === 'booked') return;
    void setSlotStatus(selectedTime, false);
    clearSelection();
  }, [selectedTime, slotState, clearSelection, setSlotStatus]);

  return (
    <main>
      <div className="admin-v2-section-gap">
        <AdminPageHeader
          overline="Broneerimine"
          title="Vabad ajad"
          subtitle="Vali päev, halda aegu. Täida või tühjenda tööaja järgi, lisa ajad või blokeeri kõik."
          backHref="/admin"
          backLabel="Halduspaneel"
          secondaryLinks={[{ label: 'Broneeringud', href: '/admin/bookings' }]}
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Zone 1: Day / calendar navigation */}
        <section className="admin-v2-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrevWeek}
              className="admin-v2-btn-secondary h-10 w-10 shrink-0 rounded-xl p-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-1 gap-2 overflow-x-auto py-2 scrollbar-thin scroll-smooth sm:justify-center">
              {days.map((day) => {
                const isSelected = day.iso === selectedDate;
                const av = dayAvailability.get(day.iso);
                const hasFree = (av?.free ?? 0) > 0;
                const hasBooked = (av?.booked ?? 0) > 0;
                const bookedHeavy = (av?.booked ?? 0) >= 3;
                const allBlocked = !hasFree && !hasBooked && (av?.blocked ?? 0) > 0;
                return (
                  <button
                    key={day.iso}
                    type="button"
                    onClick={() => { setSelectedDate(day.iso); setSelectedTime(null); }}
                    className={`flex min-w-[64px] flex-col items-center rounded-xl border-2 px-3 py-3 text-center transition-all duration-200 ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-[#e5e7eb] bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    } ${day.isToday && !isSelected ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wide opacity-90">{day.label}</span>
                    <span className="mt-1 text-xl font-semibold">{day.day}</span>
                    <span className="mt-1.5 flex gap-1">
                      {hasBooked && <span className={`h-2 w-2 rounded-full ${bookedHeavy ? 'bg-rose-500' : 'bg-rose-400'}`} title="Broneeritud" />}
                      {hasFree && !hasBooked && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Vaba" />}
                      {allBlocked && <span className="h-2 w-2 rounded-full bg-slate-400" title="Blokeeritud" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={goNextWeek}
              className="admin-v2-btn-secondary h-10 w-10 shrink-0 rounded-xl p-0"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Zone 2: Main slot workspace */}
          <section className="admin-v2-surface p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-800">
                {selectedDayLabel}
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void applyPresetDay(true)}
                  disabled={isSaving}
                  className="admin-v2-btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                >
                  Täida päev
                </button>
                <button
                  type="button"
                  onClick={() => void applyPresetDay(false)}
                  disabled={isSaving}
                  className="admin-v2-btn-ghost px-3 py-2 text-sm disabled:opacity-50"
                >
                  Tühjenda
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(true)}
                  disabled={isSaving}
                  className="admin-v2-btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Lisa ajad
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-sm text-slate-500">Laen aegu...</div>
            ) : (
              <div className="relative">
                {dayTransitioning && (
                  <div className="absolute inset-0 z-10 rounded-xl bg-gradient-to-r from-transparent via-white/60 to-transparent animate-pulse" aria-hidden />
                )}
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                  {timeGrid.map((time) => {
                    const state = slotState(time);
                    const isSelected = selectedTime === time || selectedTimes.has(time);
                    const booking = bookedMap.get(time);
                    const isBooked = state === 'booked';
                    const canToggle = !isBooked && (state === 'free' || state === 'blocked');
                    const isInteractive = !isBooked;
                    const baseCard = 'flex min-h-[86px] flex-col justify-between rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ';
                    const stateStyles = isBooked
                      ? 'cursor-not-allowed border-[#ece5eb] bg-[#f8f5f7]/95 text-slate-500'
                      : state === 'sos'
                        ? 'cursor-pointer border-amber-200/70 bg-amber-50/60 hover:shadow-md hover:border-amber-300'
                        : state === 'free'
                          ? 'cursor-pointer border-[#efe3ea] bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-[#ddc7d4]'
                          : 'cursor-pointer border-[#ece5eb] bg-[#f7f4f6] text-slate-500 hover:bg-[#f2edf1]';
                    const selectedStyles = isSelected
                      ? 'ring-2 ring-[#ad5b84]/40 ring-offset-2 shadow-md bg-[#fff8fb] border-[#ddc7d4]'
                      : '';
                    return (
                      <div
                        key={time}
                        className={`${baseCard} ${stateStyles} ${selectedStyles}`}
                        onMouseDown={() => handleSlotMouseDown(time)}
                        onMouseEnter={() => handleSlotMouseEnter(time)}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <button
                            type="button"
                            onClick={(e) => isInteractive && handleSlotClick(time, e.shiftKey)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className={`block text-base font-semibold ${isBooked ? 'text-slate-500' : 'text-slate-800'}`}>{time}</span>
                            <span className="mt-0.5 block text-xs text-slate-400">{stateLabel(state)}</span>
                          </button>
                          {canToggle && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); void setSlotStatus(time, state === 'blocked'); }}
                              disabled={isSaving}
                              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-[#f2eaf0] hover:text-[#5f4b58] disabled:opacity-50"
                              title={state === 'blocked' ? 'Tee vabaks' : 'Blokeeri'}
                            >
                              {state === 'blocked' ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                        {isBooked && booking && (
                          <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                            <Lock className="h-3 w-3 shrink-0" />
                            <span className="truncate">{booking.clientName}</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Legend: near grid */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[#efe3ea] pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" title="Vaba aeg">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> Vaba
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" title="Blokeeritud">
                    <span className="h-2 w-2 rounded-full bg-slate-400" /> Blokeeritud
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" title="Broneeritud">
                    <span className="h-2 w-2 rounded-full bg-rose-400" /> Broneeritud
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" title="SOS">
                    <span className="h-2 w-2 rounded-full bg-amber-400" /> SOS
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Zone 3: Context panel - contextual inspector */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            {selectedTime && selectedTimes.size <= 1 ? (
              /* Slot selected: inspector mode */
              <>
                <div className="admin-v2-surface-soft p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">Valitud aeg</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xl font-semibold text-slate-800">{selectedTime}</p>
                      <p className="text-xs text-slate-500">{selectedDate}</p>
                      <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {stateLabel(slotState(selectedTime))}
                      </span>
                    </div>
                    {selectedBooking ? (
                      <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3">
                        <p className="text-xs font-medium text-rose-800">Broneeritud</p>
                        <p className="font-medium text-slate-800">{selectedBooking.clientName}</p>
                        <p className="text-xs text-slate-600">{selectedBooking.serviceName}</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void setSlotStatus(selectedTime, true)}
                            disabled={isSaving}
                            className="admin-v2-btn-secondary border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Vaba
                          </button>
                          <button
                            type="button"
                            onClick={() => void setSlotStatus(selectedTime, false)}
                            disabled={isSaving}
                            className="admin-v2-btn-ghost border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                          >
                            Blokeeri
                          </button>
                        </div>
                        <div className="border-t border-[#e5e7eb] pt-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600">SOS</span>
                            <button
                              type="button"
                              onClick={() => setSosEnabled((p) => !p)}
                              className={`rounded-md px-2 py-1 text-xs font-medium transition ${sosEnabled ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}
                            >
                              {sosEnabled ? 'Sisse' : 'Välja'}
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
                                  onChange={(e) => setSosSurcharge(e.target.value)}
                                  className="admin-v2-input mt-0.5 w-20 px-2 py-1 text-sm"
                                />
                              </label>
                              <label className="mt-2 block">
                                <span className="text-[11px] text-slate-500">Silt</span>
                                <select
                                  value={sosLabel}
                                  onChange={(e) => setSosLabel(e.target.value)}
                                  className="admin-v2-select mt-0.5 w-full px-2 py-1 text-sm"
                                >
                                  {sosLabels.map((l) => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </label>
                              <button
                                type="button"
                                onClick={() => void saveSos()}
                                disabled={isSaving}
                                className="admin-v2-btn-primary mt-2 w-full py-1.5 text-sm disabled:opacity-50"
                              >
                                {isSaving ? 'Salvestan...' : 'Salvesta SOS'}
                              </button>
                            </>
                          )}
                        </div>
                        <div className="border-t border-[#e5e7eb] pt-3">
                          <button
                            type="button"
                            onClick={handleDeleteSlot}
                            disabled={isSaving}
                            className="admin-v2-btn-danger w-full py-2 text-sm disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Blokeeri aeg
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* No slot or multi: day summary + working hours + block day */
              <>
                <div className="admin-v2-surface-soft p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">Päeva kokkuvõte</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <div className="flex flex-col items-center rounded-xl bg-slate-50/80 py-2.5">
                      <Calendar className="mb-0.5 h-4 w-4 text-slate-500" />
                      <p className="text-2xl font-semibold tabular-nums text-slate-800">{stats.total}</p>
                    </div>
                    <div className="flex flex-col items-center rounded-xl bg-emerald-50/80 py-2.5">
                      <CheckCircle2 className="mb-0.5 h-4 w-4 text-emerald-600" />
                      <p className="text-2xl font-semibold tabular-nums text-emerald-800">{stats.free}</p>
                    </div>
                    <div className="flex flex-col items-center rounded-xl bg-amber-50/80 py-2.5">
                      <Zap className="mb-0.5 h-4 w-4 text-amber-600" />
                      <p className="text-2xl font-semibold tabular-nums text-amber-800">{stats.sos}</p>
                    </div>
                    <div className="flex flex-col items-center rounded-xl bg-rose-50/80 py-2.5">
                      <UserCheck className="mb-0.5 h-4 w-4 text-rose-600" />
                      <p className="text-2xl font-semibold tabular-nums text-rose-800">{stats.booked}</p>
                    </div>
                    <div className="flex flex-col items-center rounded-xl bg-slate-100/80 py-2.5">
                      <Lock className="mb-0.5 h-4 w-4 text-slate-500" />
                      <p className="text-2xl font-semibold tabular-nums text-slate-700">{stats.blocked}</p>
                    </div>
                  </div>
                  {selectedTimes.size > 1 && (
                    <p className="mt-3 text-center text-sm text-slate-500">{selectedTimes.size} aega valitud · kasuta all olevat riba</p>
                  )}
                </div>

                <div className="admin-v2-surface-soft p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                    <Settings2 className="h-3.5 w-3.5" />
                    Päeva täitmine
                  </p>
                  <p className="mb-3 text-xs text-slate-500">
                    Loo tööpäeva ajad automaatselt valitud vahemiku põhjal.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[11px] text-slate-500">Algus</span>
                      <select
                        value={workStart}
                        onChange={(e) => setWorkStart(e.target.value)}
                        className="admin-v2-select mt-0.5 w-full px-2.5 py-1.5 text-sm"
                      >
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-slate-500">Lõpp</span>
                      <select
                        value={workEnd}
                        onChange={(e) => setWorkEnd(e.target.value)}
                        className="admin-v2-select mt-0.5 w-full px-2.5 py-1.5 text-sm"
                      >
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-slate-50/80 px-3 py-2">
                    <span className="text-xs text-slate-500">
                      <span className="font-medium text-slate-600">{workStart}</span>
                      <span className="mx-1">-</span>
                      <span className="font-medium text-slate-600">{workEnd}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-slate-700">{workingHoursTimes.length}</span>
                  </div>
                  <div className="mt-2 flex gap-0.5 overflow-hidden rounded-md bg-slate-100/80 p-1.5" title={`${workStart} - ${workEnd}`}>
                    {workingHoursTimes.slice(0, 20).map((t, i) => (
                      <span key={t} className="h-1.5 flex-1 min-w-0 rounded-sm bg-emerald-400/70" style={{ opacity: 0.4 + (i / 20) * 0.6 }} />
                    ))}
                    {workingHoursTimes.length > 20 && <span className="text-[9px] text-slate-400 self-center">+{workingHoursTimes.length - 20}</span>}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">30 min · {workingHoursTimes.length} aega</p>
                  <button
                    type="button"
                    onClick={() => void applyPresetDay(true)}
                    disabled={isSaving}
                    className="admin-v2-btn-primary mt-3 w-full py-2.5 text-sm disabled:opacity-50"
                  >
                    {isSaving ? 'Genereerin...' : 'Täida kalender'}
                  </button>
                  {generatorFeedback && (
                    <p className="mt-2 text-center text-xs font-medium text-emerald-600">{generatorFeedback}</p>
                  )}
                </div>

                <div className="admin-v2-surface-soft p-4">
                  {!unblockAllConfirm ? (
                    <button
                      type="button"
                      onClick={() => setUnblockAllConfirm(true)}
                      disabled={isSaving}
                      className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Vabasta kõik ajad
                    </button>
                  ) : (
                    <div className="mb-3 space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5">
                      <p className="text-xs text-emerald-800">Vabastan kõik blokeeritud ja SOS ajad. Broneeritud jäävad.</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void unblockAllDay()}
                          disabled={isSaving}
                          className="flex-1 rounded-lg bg-emerald-700 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-50"
                        >
                          {isSaving ? '...' : 'Jah'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnblockAllConfirm(false)}
                          className="rounded-lg border border-[#e5e7eb] py-2 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Tühista
                        </button>
                      </div>
                    </div>
                  )}

                  {!blockAllConfirm ? (
                    <button
                      type="button"
                      onClick={() => setBlockAllConfirm(true)}
                      disabled={isSaving}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ShieldOff className="h-4 w-4" />
                      Blokeeri kõik ajad
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600">Blokeerin kõik vabad ja SOS. Broneeritud jäävad.</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void blockAllDay()}
                          disabled={isSaving}
                          className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-medium text-white transition hover:bg-slate-900 disabled:opacity-50"
                        >
                          {isSaving ? '...' : 'Jah'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBlockAllConfirm(false)}
                          className="rounded-lg border border-[#e5e7eb] py-2 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Tühista
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        </div>

        {/* Floating bulk action bar */}
        {selectedTimes.size > 1 && (
          <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-2xl border border-[#eadbe4] bg-white/95 px-4 py-3 shadow-[0_20px_35px_-22px_rgba(73,50,66,0.6)] backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">{selectedTimes.size} aega valitud</span>
              <div className="h-4 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => void bulkApply('unblock', Array.from(selectedTimes))}
                disabled={isSaving}
                className="admin-v2-btn-secondary border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                Vabasta
              </button>
              <button
                type="button"
                onClick={() => void bulkApply('block', Array.from(selectedTimes))}
                disabled={isSaving}
                className="admin-v2-btn-ghost border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Blokeeri
              </button>
              <button
                type="button"
                onClick={() => void bulkApply('sos', Array.from(selectedTimes))}
                disabled={isSaving}
                className="admin-v2-btn-secondary border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                SOS
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
              >
                Tühista valik
              </button>
            </div>
          </div>
        )}

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







