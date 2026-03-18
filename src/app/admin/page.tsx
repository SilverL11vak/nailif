import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { AdminDailyPerformanceStrip } from '@/components/admin/AdminDailyPerformanceStrip';
import { AdminAnalyticsSummaryStrip } from '@/components/admin/AdminAnalyticsSummaryStrip';
import { AdminSalonOverview } from '@/components/admin/AdminSalonOverview';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { getAdminDashboardStats } from '@/lib/admin-dashboard';
import { Calendar, Package, Plus } from 'lucide-react';

function formatHeaderDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function AdminHomePage() {
  const admin = await getAdminFromCookies();
  if (!admin) redirect('/admin/login');

  const stats = await getAdminDashboardStats();
  const displayName = admin.name?.trim() || 'Sandra';
  const now = new Date();
  const todayLabel = formatHeaderDate(now);
  const greet = greeting(now.getHours());

  const pendingDepositsToday = stats.todayBookings.filter(
    (b) =>
      b.status !== 'cancelled' &&
      b.status !== 'completed' &&
      (b.paymentStatus === 'unpaid' || b.paymentStatus === 'pending' || b.paymentStatus === 'failed')
  ).length;

  const overviewStats = {
    freeSlotsToday: stats.freeSlotsToday,
    revenueToday: stats.revenueToday,
    revenueThisWeek: stats.revenueThisWeek,
  };

  return (
    <main className="min-h-screen bg-[#f5f2ef]">
      <header className="sticky top-0 z-40 border-b border-[#e8e2dd] bg-[#fffcfc]/95 backdrop-blur-md shadow-[0_4px_24px_-12px_rgba(42,36,40,0.08)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="font-brand text-lg font-semibold tracking-tight text-[#2a2228] transition hover:text-[#8b5c72] sm:text-xl"
          >
            Nailify
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <AdminSearch />
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Greeting + quick actions */}
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b5a8ad]">Salon overview</p>
            <h1 className="mt-2 font-brand text-3xl font-semibold tracking-tight text-[#2a2228] sm:text-4xl">
              {greet}, {displayName}
            </h1>
            <p className="mt-2 text-sm text-[#7a6e74]">{todayLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#9c4d72_0%,#c24d86_55%,#a93d71_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(194,77,134,0.45)]"
            >
              <Plus className="h-4 w-4" />
              New booking
            </Link>
            <Link
              href="/admin/slots"
              className="inline-flex items-center gap-2 rounded-full border border-[#e5ddd8] bg-white px-4 py-2.5 text-sm font-semibold text-[#5c4f55] shadow-sm hover:bg-[#faf8f6]"
            >
              <Calendar className="h-4 w-4 text-[#b85c8a]" />
              Add slot
            </Link>
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-2 rounded-full border border-[#e5ddd8] bg-white px-4 py-2.5 text-sm font-semibold text-[#5c4f55] shadow-sm hover:bg-[#faf8f6]"
            >
              <Package className="h-4 w-4 text-[#b85c8a]" />
              Add product
            </Link>
          </div>
        </div>

        <AdminDailyPerformanceStrip
          todayBookingsCount={stats.todayBookings.length}
          freeSlotsToday={stats.freeSlotsToday}
          revenueSecuredToday={stats.revenueToday}
        />

        <Suspense
          fallback={
            <section className="mb-8 rounded-2xl border border-[#ebe6e3] bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(42,36,40,0.07)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a8989e]">Funnel intelligence</p>
                  <p className="mt-1 text-sm font-medium text-[#5c4f55]">Loading analytics…</p>
                </div>
                <div className="h-9 w-[160px] animate-pulse rounded-full bg-[#f3f4f6]" />
              </div>
            </section>
          }
        >
          <AdminAnalyticsSummaryStrip />
        </Suspense>

        {/* KPI strip */}
        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'Bookings today',
              value: stats.todayBookings.length,
              hint: 'On the calendar',
            },
            {
              label: 'Free slots',
              value: stats.freeSlotsToday,
              hint: 'Available today',
            },
            {
              label: 'Revenue today',
              value: `€${stats.revenueToday}`,
              hint: 'Paid shop orders',
            },
            {
              label: 'Pending deposits',
              value: pendingDepositsToday,
              hint: "Today's appointments",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-[#ebe6e3] bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(42,36,40,0.07)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a8989e]">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[#2a2228] sm:text-3xl">{kpi.value}</p>
              <p className="mt-1 text-xs text-[#9a8a94]">{kpi.hint}</p>
            </div>
          ))}
        </section>

        <AdminSalonOverview stats={overviewStats} />

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 border-t border-[#ebe6e3] pt-10">
          <Link
            href="/admin/account"
            className="text-sm font-medium text-[#8a7c82] underline-offset-2 hover:text-[#c24d86] hover:underline"
          >
            Account & settings
          </Link>
          <span className="text-[#e0d8d4]">·</span>
          <Link
            href="/admin/booking"
            className="text-sm font-medium text-[#8a7c82] underline-offset-2 hover:text-[#c24d86] hover:underline"
          >
            Booking copy & add-ons
          </Link>
          <span className="text-[#e0d8d4]">·</span>
          <Link href="/" className="text-sm font-medium text-[#8a7c82] underline-offset-2 hover:text-[#c24d86] hover:underline">
            View site
          </Link>
        </div>
      </div>
    </main>
  );
}
