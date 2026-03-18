import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';
import { AdminTodayTimeline } from '@/components/admin/AdminTodayTimeline';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { getAdminDashboardStats } from '@/lib/admin-dashboard';
import { Calendar, ShoppingBag, CreditCard, LayoutGrid, Settings } from 'lucide-react';

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('et-EE', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);
}

export default async function AdminHomePage() {
  const admin = await getAdminFromCookies();
  if (!admin) redirect('/admin/login');

  const stats = await getAdminDashboardStats();
  const displayName = admin.name?.trim() || 'Sandra';
  const todayLabel = formatDate(new Date());

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Sticky top bar – premium admin header */}
      <header className="sticky top-0 z-40 border-b border-[#e5e7eb] bg-white/95 backdrop-blur-md shadow-sm">
        <div className="h-0.5 w-full bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" aria-hidden />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="font-brand text-xl font-semibold tracking-tight text-slate-900 transition hover:text-slate-600 sm:text-2xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 rounded-lg"
          >
            Halduspaneel
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-white/80 px-3.5 py-2 text-sm text-slate-600 shadow-sm">
                <span className="text-xs text-slate-500">Täna</span>
                <span className="font-semibold tabular-nums text-slate-800">{stats.todayBookings.length}</span>
                <span className="text-xs text-slate-500">broneeringut</span>
              </span>
              <span className="hidden rounded-xl border border-[#e5e7eb] bg-white/80 px-3.5 py-2 shadow-sm sm:inline-flex">
                <span className="text-xs text-slate-500">Käive</span>
                <span className="ml-1.5 font-semibold text-slate-800">€{stats.revenueToday}</span>
              </span>
            </div>
            <AdminSearch />
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <p className="mb-6 text-sm text-slate-500">
          Tere, <span className="font-medium text-slate-800">{displayName}</span>. {todayLabel}.
        </p>

        {/* Primary action cards */}
        <section className="mb-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/admin/bookings"
              className="group flex flex-col rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Calendar className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <span className="text-2xl font-semibold tabular-nums text-slate-800 sm:text-3xl">{stats.todayBookings.length}</span>
              </div>
              <h2 className="mt-3 font-semibold text-slate-800 group-hover:text-slate-600">
                Broneeringud
              </h2>
              <p className="mt-1 text-sm text-slate-500">Vaata ja halda kõiki broneeringuid</p>
            </Link>
            <Link
              href="/admin/slots"
              className="group flex flex-col rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Calendar className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <span className="text-2xl font-semibold tabular-nums text-slate-800 sm:text-3xl">{stats.freeSlotsToday}</span>
              </div>
              <h2 className="mt-3 font-semibold text-slate-800 group-hover:text-slate-600">
                Vabad ajad
              </h2>
              <p className="mt-1 text-sm text-slate-500">Lisa või muuda vabu aegu täna</p>
            </Link>
            <Link
              href="/admin/orders"
              className="group flex flex-col rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <CreditCard className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <span className="text-2xl font-semibold tabular-nums text-slate-800 sm:text-3xl">{stats.orders}</span>
              </div>
              <h2 className="mt-3 font-semibold text-slate-800 group-hover:text-slate-600">
                Tellimused
              </h2>
              <p className="mt-1 text-sm text-slate-500">Maksed ja tellimuste staatused</p>
            </Link>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[minmax(0,1.2fr)_400px]">
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Täna</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-800">Broneeringute ajajoon</h2>
              </div>
              <Link
                href="/admin/bookings?view=today"
                className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Kõik broneeringud
              </Link>
            </div>
            {stats.todayBookings.length > 0 ? (
              <AdminTodayTimeline items={stats.todayBookings} showHeader={false} />
            ) : (
              <div className="rounded-xl border border-[#e5e7eb] bg-slate-50/50 py-8 text-center">
                <p className="text-sm text-slate-500">Täna pole broneeringuid.</p>
                <Link href="/admin/slots" className="mt-3 inline-flex rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Halda vabu aegu
                </Link>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Sisu</p>
              <h2 className="mt-1 mb-4 text-lg font-semibold text-slate-800">Avalehe ja pood</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href="/admin/services" className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <LayoutGrid className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="font-medium text-slate-800">Teenused</span>
                </Link>
                <Link href="/admin/products" className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <ShoppingBag className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="font-medium text-slate-800">Tooted</span>
                </Link>
                <Link href="/admin/gallery" className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <LayoutGrid className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="font-medium text-slate-800">Galerii</span>
                </Link>
                <Link href="/admin/feedback" className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <LayoutGrid className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="font-medium text-slate-800">Tagasiside</span>
                </Link>
                <Link href="/admin/homepage-media" className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <LayoutGrid className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="font-medium text-slate-800">Avalehe pildid</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Broneerimine</p>
              <h2 className="mt-1 mb-4 text-lg font-semibold text-slate-800">Tekstid ja seaded</h2>
              <div className="grid gap-2">
                <Link href="/admin/booking" className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <LayoutGrid className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="font-medium text-slate-800">Broneerimise tekstid ja lisateenused</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
              <Link href="/admin/account" className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 transition hover:border-slate-200 hover:bg-slate-50">
                <Settings className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="font-medium text-slate-800">Konto ja seaded</span>
              </Link>
            </div>
          </aside>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Vaata avalehte
          </Link>
        </div>
      </div>
    </main>
  );
}
