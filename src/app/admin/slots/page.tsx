'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TimeSlot } from '@/store/booking-types';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

type BookingCell = {
  slotDate: string;
  slotTime: string;
  status: string;
  serviceName: string;
  clientName: string;
};

type SlotState = 'free' | 'blocked' | 'booked' | 'sos';

const sosLabels = ['Kiire aeg', 'Tana saadaval', 'Viimane aeg'];
const quickPresetTimes = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function buildNextDays(count: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return {
      iso: toIsoDate(date),
      label: date.toLocaleDateString('et-EE', { weekday: 'short' }),
      day: date.getDate(),
      month: date.toLocaleDateString('et-EE', { month: 'short' }),
      isToday: index === 0,
    };
  });
}

const timeGrid = buildTimeGrid();

export default function AdminSlotsPage() {
  const initialDateRef = useRef(toIsoDate(new Date()));
  const initialTimeRef = useRef<string | null>(null);
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

  const days = useMemo(() => buildNextDays(14), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    const timeParam = params.get('time');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      initialDateRef.current = dateParam;
      setSelectedDate(dateParam);
    }
    if (timeParam && /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeParam)) {
      initialTimeRef.current = timeParam;
      setSelectedTime(timeParam);
    }
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

      const [slotsResponse, bookingsResponse] = await Promise.all([
        fetch(`/api/slots?admin=1&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: 'no-store' }),
        fetch('/api/bookings?limit=500', { cache: 'no-store' }),
      ]);

      if (!slotsResponse.ok) throw new Error('Aegade laadimine ebaonnestus');
      if (!bookingsResponse.ok) throw new Error('Broneeringute laadimine ebaonnestus');

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

      const nextBookings: BookingCell[] = (bookingsData.bookings ?? [])
        .filter((booking) => booking.status !== 'cancelled')
        .map((booking) => ({
          slotDate: booking.slotDate,
          slotTime: booking.slotTime,
          status: booking.status,
          serviceName: booking.serviceName,
          clientName: `${booking.contactFirstName} ${booking.contactLastName ?? ''}`.trim(),
        }));

      setSlots(slotsData.slots ?? []);
      setBookings(nextBookings);
    } catch (loadError) {
      console.error(loadError);
      setError('Aegade laadimine ebaonnestus.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const selectedDaySlots = useMemo(
    () => slots.filter((slot) => slot.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
    [slots, selectedDate]
  );

  const slotMap = useMemo(() => {
    const map = new Map<string, TimeSlot>();
    for (const slot of selectedDaySlots) map.set(slot.time, slot);
    return map;
  }, [selectedDaySlots]);

  const bookedMap = useMemo(() => {
    const map = new Map<string, BookingCell>();
    for (const booking of bookings) {
      if (booking.slotDate === selectedDate) map.set(booking.slotTime, booking);
    }
    return map;
  }, [bookings, selectedDate]);

  const slotState = useCallback(
    (time: string): SlotState => {
      if (bookedMap.has(time)) return 'booked';
      const slot = slotMap.get(time);
      if (slot?.available && slot.isSos) return 'sos';
      if (slot?.available) return 'free';
      return 'blocked';
    },
    [bookedMap, slotMap]
  );

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

  const upsertSlot = async (date: string, time: string, available: boolean, extras?: Partial<TimeSlot>) => {
    const existing = slots.find((slot) => slot.date === date && slot.time === time);
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
  };

  const toggleSlot = async (time: string) => {
    if (bookedMap.has(time)) return;
    setIsSaving(true);
    setError(null);
    try {
      const current = slotState(time);
      const nextAvailable = !(current === 'free' || current === 'sos');
      await upsertSlot(selectedDate, time, nextAvailable);
      await loadSlots();
    } catch (toggleError) {
      console.error(toggleError);
      setError('Aja muutmine ebaonnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyPresetDay = async (makeAvailable: boolean) => {
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all(
        quickPresetTimes.map(async (time) => {
          if (bookedMap.has(time)) return;
          await upsertSlot(selectedDate, time, makeAvailable);
        })
      );
      await loadSlots();
    } catch (presetError) {
      console.error(presetError);
      setError('Paeva malli rakendamine ebaonnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveSos = async () => {
    if (!selectedTime || bookedMap.has(selectedTime)) return;
    setIsSaving(true);
    setError(null);
    try {
      const parsed = Number(sosSurcharge);
      const safeSurcharge = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
      await upsertSlot(selectedDate, selectedTime, true, {
        isSos: sosEnabled,
        sosSurcharge: sosEnabled ? safeSurcharge : undefined,
        sosLabel: sosEnabled ? sosLabel : undefined,
      });
      await loadSlots();
    } catch (saveError) {
      console.error(saveError);
      setError('SOS seadete salvestamine ebaonnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedBooking = selectedTime ? bookedMap.get(selectedTime) : undefined;
  const freeCount = selectedDaySlots.filter((slot) => slot.available && !slot.isSos).length;
  const sosCount = selectedDaySlots.filter((slot) => slot.available && slot.isSos).length;
  const bookedCount = bookings.filter((booking) => booking.slotDate === selectedDate).length;

  return (
    <main className="admin-cockpit-bg px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1300px]">
        <header className="admin-cockpit-shell mb-6 rounded-[28px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6b7280]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#111827]">Vabad ajad</h1>
              <p className="mt-2 text-sm text-[#4b5563]">Paevapohine vaade: vali paev, muuda aegu, lisa SOS.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563]" href="/admin">
                Halduspaneel
              </Link>
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563]" href="/admin/bookings">
                Broneeringud
              </Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        <section className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="admin-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Vabad ajad</p>
            <p className="mt-1 text-2xl font-semibold text-[#111827]">{freeCount}</p>
          </div>
          <div className="admin-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">SOS ajad</p>
            <p className="mt-1 text-2xl font-semibold text-[#111827]">{sosCount}</p>
          </div>
          <div className="admin-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Broneeritud</p>
            <p className="mt-1 text-2xl font-semibold text-[#111827]">{bookedCount}</p>
          </div>
        </section>

        {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <article className="admin-panel rounded-3xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#111827]">1. Vali paev</h2>
                <span className="text-xs text-[#6b7280]">Jargmised 14 paeva</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                {days.map((day) => {
                  const isSelected = day.iso === selectedDate;
                  return (
                    <button
                      key={day.iso}
                      onClick={() => {
                        setSelectedDate(day.iso);
                        if (!selectedTime) setSelectedTime(initialTimeRef.current);
                      }}
                      className={`rounded-2xl border px-3 py-2 text-left transition ${
                        isSelected ? 'border-[#9ca3af] bg-[#f9fafb] shadow-[0_10px_20px_-18px_rgba(15,23,42,0.6)]' : 'border-[#e5e7eb] bg-white'
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">{day.label}</p>
                      <p className="text-xl font-semibold text-[#111827]">{day.day}</p>
                      <p className="text-[11px] text-[#6b7280]">{day.month}</p>
                      {day.isToday ? <p className="mt-1 text-[10px] font-semibold text-[#374151]">TANA</p> : null}
                    </button>
                  );
                })}
              </div>
            </article>

            <article className="admin-panel rounded-3xl p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[#111827]">2. Muuda aegu ({selectedDate})</h2>
                <div className="flex gap-2">
                  <button onClick={() => void applyPresetDay(true)} disabled={isSaving} className="rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-xs font-semibold text-[#374151] disabled:opacity-50">
                    Taida toopaev
                  </button>
                  <button onClick={() => void applyPresetDay(false)} disabled={isSaving} className="rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-xs font-semibold text-[#374151] disabled:opacity-50">
                    Tuhjenda paev
                  </button>
                </div>
              </div>

              {isLoading ? <p className="text-sm text-[#4b5563]">Laen aegu...</p> : null}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {timeGrid.map((time) => {
                  const state = slotState(time);
                  const isSelected = selectedTime === time;
                  const booking = bookedMap.get(time);
                  const stateLabel = state === 'booked' ? 'Broneeritud' : state === 'sos' ? 'SOS' : state === 'free' ? 'Vaba' : 'Blokeeritud';
                  return (
                    <button
                      key={time}
                      onClick={() => {
                        setSelectedTime(time);
                        if (state !== 'booked') void toggleSlot(time);
                      }}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        state === 'booked'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : state === 'sos'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : state === 'free'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-300 bg-slate-100 text-slate-700'
                      } ${isSelected ? 'ring-2 ring-[#9ca3af]' : ''}`}
                    >
                      <p className="font-semibold">{time}</p>
                      <p className="text-[11px]">{stateLabel}</p>
                      {state === 'booked' && booking ? <p className="truncate text-[11px]">{booking.clientName}</p> : null}
                    </button>
                  );
                })}
              </div>
            </article>
          </div>

          <article className="admin-panel rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-[#111827]">3. Valitud aeg</h2>
            {!selectedTime ? (
              <p className="mt-2 text-sm text-[#4b5563]">Vali vasakult kellaaeg, et muuta selle olekut.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-[#d1d5db] bg-[#f9fafb] p-3">
                  <p className="text-sm font-semibold text-[#111827]">{selectedDate} kell {selectedTime}</p>
                  <p className="text-xs text-[#6b7280]">Staatus: {slotState(selectedTime)}</p>
                </div>

                {selectedBooking ? (
                  <div className="rounded-xl border border-[#d1d5db] bg-white p-3 text-sm text-[#374151]">
                    <p className="font-semibold">See aeg on juba broneeritud</p>
                    <p className="mt-1">{selectedBooking.clientName}</p>
                    <p className="text-xs text-[#6b7280]">{selectedBooking.serviceName}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#d1d5db] bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#111827]">SOS valik</p>
                      <button onClick={() => setSosEnabled((prev) => !prev)} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${sosEnabled ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                        {sosEnabled ? 'SOS aktiivne' : 'Lulita SOS sisse'}
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-[#4b5563]">
                        SOS lisatasu (EUR)
                        <input type="number" min={0} value={sosSurcharge} onChange={(event) => setSosSurcharge(event.target.value)} className="mt-1 w-full rounded-lg border border-[#d1d5db] px-2 py-1.5 text-sm text-[#374151]" />
                      </label>
                      <label className="text-xs text-[#4b5563]">
                        SOS silt
                        <select value={sosLabel} onChange={(event) => setSosLabel(event.target.value)} className="mt-1 w-full rounded-lg border border-[#d1d5db] px-2 py-1.5 text-sm text-[#374151]">
                          {sosLabels.map((label) => (
                            <option key={label} value={label}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button onClick={() => void saveSos()} disabled={isSaving} className="mt-3 rounded-lg bg-[#111827] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                      Salvesta SOS
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6b7280]">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Vaba
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                <span className="h-2 w-2 rounded-full bg-slate-500" /> Blokeeritud
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Broneeritud
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> SOS
              </span>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
