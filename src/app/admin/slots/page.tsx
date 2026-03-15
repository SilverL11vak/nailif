'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TimeSlot } from '@/store/booking-types';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

type DayCell = {
  key: string;
  date: Date;
  iso: string;
  isCurrentMonth: boolean;
};

type BookingCell = {
  slotDate: string;
  slotTime: string;
  status: string;
  serviceName: string;
  clientName: string;
};

type SlotSummary = {
  free: number;
  blocked: number;
  booked: number;
  sos: number;
};

type SlotState = 'free' | 'blocked' | 'booked' | 'sos';

const weekdays = ['P', 'E', 'T', 'K', 'N', 'R', 'L'];
const sosLabels = ['Kiire aeg', 'Täna saadaval', 'Viimane aeg'];

function isDateString(value: string | null) {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeString(value: string | null) {
  return !!value && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toMonthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

function buildCalendarDays(monthDate: Date): DayCell[] {
  const { start, end } = toMonthBounds(monthDate);
  const firstDay = start.getDay();
  const totalDays = end.getDate();
  const cells: DayCell[] = [];

  for (let i = 0; i < firstDay; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() - (firstDay - i));
    cells.push({ key: `prev-${toIsoDate(date)}`, date, iso: toIsoDate(date), isCurrentMonth: false });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    cells.push({ key: `cur-${toIsoDate(date)}`, date, iso: toIsoDate(date), isCurrentMonth: true });
  }
  const rest = cells.length % 7;
  if (rest !== 0) {
    const add = 7 - rest;
    for (let i = 1; i <= add; i += 1) {
      const date = new Date(end);
      date.setDate(end.getDate() + i);
      cells.push({ key: `next-${toIsoDate(date)}`, date, iso: toIsoDate(date), isCurrentMonth: false });
    }
  }
  return cells;
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

const timeGrid = buildTimeGrid();

export default function AdminSlotsPage() {
  const initialDateRef = useRef(toIsoDate(new Date()));
  const initialTimeRef = useRef<string | null>(null);
  const initialActionRef = useRef('');
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(toIsoDate(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<BookingCell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragTargetAvailable, setDragTargetAvailable] = useState<boolean>(true);
  const [dragTimes, setDragTimes] = useState<Set<string>>(new Set());
  const [sosEnabled, setSosEnabled] = useState(false);
  const [sosSurcharge, setSosSurcharge] = useState<string>('0');
  const [sosLabel, setSosLabel] = useState<string>(sosLabels[0]);

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const monthLabel = monthDate.toLocaleDateString('et-EE', { month: 'long', year: 'numeric' });

  const loadSlotsForMonth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { start, end } = toMonthBounds(monthDate);
      const from = toIsoDate(start);
      const to = toIsoDate(end);
      const [slotsResponse, bookingsResponse] = await Promise.all([
        fetch(`/api/slots?admin=1&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: 'no-store' }),
        fetch('/api/bookings?limit=500', { cache: 'no-store' }),
      ]);

      if (!slotsResponse.ok) throw new Error('Aegade laadimine ebaõnnestus');
      if (!bookingsResponse.ok) throw new Error('Broneeringute laadimine ebaõnnestus');

      const slotsData = (await slotsResponse.json()) as { slots?: TimeSlot[] };
      const bookingsData = (await bookingsResponse.json()) as {
        bookings?: Array<{
          slotDate: string;
          slotTime: string;
          status: string;
          serviceName: string;
          contactFirstName: string;
          contactLastName: string | null;
        }>;
      };

      const monthBookings: BookingCell[] = (bookingsData.bookings ?? [])
        .filter((booking) => booking.status !== 'cancelled' && booking.slotDate >= from && booking.slotDate <= to)
        .map((booking) => ({
          slotDate: booking.slotDate,
          slotTime: booking.slotTime,
          status: booking.status,
          serviceName: booking.serviceName,
          clientName: `${booking.contactFirstName} ${booking.contactLastName ?? ''}`.trim(),
        }));

      setSlots(slotsData.slots ?? []);
      setBookings(monthBookings);
    } catch (loadError) {
      console.error(loadError);
      setError('Aegade laadimine ebaõnnestus.');
    } finally {
      setIsLoading(false);
    }
  }, [monthDate]);

  useEffect(() => {
    void loadSlotsForMonth();
  }, [loadSlotsForMonth]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    const timeParam = params.get('time');
    const actionParam = params.get('action');

    if (dateParam && isDateString(dateParam)) {
      initialDateRef.current = dateParam;
      setSelectedDate(dateParam);
      setMonthDate(new Date(dateParam));
    }
    if (timeParam && isTimeString(timeParam)) {
      initialTimeRef.current = timeParam;
      setSelectedTime(timeParam);
    }
    if (actionParam) {
      initialActionRef.current = actionParam;
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, [dragging]);

  const selectedDaySlots = useMemo(
    () => slots.filter((slot) => slot.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
    [slots, selectedDate]
  );

  const slotMap = useMemo(() => {
    const map = new Map<string, TimeSlot>();
    for (const slot of selectedDaySlots) {
      map.set(slot.time, slot);
    }
    return map;
  }, [selectedDaySlots]);

  const bookedKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const booking of bookings) {
      set.add(`${booking.slotDate}|${booking.slotTime}`);
    }
    return set;
  }, [bookings]);

  const bookingBySelectedTime = useMemo(() => {
    const map = new Map<string, BookingCell>();
    for (const booking of bookings) {
      if (booking.slotDate === selectedDate) {
        map.set(booking.slotTime, booking);
      }
    }
    return map;
  }, [bookings, selectedDate]);

  const slotState = useCallback(
    (date: string, time: string): SlotState => {
      if (bookedKeySet.has(`${date}|${time}`)) return 'booked';
      const slot = slotMap.get(time);
      if (slot?.available && slot.isSos) return 'sos';
      if (slot?.available) return 'free';
      return 'blocked';
    },
    [bookedKeySet, slotMap]
  );

  const summaryByDate = useMemo(() => {
    const map = new Map<string, SlotSummary>();
    for (const dateCell of calendarDays) {
      map.set(dateCell.iso, { free: 0, blocked: 0, booked: 0, sos: 0 });
    }
    for (const day of map.keys()) {
      const summary = map.get(day)!;
      for (const time of timeGrid) {
        const state = slotState(day, time);
        if (state === 'free') summary.free += 1;
        if (state === 'blocked') summary.blocked += 1;
        if (state === 'booked') summary.booked += 1;
        if (state === 'sos') {
          summary.sos += 1;
          summary.free += 1;
        }
      }
    }
    return map;
  }, [calendarDays, slotState]);

  useEffect(() => {
    if (!selectedTime) {
      setSosEnabled(initialActionRef.current === 'sos');
      setSosSurcharge('0');
      setSosLabel(sosLabels[0]);
      return;
    }
    const existing = slotMap.get(selectedTime);
    setSosEnabled(Boolean(existing?.isSos) || initialActionRef.current === 'sos');
    setSosSurcharge(existing?.sosSurcharge ? String(existing.sosSurcharge) : '0');
    setSosLabel(existing?.sosLabel || sosLabels[0]);
    initialActionRef.current = '';
  }, [selectedTime, slotMap]);

  const applySingle = async (time: string, available: boolean) => {
    const existing = slotMap.get(time);
    if (existing) {
      await fetch('/api/slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: existing.id,
          available,
          count: available ? Math.max(existing.count ?? 1, 1) : 0,
          isSos: available ? existing.isSos ?? false : false,
          sosSurcharge: available ? existing.sosSurcharge ?? null : null,
          sosLabel: available ? existing.sosLabel ?? null : null,
        }),
      });
      return;
    }

    await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedDate,
        time,
        available,
        count: available ? 1 : 0,
      }),
    });
  };

  const applyDragSelection = async () => {
    if (dragTimes.size === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      for (const time of dragTimes) {
        if (bookedKeySet.has(`${selectedDate}|${time}`)) {
          continue;
        }
        await applySingle(time, dragTargetAvailable);
      }
      setDragTimes(new Set());
      await loadSlotsForMonth();
    } catch (applyError) {
      console.error(applyError);
      setError('Aegade uuendamine ebaõnnestus.');
    } finally {
      setIsSaving(false);
      setDragging(false);
    }
  };

  const onCellMouseDown = (time: string) => {
    if (bookedKeySet.has(`${selectedDate}|${time}`)) return;
    const state = slotState(selectedDate, time);
    const nextAvailable = !(state === 'free' || state === 'sos');
    setDragTargetAvailable(nextAvailable);
    setDragging(true);
    setDragTimes(new Set([time]));
  };

  const onCellMouseEnter = (time: string) => {
    if (!dragging || bookedKeySet.has(`${selectedDate}|${time}`)) return;
    setDragTimes((prev) => new Set(prev).add(time));
  };

  const toggleByClick = async (time: string) => {
    if (bookedKeySet.has(`${selectedDate}|${time}`)) return;
    setIsSaving(true);
    setError(null);
    try {
      const state = slotState(selectedDate, time);
      const nextAvailable = !(state === 'free' || state === 'sos');
      await applySingle(time, nextAvailable);
      await loadSlotsForMonth();
    } catch (toggleError) {
      console.error(toggleError);
      setError('Aja muutmine ebaõnnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveSosConfig = async () => {
    if (!selectedTime) return;
    if (bookedKeySet.has(`${selectedDate}|${selectedTime}`)) return;

    setIsSaving(true);
    setError(null);
    try {
      const existing = slotMap.get(selectedTime);
      const parsedSurcharge = Number(sosSurcharge);
      const surchargeValue = Number.isFinite(parsedSurcharge) && parsedSurcharge > 0 ? Math.floor(parsedSurcharge) : 0;

      const payload = {
        available: true,
        count: Math.max(existing?.count ?? 1, 1),
        isSos: sosEnabled,
        sosSurcharge: sosEnabled ? surchargeValue : null,
        sosLabel: sosEnabled ? sosLabel : null,
      };

      if (existing) {
        await fetch('/api/slots', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existing.id,
            ...payload,
          }),
        });
      } else {
        await fetch('/api/slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            time: selectedTime,
            ...payload,
          }),
        });
      }

      await loadSlotsForMonth();
    } catch (saveError) {
      console.error(saveError);
      setError('SOS seadete salvestamine ebaõnnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedBooking = selectedTime ? bookingBySelectedTime.get(selectedTime) : undefined;
  const selectedState = selectedTime ? slotState(selectedDate, selectedTime) : null;
  const serviceCompatibility =
    selectedState === 'sos' || selectedState === 'free' ? 'Sobib kõigile teenustele' : 'Vali esmalt vaba aeg';

  return (
    <main className="admin-shell min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff4fa_40%,_#f7ecf4_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="admin-header mb-6 rounded-3xl border border-[#e8e2dc] bg-white/90 p-6 shadow-[0_28px_42px_-34px_rgba(57,45,39,0.42)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#b983a2]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#2f2230]">Vabad ajad ja SOS</h1>
              <p className="mt-2 text-sm text-[#6f5a6a]">Kalendrivaates saad ajad vabastada, blokeerida, märkida SOS-iks.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-[#6f5d53]" href="/admin">
                Halduspaneel
              </Link>
              <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-[#6f5d53]" href="/admin/bookings">
                Broneeringud
              </Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="admin-surface-soft rounded-3xl border border-[#e8e0d9] bg-[linear-gradient(165deg,#fff_0%,#fbf7f2_100%)] p-5 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.28)]">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="rounded-full border border-[#ead8e2] px-3 py-1 text-sm text-[#6f5a6a]"
              >
                Eelmine
              </button>
              <h2 className="text-lg font-semibold text-[#2f2230]">{monthLabel}</h2>
              <button
                onClick={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="rounded-full border border-[#ead8e2] px-3 py-1 text-sm text-[#6f5a6a]"
              >
                Järgmine
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#8f7288]">
              {weekdays.map((weekday) => (
                <div key={weekday} className="py-2">
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((cell) => {
                const summary = summaryByDate.get(cell.iso) ?? { free: 0, blocked: 0, booked: 0, sos: 0 };
                const isSelected = selectedDate === cell.iso;
                return (
                  <button
                    key={cell.key}
                    onClick={() => {
                      setSelectedDate(cell.iso);
                      if (!selectedTime || !timeGrid.includes(selectedTime)) {
                        setSelectedTime(initialTimeRef.current);
                      }
                    }}
                    className={`rounded-2xl border p-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#c58ab0] bg-[#fff4fb] shadow-[0_10px_20px_-18px_rgba(115,72,102,0.7)]'
                        : cell.isCurrentMonth
                          ? 'border-[#f0e1ea] bg-white'
                          : 'border-[#f2e8ef] bg-[#faf6fa] opacity-80'
                    }`}
                  >
                    <p className="text-sm font-semibold">{cell.date.getDate()}</p>
                    <p className="mt-1 text-[10px] text-[#8e7387]">Vaba {summary.free}</p>
                    <p className="text-[10px] text-[#7f6f77]">Broneeritud {summary.booked}</p>
                    {summary.sos > 0 && <p className="text-[10px] font-medium text-[#b05387]">SOS {summary.sos}</p>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="admin-surface rounded-3xl border border-[#ece3db] bg-white/95 p-5 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#2f2230]">Päevavaade: {selectedDate}</h3>
                <p className="text-sm text-[#6f5a6a]">Lohista, et korraga muuta mitu aega. Topeltklikk vahetab vaba/blokeeritud.</p>
              </div>
              <button
                onClick={applyDragSelection}
                disabled={isSaving || dragTimes.size === 0}
                className="rounded-xl bg-[#8a5e76] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Rakenda valik ({dragTimes.size})
              </button>
            </div>

            {isLoading && <p className="text-sm text-[#6f5a6a]">Laen aegu...</p>}

            <div className="grid grid-cols-4 gap-2">
              {timeGrid.map((time) => {
                const state = slotState(selectedDate, time);
                const isSelectedTime = selectedTime === time;
                const isDragSelected = dragTimes.has(time);
                const booking = bookingBySelectedTime.get(time);
                const displayLabel =
                  state === 'booked'
                    ? 'Broneeritud'
                    : state === 'sos'
                      ? 'SOS'
                      : state === 'free'
                        ? 'Vaba'
                        : 'Blokeeritud';

                return (
                  <button
                    key={time}
                    onMouseDown={() => onCellMouseDown(time)}
                    onMouseEnter={() => onCellMouseEnter(time)}
                    onDoubleClick={() => void toggleByClick(time)}
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                      isDragSelected
                        ? 'border-[#b05387] bg-[#fdeef7] text-[#6b3653]'
                        : state === 'booked'
                          ? 'border-[#f0cddf] bg-[#fff1f8] text-[#8a4f70]'
                          : state === 'sos'
                            ? 'border-[#d789b3] bg-[#fff3fb] text-[#8b3b67] shadow-[0_10px_16px_-14px_rgba(149,63,112,0.8)]'
                            : state === 'free'
                              ? 'border-[#efe4d8] bg-[#fffaf4] text-[#7f5f4c]'
                              : 'border-slate-300 bg-slate-100 text-slate-700'
                    } ${isSelectedTime ? 'ring-2 ring-[#d18bb2]' : ''}`}
                    title={
                      state === 'booked'
                        ? `${time} - ${booking?.serviceName ?? 'Broneeritud'}`
                        : `${time} - ${displayLabel} (${serviceCompatibility})`
                    }
                  >
                    <p className="font-medium">{time}</p>
                    <p className="text-[11px]">{displayLabel}</p>
                    {state === 'sos' && (
                      <p className="text-[11px] text-[#8b3b67]">
                        {slotMap.get(time)?.sosSurcharge ? `+${slotMap.get(time)?.sosSurcharge} EUR` : 'Lisatasuta'}
                      </p>
                    )}
                    {state === 'booked' && booking?.serviceName && (
                      <p className="truncate text-[11px] text-[#8a4f70]">{booking.serviceName}</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-[#f0dfe9] bg-[#fff9fc] p-4 text-sm text-[#6f5a6a]">
              <p className="text-xs uppercase tracking-[0.16em] text-[#a77f96]">Kiire muutmine</p>
              {!selectedTime && <p>Vali päevavaatest aeg, et muuta selle olekut või SOS seadeid.</p>}
              {selectedTime && selectedState === 'booked' && (
                <div className="space-y-1">
                  <p className="font-medium text-[#7d4465]">Aeg {selectedTime} on broneeritud.</p>
                  <p>{selectedBooking?.clientName}</p>
                  <p className="text-xs text-[#896f80]">{selectedBooking?.serviceName}</p>
                </div>
              )}
              {selectedTime && selectedState !== 'booked' && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void applySingle(selectedTime, true).then(loadSlotsForMonth)}
                      disabled={isSaving}
                      className="rounded-lg border border-[#e8d7e0] bg-white px-3 py-1.5 text-sm text-[#6f5a6a] disabled:opacity-50"
                    >
                      Märgi vabaks
                    </button>
                    <button
                      onClick={() => void applySingle(selectedTime, false).then(loadSlotsForMonth)}
                      disabled={isSaving}
                      className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-50"
                    >
                      Blokeeri
                    </button>
                  </div>
                  <div className="rounded-xl border border-[#efd6e3] bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium text-[#5d3e51]">SOS seaded ({selectedTime})</p>
                      <button
                        onClick={() => setSosEnabled((prev) => !prev)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          sosEnabled ? 'bg-[#f5d8e8] text-[#8b3b67]' : 'bg-[#f4f4f5] text-slate-600'
                        }`}
                      >
                        {sosEnabled ? 'SOS aktiivne' : 'Lülita SOS sisse'}
                      </button>
                    </div>
                    <p className="mb-3 text-xs text-[#876a7c]">{serviceCompatibility}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-[#7a6473]">
                        SOS lisatasu (EUR)
                        <input
                          type="number"
                          min={0}
                          value={sosSurcharge}
                          onChange={(event) => setSosSurcharge(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-[#ead7e3] px-2 py-1.5 text-sm text-[#4b3544]"
                        />
                      </label>
                      <label className="text-xs text-[#7a6473]">
                        SOS silt
                        <select
                          value={sosLabel}
                          onChange={(event) => setSosLabel(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-[#ead7e3] px-2 py-1.5 text-sm text-[#4b3544]"
                        >
                          {sosLabels.map((label) => (
                            <option key={label} value={label}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      onClick={() => void saveSosConfig()}
                      disabled={isSaving}
                      className="mt-3 rounded-lg bg-[#8a5e76] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Salvesta SOS
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#7c6477]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fffaf4] px-2 py-1">
                <span className="h-2 w-2 rounded-full bg-[#d2b8a0]" /> Vaba
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                <span className="h-2 w-2 rounded-full bg-slate-500" /> Blokeeritud
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1f8] px-2 py-1">
                <span className="h-2 w-2 rounded-full bg-[#d58cb5]" /> Broneeritud
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3fb] px-2 py-1">
                <span className="h-2 w-2 rounded-full bg-[#b05387]" /> SOS
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
