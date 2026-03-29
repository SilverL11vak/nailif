import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarDays, Clock3, Package, Plus } from 'lucide-react';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { getAdminDashboardStats } from '@/lib/admin-dashboard';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Hei';
  if (hour < 18) return 'Tere';
  return 'Tere õhtust';
}

function formatDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('et-EE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function formatMoney(value: number) {
  return `${Math.round(value)} €`;
}

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function timelineDensity(bookings: Array<{ slotTime: string }>) {
  const points = Array.from({ length: 12 }).map((_, index) => {
    const start = 8 * 60 + index * 60;
    const end = start + 60;
    const count = bookings.filter((item) => {
      const value = toMinutes(item.slotTime);
      return value >= start && value < end;
    }).length;
    return count;
  });

  const max = Math.max(1, ...points);
  return points.map((count) => Math.max(10, Math.round((count / max) * 100)));
}

export default async function AdminHomePage() {
  const admin = await getAdminFromCookies();
  if (!admin) redirect('/admin/login');

  const stats = await getAdminDashboardStats();
  const displayName = admin.name?.trim() || 'Sandra';
  const pendingDepositsToday = stats.todayBookings.filter(
    (booking) =>
      booking.status !== 'cancelled' &&
      booking.status !== 'completed' &&
      (booking.paymentStatus === 'unpaid' || booking.paymentStatus === 'pending' || booking.paymentStatus === 'failed')
  ).length;

  const todayTimeline = timelineDensity(stats.todayBookings);
  const hasTodayBookings = stats.todayBookings.length > 0;

  return (
    <main>
      <div className="space-y-6 lg:space-y-8">
        <section className="admin-v2-surface p-6 lg:p-8">
          <p className="admin-v2-overline">Tänane ülevaade</p>
          <h2 className="mt-2 font-brand text-[2.2rem] font-semibold leading-none tracking-[-0.02em] text-[#2a202a] sm:text-[2.5rem]">
            {getGreeting()}, {displayName} 👋
          </h2>
          <p className="mt-2 text-sm text-[#7d6876]">Siin on tänane ülevaade · {formatDateLabel()}</p>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="admin-v2-card p-6">
              <p className="admin-v2-metric-label">Tänased broneeringud</p>
              <p className="admin-v2-metric-value mt-2">{stats.todayBookings.length}</p>
            </article>
            <article className="admin-v2-card p-6">
              <p className="admin-v2-metric-label">Vabad ajad</p>
              <p className="admin-v2-metric-value mt-2">{stats.freeSlotsToday}</p>
            </article>
            <article className="admin-v2-card p-6">
              <p className="admin-v2-metric-label">Tänane tulu</p>
              <p className="admin-v2-metric-value mt-2">{formatMoney(stats.revenueToday)}</p>
            </article>
            <article className="admin-v2-card p-6">
              <p className="admin-v2-metric-label">Ootel maksed</p>
              <p className="admin-v2-metric-value mt-2">{pendingDepositsToday}</p>
            </article>
          </div>
        </section>

        <section className="admin-v2-surface p-5 lg:p-6">
          <p className="admin-v2-overline mb-3">Kiired tegevused</p>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/book" className="admin-v2-btn-primary">
              <Plus className="h-4 w-4" />
              Uus broneering
            </Link>
            <Link href="/admin/slots" className="admin-v2-btn-primary">
              <Clock3 className="h-4 w-4" />
              Lisa aeg
            </Link>
            <Link href="/admin/products" className="admin-v2-btn-primary">
              <Package className="h-4 w-4" />
              Lisa toode
            </Link>
            <Link href="/admin/booking" className="admin-v2-btn-ghost border border-[#ead7e2] bg-white">
              Kampaania
            </Link>
            <Link href="/admin/bookings" className="admin-v2-btn-ghost border border-[#ead7e2] bg-white">
              Meeldetuletused
            </Link>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="admin-v2-surface p-5 lg:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="admin-v2-overline">Täna</p>
                <h3 className="text-xl font-semibold tracking-[-0.01em] text-[#2f2430]">Tänased broneeringud</h3>
              </div>
              <Link href="/admin/bookings?view=today" className="admin-v2-btn-secondary">
                Ava kõik
              </Link>
            </div>

            {!hasTodayBookings ? (
              <div className="rounded-2xl border border-dashed border-[#ebdce5] bg-[#fffafc] px-4 py-8 text-center text-sm text-[#7b6675]">
                Täna veel broneeringuid ei ole.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.todayBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/admin/bookings?edit=${booking.id}`}
                    className="block rounded-2xl border border-[#efe1ea] bg-white px-4 py-3 transition hover:border-[#e4cedb] hover:bg-[#fff7fb]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#2f2430]">{booking.clientName}</p>
                        <p className="truncate text-xs text-[#7b6674]">{booking.serviceName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-[#2f2430]">{booking.slotTime}</p>
                        <p className="text-[11px] text-[#9f8a99]">{booking.paymentStatus === 'paid' ? 'Makstud' : 'Tasumata'}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </article>

          <article className="admin-v2-surface p-5 lg:p-6">
            <div className="mb-4">
              <p className="admin-v2-overline">Täna</p>
              <h3 className="text-xl font-semibold tracking-[-0.01em] text-[#2f2430]">Kiire ülevaade</h3>
            </div>

            <div className="rounded-2xl border border-[#ecdee7] bg-white p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-[#8e7888]">
                <span>08:00</span>
                <span>20:00</span>
              </div>
              <div className="flex h-28 items-end gap-1.5">
                {todayTimeline.map((height, index) => (
                  <span
                    key={`tl-${index}`}
                    className="flex-1 rounded-t-md bg-[linear-gradient(180deg,#e8b8cc_0%,#c24d86_100%)] opacity-85"
                    style={{ height: `${height}%` }}
                    title={`Ajavahemik ${index + 1}`}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[#eedfe7] bg-[#fff8fb] px-3 py-2 text-sm text-[#5f4f5a]">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#b85c8a]" />
                  Täidetud päev
                </span>
                <span className="font-semibold">{stats.todayBookings.length} aega</span>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

