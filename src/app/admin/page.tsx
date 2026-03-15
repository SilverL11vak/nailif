import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';
import { getAdminDashboardStats } from '@/lib/admin-dashboard';

const cards = [
  {
    title: 'Teenused',
    description: 'Muuda teenuste nimesid, hindu, kestust ja nähtavust.',
    href: '/admin/services',
  },
  {
    title: 'Tooted',
    description: 'Halda e-poe tooteid, laoseisu ja tootepilte.',
    href: '/admin/products',
  },
  {
    title: 'Broneeringud',
    description: 'Vaata tänaseid kliente, kinnita või tühista külastus.',
    href: '/admin/bookings',
  },
  {
    title: 'Vabad ajad',
    description: 'Halda kalendrit ja määra veebis nähtavad ajad.',
    href: '/admin/slots',
  },
  {
    title: 'Tellimused',
    description: 'Jälgi Stripe makseid ja ettemaksu tellimusi.',
    href: '/admin/orders',
  },
  {
    title: 'Galerii',
    description: 'Laadi pilte üles, sorteeri ja märgi esile tõstetud foto.',
    href: '/admin/gallery',
  },
  {
    title: 'Konto',
    description: 'Muuda nime, turvaseadeid ja parooli.',
    href: '/admin/account',
  },
];

function statusLabel(status: string) {
  if (status === 'confirmed') return 'Kinnitatud';
  if (status === 'cancelled') return 'Tühistatud';
  if (status === 'pending_payment') return 'Ootel';
  return status;
}

export default async function AdminHomePage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect('/admin/login');
  }

  const stats = await getAdminDashboardStats();
  const displayName = admin.name?.trim() || 'Sandra';
  const todayCount = stats.todayBookings.length;
  const bookingTrendPrefix = stats.bookingChangeVsLastWeek >= 0 ? '+' : '';

  return (
    <main className="admin-shell min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff4fa_36%,_#f8edf5_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="admin-header mb-6 rounded-3xl border border-[#e8e2dc] bg-white/90 p-6 shadow-[0_28px_42px_-34px_rgba(57,45,39,0.42)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#b983a2]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#2f2230]">Halduspaneel</h1>
              <p className="mt-2 text-sm text-[#6f5a6a]">Tere {displayName} 👋 Täna on {todayCount} broneeringut.</p>
            </div>
            <AdminLogoutButton />
          </div>
        </header>

        <AdminQuickActions />

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
          <article className="admin-surface-soft rounded-3xl border border-[#e8e0d9] bg-[linear-gradient(165deg,#fff_0%,#fbf7f2_100%)] p-5 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.28)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[#a17495]">Järgmine broneering</p>
            {stats.nextBooking ? (
              <div className="mt-3">
                <p className="text-lg font-semibold text-[#2f2230]">{stats.nextBooking.clientName}</p>
                <p className="text-sm text-[#6f5a6a]">{stats.nextBooking.serviceName}</p>
                <p className="mt-1 text-sm font-medium text-[#8e5e7e]">
                  {stats.nextBooking.slotDate} kell {stats.nextBooking.slotTime}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-[#f6e7f1] px-2.5 py-1 text-xs text-[#7d556f]">
                  {statusLabel(stats.nextBooking.status)}
                </span>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#7f6979]">Broneeringud puuduvad.</p>
            )}
          </article>

          <article className="admin-surface rounded-3xl border border-[#ece3db] bg-white/95 p-5 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[#a17495]">Täna ajajoon</p>
            <div className="mt-3 space-y-2">
              {stats.todayBookings.length === 0 && <p className="text-sm text-[#7f6979]">Täna pole broneeringuid.</p>}
              {stats.todayBookings.slice(0, 4).map((booking) => (
                <div key={booking.id} className="rounded-xl bg-[#f7f4ff] px-3 py-2">
                  <p className="text-sm font-medium text-[#3a2b37]">
                    {booking.slotTime} · {booking.clientName}
                  </p>
                  <p className="text-xs text-[#7f6979]">{booking.serviceName}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="admin-surface rounded-3xl border border-[#ece3db] bg-white/95 p-5 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[#a17495]">Vabad ajad täna</p>
            <p className="mt-2 text-4xl font-semibold text-[#2f2230]">{stats.freeSlotsToday}</p>
            <p className="mt-1 text-sm text-[#7f6979]">Kalendrist hallatavad vabad ajad.</p>
            <p className="mt-2 rounded-xl bg-[#f6f2ec] px-3 py-2 text-sm text-[#63564d]">
              Järgmine vaba aeg: <span className="font-semibold">{stats.nextFreeSlot ? stats.nextFreeSlot.slotTime : 'Puudub'}</span>
            </p>
            <p className="mt-2 rounded-xl bg-[#f3f2ff] px-3 py-2 text-sm text-[#5b587f]">
              SOS ajad täna: <span className="font-semibold">{stats.sosSlotsToday}</span>
            </p>
            <p className="mt-2 text-xs text-[#8d6c81]">
              Järgmine SOS aeg:{' '}
              <span className="font-semibold">{stats.nextSosSlot ? stats.nextSosSlot.slotTime : 'Puudub'}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/admin/slots"
                className="inline-flex rounded-xl border border-[#e5ddd3] bg-[#fffaf3] px-3 py-2 text-sm font-medium text-[#5e5148]"
              >
                Ava kalender
              </Link>
              <Link
                href={
                  stats.nextFreeSlot
                    ? `/admin/slots?action=sos&date=${encodeURIComponent(stats.nextFreeSlot.slotDate)}&time=${encodeURIComponent(stats.nextFreeSlot.slotTime)}`
                    : '/admin/slots?action=sos'
                }
                className="inline-flex rounded-xl border border-[#ddd8ec] bg-[#f6f4ff] px-3 py-2 text-sm font-medium text-[#575078]"
              >
                Märgi järgmine aeg SOS-iks
              </Link>
            </div>
          </article>
        </section>

        <section className="admin-surface rounded-3xl mb-6 border border-[#ece3db] bg-white/95 p-5 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[#a17495]">Käibe ülevaade</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f6f2ec] p-4">
              <p className="text-xs text-[#8e7090]">Täna</p>
              <p className="mt-1 text-2xl font-semibold text-[#2f2230]">EUR {stats.revenueToday}</p>
            </div>
            <div className="rounded-2xl bg-[#f3f2ff] p-4">
              <p className="text-xs text-[#8e7090]">See nädal</p>
              <p className="mt-1 text-2xl font-semibold text-[#2f2230]">EUR {stats.revenueThisWeek}</p>
            </div>
            <div className="rounded-2xl bg-[#f9f5ef] p-4">
              <p className="text-xs text-[#8e7090]">Broneeringud vs eelmine nädal</p>
              <p className="mt-1 text-2xl font-semibold text-[#2f2230]">
                {bookingTrendPrefix}
                {stats.bookingChangeVsLastWeek}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-[#ecd8e4] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#9b7f94]">Teenused</p>
            <p className="mt-1 text-2xl font-semibold text-[#2f2230]">{stats.services}</p>
          </div>
          <div className="rounded-2xl border border-[#ecd8e4] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#9b7f94]">Tooted</p>
            <p className="mt-1 text-2xl font-semibold text-[#2f2230]">{stats.products}</p>
          </div>
          <div className="rounded-2xl border border-[#ecd8e4] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#9b7f94]">Broneeringud</p>
            <p className="mt-1 text-2xl font-semibold text-[#2f2230]">{stats.bookings}</p>
          </div>
          <div className="rounded-2xl border border-[#ecd8e4] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#9b7f94]">Tellimused</p>
            <p className="mt-1 text-2xl font-semibold text-[#2f2230]">{stats.orders}</p>
          </div>
          <div className="rounded-2xl border border-[#ecd8e4] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#9b7f94]">Vabad ajad (7p)</p>
            <p className="mt-1 text-2xl font-semibold text-[#2f2230]">{stats.availableSlotsNext7Days}</p>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="admin-surface rounded-3xl border border-[#ece3db] bg-white/95 p-5 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_30px_42px_-30px_rgba(70,56,44,0.44)]"
            >
              <h2 className="text-lg font-semibold text-[#2f2230]">{card.title}</h2>
              <p className="mt-2 text-sm text-[#6f5a6a]">{card.description}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-[#b05387]">Ava vaade</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
