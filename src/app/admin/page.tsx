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
    <div className="admin-cockpit-bg min-h-screen">
      {/* Sticky top bar: always visible, key metrics + search + logout */}
      <header className="admin-sticky-bar">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="font-brand text-xl font-semibold tracking-tight text-[var(--color-text-body)] hover:text-[var(--color-primary)] sm:text-2xl">
            Halduspaneel
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="admin-metric-chip flex items-center gap-1.5 px-3 py-1.5">
                <span className="admin-muted text-xs">Täna</span>
                <span className="admin-metric-value text-base">{stats.todayBookings.length}</span>
                <span className="admin-muted text-xs">broneeringut</span>
              </span>
              <span className="admin-metric-chip hidden px-3 py-1.5 sm:inline-flex">
                <span className="admin-muted text-xs">Käive</span>
                <span className="ml-1.5 font-semibold text-[var(--color-text-body)]">€{stats.revenueToday}</span>
              </span>
            </div>
            <AdminSearch />
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {/* Welcome */}
        <p className="type-small admin-muted mb-6">
          Tere, <span className="font-medium text-[var(--color-text-body)]">{displayName}</span>. {todayLabel}.
        </p>

        {/* Primary actions: the 3 most important things */}
        <section className="mb-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/admin/bookings"
              className="admin-primary-card admin-primary-card-accent group flex flex-col p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Calendar className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <span className="admin-metric-value text-2xl sm:text-3xl">{stats.todayBookings.length}</span>
              </div>
              <h2 className="mt-3 font-semibold text-[var(--color-text-body)] group-hover:text-[var(--color-primary)]">
                Broneeringud
              </h2>
              <p className="type-small admin-muted mt-1">Vaata ja halda kõiki broneeringuid</p>
            </Link>
            <Link
              href="/admin/slots"
              className="admin-primary-card admin-primary-card-accent group flex flex-col p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Calendar className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <span className="admin-metric-value text-2xl sm:text-3xl">{stats.freeSlotsToday}</span>
              </div>
              <h2 className="mt-3 font-semibold text-[var(--color-text-body)] group-hover:text-[var(--color-primary)]">
                Vabad ajad
              </h2>
              <p className="type-small admin-muted mt-1">Lisa või muuda vabu aegu täna</p>
            </Link>
            <Link
              href="/admin/orders"
              className="admin-primary-card admin-primary-card-accent group flex flex-col p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <CreditCard className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <span className="admin-metric-value text-2xl sm:text-3xl">{stats.orders}</span>
              </div>
              <h2 className="mt-3 font-semibold text-[var(--color-text-body)] group-hover:text-[var(--color-primary)]">
                Tellimused
              </h2>
              <p className="type-small admin-muted mt-1">Maksed ja tellimuste staatused</p>
            </Link>
          </div>
        </section>

        {/* Two-column: Today's timeline (left) + Navigation (right) */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[minmax(0,1.2fr)_400px]">
          {/* Today's bookings – always show for context */}
          <section className="admin-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="admin-section-overline">Täna</p>
                <h2 className="type-h4 admin-heading mt-1">Broneeringute ajajoon</h2>
              </div>
              <Link
                href="/admin/bookings?view=today"
                className="btn-primary btn-primary-sm"
              >
                Kõik broneeringud
              </Link>
            </div>
            {stats.todayBookings.length > 0 ? (
              <AdminTodayTimeline items={stats.todayBookings} showHeader={false} />
            ) : (
              <div className="rounded-2xl border border-[var(--color-border-card-soft)] bg-[#fef8fb]/60 py-8 text-center">
                <p className="admin-muted">Täna pole broneeringuid.</p>
                <Link href="/admin/slots" className="btn-secondary btn-secondary-sm mt-3 inline-flex">
                  Halda vabu aegu
                </Link>
              </div>
            )}
          </section>

          {/* Right: Sisu + Broneerimine + Seaded in one card */}
          <aside className="space-y-6">
            <div className="admin-panel p-5">
              <p className="admin-section-overline">Sisu</p>
              <h2 className="type-h4 admin-heading mt-1 mb-4">Avalehe ja pood</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href="/admin/services" className="admin-action-tile flex items-center gap-3 p-3">
                  <LayoutGrid className="h-4 w-4 shrink-0 admin-muted" />
                  <span className="font-medium admin-heading">Teenused</span>
                </Link>
                <Link href="/admin/products" className="admin-action-tile flex items-center gap-3 p-3">
                  <ShoppingBag className="h-4 w-4 shrink-0 admin-muted" />
                  <span className="font-medium admin-heading">Tooted</span>
                </Link>
                <Link href="/admin/gallery" className="admin-action-tile flex items-center gap-3 p-3">
                  <LayoutGrid className="h-4 w-4 shrink-0 admin-muted" />
                  <span className="font-medium admin-heading">Galerii</span>
                </Link>
                <Link href="/admin/feedback" className="admin-action-tile flex items-center gap-3 p-3">
                  <LayoutGrid className="h-4 w-4 shrink-0 admin-muted" />
                  <span className="font-medium admin-heading">Tagasiside</span>
                </Link>
                <Link href="/admin/homepage-media" className="admin-action-tile flex items-center gap-3 p-3">
                  <LayoutGrid className="h-4 w-4 shrink-0 admin-muted" />
                  <span className="font-medium admin-heading">Avalehe pildid</span>
                </Link>
              </div>
            </div>

            <div className="admin-panel p-5">
              <p className="admin-section-overline">Broneerimine</p>
              <h2 className="type-h4 admin-heading mt-1 mb-4">Tekstid ja seaded</h2>
              <div className="grid gap-2">
                <Link href="/admin/booking" className="admin-action-tile flex items-center gap-3 p-3">
                  <LayoutGrid className="h-4 w-4 shrink-0 admin-muted" />
                  <span className="font-medium admin-heading">Broneerimise tekstid ja lisateenused</span>
                </Link>
              </div>
            </div>

            <div className="admin-panel p-4">
              <Link href="/admin/account" className="admin-action-tile flex items-center gap-3 p-3">
                <Settings className="h-4 w-4 shrink-0 admin-muted" />
                <span className="font-medium admin-heading">Konto ja seaded</span>
              </Link>
            </div>
          </aside>
        </div>

        {/* Quick link to public site */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="type-small inline-flex items-center gap-2 rounded-full border border-[var(--color-border-card-soft)] bg-white px-4 py-2 admin-muted hover:border-[var(--color-border-card)] hover:bg-[#fff8fb]"
          >
            Vaata avalehte
          </Link>
        </div>
      </main>
    </div>
  );
}
