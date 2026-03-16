import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';
import { AdminTodayTimeline } from '@/components/admin/AdminTodayTimeline';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { getAdminDashboardStats } from '@/lib/admin-dashboard';

const businessCards = [
  { title: 'Teenused', description: 'Hinnad, kestused, nahtavus', href: '/admin/services' },
  { title: 'Tooted', description: 'Pood, laoseis, pildid', href: '/admin/products' },
  { title: 'Galerii', description: 'Avalehe inspiratsioon', href: '/admin/gallery' },
  { title: 'Bookingu sisu', description: 'Mikrocopy ja sammud', href: '/admin/booking' },
  { title: 'Tellimused', description: 'Maksed ja staatused', href: '/admin/orders' },
  { title: 'Konto', description: 'Turvalisus ja profiil', href: '/admin/account' },
];

function statusLabel(status: string) {
  if (status === 'confirmed') return 'Kinnitatud';
  if (status === 'completed') return 'Lopetatud';
  if (status === 'cancelled') return 'Tuhistatud';
  if (status === 'pending_payment') return 'Makse ootel';
  return status;
}

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
  const bookingTrendPrefix = stats.bookingChangeVsLastWeek >= 0 ? '+' : '';

  return (
    <main className="admin-cockpit-bg px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <header className="admin-cockpit-shell mb-6 rounded-[28px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">Nailify Super Admin</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[#111827]">Command Deck</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#4b5563]">
                Tere {displayName}. Tana on {todayLabel}. Paneel on ules ehitatud paevase too tempo jargi: operatsioonid, ajakava, ari.
              </p>
            </div>
            <AdminLogoutButton />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#d1d5db] bg-white px-3 py-1 text-xs text-[#374151]">
              Broneeringud tana: {stats.todayBookings.length}
            </span>
            <span className="rounded-full border border-[#d1d5db] bg-white px-3 py-1 text-xs text-[#374151]">
              Vabad ajad tana: {stats.freeSlotsToday}
            </span>
            <span className="rounded-full border border-[#d1d5db] bg-white px-3 py-1 text-xs text-[#374151]">
              SOS ajad: {stats.sosSlotsToday}
            </span>
            <span className="rounded-full border border-[#d1d5db] bg-white px-3 py-1 text-xs text-[#374151]">
              Kaive tana: EUR {stats.revenueToday}
            </span>
            <span className="rounded-full border border-[#d1d5db] bg-white px-3 py-1 text-xs text-[#374151]">
              Trend: {bookingTrendPrefix}
              {stats.bookingChangeVsLastWeek}
            </span>
          </div>
        </header>

        <AdminQuickActions />

        <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="space-y-4">
            <article className="admin-panel rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Operatsioonid tana</p>
              <div className="mt-3 space-y-2 text-sm">
                <Link
                  href="/admin/bookings?view=today"
                  className="flex items-center justify-between rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-[#374151]"
                >
                  <span>Tanased broneeringud</span>
                  <span className="font-semibold">{stats.todayBookings.length}</span>
                </Link>
                <Link
                  href="/admin/slots"
                  className="flex items-center justify-between rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-[#374151]"
                >
                  <span>Kalendri juhtimine</span>
                  <span className="text-xs uppercase text-[#6b7280]">Ava</span>
                </Link>
                <Link
                  href="/admin/orders"
                  className="flex items-center justify-between rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-[#374151]"
                >
                  <span>Maksed</span>
                  <span className="font-semibold">{stats.orders}</span>
                </Link>
              </div>
            </article>

            <article className="admin-panel rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Kiired soovitused</p>
              <div className="mt-3 space-y-2 text-sm text-[#374151]">
                <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="font-medium">Jargmine vaba aeg</p>
                  <p className="text-xs text-[#6b7280]">
                    {stats.nextFreeSlot?.slotDate || '-'} {stats.nextFreeSlot?.slotTime || ''}
                  </p>
                </div>
                <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="font-medium">Jargmine SOS aeg</p>
                  <p className="text-xs text-[#6b7280]">
                    {stats.nextSosSlot?.slotDate || '-'} {stats.nextSosSlot?.slotTime || ''}
                  </p>
                </div>
                <Link
                  href={
                    stats.nextFreeSlot
                      ? `/admin/slots?action=sos&date=${encodeURIComponent(stats.nextFreeSlot.slotDate)}&time=${encodeURIComponent(stats.nextFreeSlot.slotTime)}`
                      : '/admin/slots?action=sos'
                  }
                  className="block rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-center font-semibold text-[#374151]"
                >
                  Margi jargmine aeg SOS-iks
                </Link>
              </div>
            </article>
          </aside>

          <div className="space-y-4">
            <AdminTodayTimeline items={stats.todayBookings} />

            <section className="admin-panel rounded-3xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#111827]">Ari ja sisu moodulid</h2>
                <p className="text-xs text-[#6b7280]">Core haldus</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {businessCards.map((card) => (
                  <Link key={card.href} href={card.href} className="admin-action-tile rounded-2xl p-4">
                    <h3 className="text-base font-semibold text-[#111827]">{card.title}</h3>
                    <p className="mt-1 text-sm text-[#4b5563]">{card.description}</p>
                    <span className="mt-3 inline-block text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                      Ava vaade
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <article className="admin-panel rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Jargmine klient</p>
              {stats.nextBooking ? (
                <div className="mt-3">
                  <p className="text-base font-semibold text-[#111827]">{stats.nextBooking.clientName}</p>
                  <p className="text-sm text-[#4b5563]">{stats.nextBooking.serviceName}</p>
                  <p className="mt-1 text-sm text-[#374151]">
                    {stats.nextBooking.slotDate} kell {stats.nextBooking.slotTime}
                  </p>
                  <span className="mt-2 inline-flex rounded-full border border-[#d1d5db] bg-white px-2 py-1 text-xs text-[#4b5563]">
                    {statusLabel(stats.nextBooking.status)}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#6b7280]">Broneeringud puuduvad.</p>
              )}
            </article>

            <article className="admin-panel rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Finantsplokk</p>
              <div className="mt-3 grid gap-2">
                <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="text-xs text-[#6b7280]">Kaive tana</p>
                  <p className="text-lg font-semibold text-[#111827]">EUR {stats.revenueToday}</p>
                </div>
                <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="text-xs text-[#6b7280]">Kaive nadal</p>
                  <p className="text-lg font-semibold text-[#111827]">EUR {stats.revenueThisWeek}</p>
                </div>
                <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="text-xs text-[#6b7280]">Broneeringute trend</p>
                  <p className="text-lg font-semibold text-[#111827]">
                    {bookingTrendPrefix}
                    {stats.bookingChangeVsLastWeek}
                  </p>
                </div>
              </div>
            </article>

            <article className="admin-panel rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Susteemi maht</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="text-xs text-[#6b7280]">Teenused</p>
                  <p className="font-semibold text-[#111827]">{stats.services}</p>
                </div>
                <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="text-xs text-[#6b7280]">Tooted</p>
                  <p className="font-semibold text-[#111827]">{stats.products}</p>
                </div>
                <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="text-xs text-[#6b7280]">Broneeringud</p>
                  <p className="font-semibold text-[#111827]">{stats.bookings}</p>
                </div>
                <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="text-xs text-[#6b7280]">Vabad (7 p)</p>
                  <p className="font-semibold text-[#111827]">{stats.availableSlotsNext7Days}</p>
                </div>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
