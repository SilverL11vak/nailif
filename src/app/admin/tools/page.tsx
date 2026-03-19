'use client';

import { useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Trash2, CalendarOff, BarChart3, ShoppingBag, CalendarDays, AlertTriangle, Lock, LockOpen } from 'lucide-react';

type ActionState = 'idle' | 'confirming' | 'loading' | 'done' | 'error';

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function AdminToolsPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [clearBookingsState, setClearBookingsState] = useState<ActionState>('idle');
  const [clearOrdersState, setClearOrdersState] = useState<ActionState>('idle');
  const [clearAnalyticsState, setClearAnalyticsState] = useState<ActionState>('idle');
  const [vacationState, setVacationState] = useState<ActionState>('idle');
  const [disableAllSpotsState, setDisableAllSpotsState] = useState<ActionState>('idle');
  const [enableAllSpotsState, setEnableAllSpotsState] = useState<ActionState>('idle');

  const today = toIsoDate(new Date());
  const nextWeek = toIsoDate(new Date(Date.now() + 7 * 86_400_000));
  const [vacationFrom, setVacationFrom] = useState(today);
  const [vacationTo, setVacationTo] = useState(nextWeek);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const runAction = async (
    action: string,
    setState: (s: ActionState) => void,
    payload?: Record<string, string>,
  ) => {
    setState('loading');
    setError(null);
    try {
      const res = await fetch('/api/admin/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Action failed');
      }
      const data = await res.json() as { deleted?: number; blocked?: number; updated?: number };
      setState('done');
      const count = data.deleted ?? data.blocked ?? data.updated ?? 0;
      if (action === 'clear_bookings') showToast(`Kustutatud ${count} broneeringut`);
      else if (action === 'clear_orders') showToast(`Kustutatud ${count} tellimust`);
      else if (action === 'clear_analytics') showToast(`Analüütika andmed kustutatud`);
      else if (action === 'vacation_mode') showToast(`Blokeeritud ${count} aega`);
      else if (action === 'disable_all_spots') showToast(`Blokeeritud ${count} aega`);
      else if (action === 'enable_all_spots') showToast(`Vabastatud ${count} aega`);
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Tegevus ebaõnnestus');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminPageHeader
          overline="Haldus"
          title="Tööriistad"
          subtitle="Halda broneeringuid, tellimusi, analüütikat ja puhkuserežiimi."
          backHref="/admin"
          backLabel="Halduspaneel"
        />

        {toast && (
          <div className="fixed right-6 top-6 z-[70] rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-lg">
            {toast}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Clear all bookings */}
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-800">Kustuta kõik broneeringud</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Kustutab kõik broneeringud (reserveeringud), sealhulgas tulevased ja lõpetatud broneeringud. Seda tegevust ei saa tagasi võtta.
                </p>
                <div className="mt-3">
                  {clearBookingsState === 'confirming' ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        Kas oled kindel?
                      </div>
                      <button
                        type="button"
                        onClick={() => void runAction('clear_bookings', setClearBookingsState)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Jah, kustuta kõik
                      </button>
                      <button
                        type="button"
                        onClick={() => setClearBookingsState('idle')}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Tühista
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setClearBookingsState('confirming')}
                      disabled={clearBookingsState === 'loading' || clearBookingsState === 'done'}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {clearBookingsState === 'loading' ? 'Kustutan...' : clearBookingsState === 'done' ? 'Kustutatud!' : 'Kustuta broneeringud'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Clear orders */}
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-800">Kustuta tellimuste ajalugu</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Kustutab kõik tellimused (Stripe maksed ja ettemaksud). Seda tegevust ei saa tagasi võtta.
                </p>
                <div className="mt-3">
                  {clearOrdersState === 'confirming' ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        Kas oled kindel?
                      </div>
                      <button
                        type="button"
                        onClick={() => void runAction('clear_orders', setClearOrdersState)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Jah, kustuta kõik
                      </button>
                      <button
                        type="button"
                        onClick={() => setClearOrdersState('idle')}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Tühista
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setClearOrdersState('confirming')}
                      disabled={clearOrdersState === 'loading' || clearOrdersState === 'done'}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {clearOrdersState === 'loading' ? 'Kustutan...' : clearOrdersState === 'done' ? 'Kustutatud!' : 'Kustuta tellimused'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Clear analytics */}
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-800">Kustuta analüütika andmed</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Kustutab kõik analüütika sessioonid, sündmused ja klõpsud. Seda tegevust ei saa tagasi võtta.
                </p>
                <div className="mt-3">
                  {clearAnalyticsState === 'confirming' ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        Kas oled kindel?
                      </div>
                      <button
                        type="button"
                        onClick={() => void runAction('clear_analytics', setClearAnalyticsState)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Jah, kustuta kõik
                      </button>
                      <button
                        type="button"
                        onClick={() => setClearAnalyticsState('idle')}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Tühista
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setClearAnalyticsState('confirming')}
                      disabled={clearAnalyticsState === 'loading' || clearAnalyticsState === 'done'}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {clearAnalyticsState === 'loading' ? 'Kustutan...' : clearAnalyticsState === 'done' ? 'Kustutatud!' : 'Kustuta analüütika'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Vacation mode */}
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <CalendarOff className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-800">Puhkuserežiim</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Blokeerib kõik vabad ajad valitud kuupäevavahemikus. Kliendid ei saa neid aegu broneerida.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:max-w-md">
                  <label className="block">
                    <span className="block text-xs font-medium text-slate-600 mb-1">Algus</span>
                    <input
                      type="date"
                      value={vacationFrom}
                      onChange={(e) => setVacationFrom(e.target.value)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium text-slate-600 mb-1">Lõpp</span>
                    <input
                      type="date"
                      value={vacationTo}
                      onChange={(e) => setVacationTo(e.target.value)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
                    />
                  </label>
                </div>
                <div className="mt-3">
                  {vacationState === 'confirming' ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        Blokeeri kõik ajad {vacationFrom} – {vacationTo}?
                      </div>
                      <button
                        type="button"
                        onClick={() => void runAction('vacation_mode', setVacationState, { from: vacationFrom, to: vacationTo })}
                        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                      >
                        Jah, blokeeri
                      </button>
                      <button
                        type="button"
                        onClick={() => setVacationState('idle')}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Tühista
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVacationState('confirming')}
                      disabled={vacationState === 'loading' || vacationState === 'done' || !vacationFrom || !vacationTo}
                      className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      <CalendarOff className="h-4 w-4" />
                      {vacationState === 'loading' ? 'Blokeerin...' : vacationState === 'done' ? 'Blokeeritud!' : 'Aktiveeri puhkuserežiim'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Global spots toggle */}
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                <CalendarOff className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-800">Kõikide aegade globaalne olek</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Halda kõiki olemasolevaid vabu ja blokeeritud aegu korraga. Broneeritud ajad jäävad puutumata.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {enableAllSpotsState === 'confirming' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void runAction('enable_all_spots', setEnableAllSpotsState)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        <LockOpen className="h-4 w-4" />
                        Jah, vabasta kõik
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnableAllSpotsState('idle')}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Tühista
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEnableAllSpotsState('confirming')}
                      disabled={enableAllSpotsState === 'loading' || enableAllSpotsState === 'done'}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <LockOpen className="h-4 w-4" />
                      {enableAllSpotsState === 'loading' ? 'Vabastan...' : enableAllSpotsState === 'done' ? 'Vabastatud!' : 'Vabasta kõik ajad'}
                    </button>
                  )}

                  {disableAllSpotsState === 'confirming' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void runAction('disable_all_spots', setDisableAllSpotsState)}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
                      >
                        <Lock className="h-4 w-4" />
                        Jah, blokeeri kõik
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisableAllSpotsState('idle')}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Tühista
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDisableAllSpotsState('confirming')}
                      disabled={disableAllSpotsState === 'loading' || disableAllSpotsState === 'done'}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Lock className="h-4 w-4" />
                      {disableAllSpotsState === 'loading' ? 'Blokeerin...' : disableAllSpotsState === 'done' ? 'Blokeeritud!' : 'Blokeeri kõik ajad'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Help text */}
          <div className="rounded-xl border border-[#e5e7eb] bg-slate-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Abi</p>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>• <strong>Kustuta broneeringud</strong> — eemaldab kõik broneeringud andmebaasist, sh tulevased ja möödunud.</li>
              <li>• <strong>Kustuta tellimused</strong> — eemaldab kõik Stripe maksete ja ettemaksude kirjed.</li>
              <li>• <strong>Kustuta analüütika</strong> — eemaldab kõik broneerimise analüütika sessioonid ja sündmused.</li>
              <li>• <strong>Puhkuserežiim</strong> — blokeerib kõik saadaval olevad ajad valitud perioodil. Juba broneeritud aegu see ei muuda.</li>
              <li>• <strong>Vabasta kõik ajad</strong> — teeb kõik olemasolevad mitte-broneeritud ajad vabaks.</li>
              <li>• <strong>Blokeeri kõik ajad</strong> — blokeerib kõik olemasolevad mitte-broneeritud ajad.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
