import Link from 'next/link';

const quickActions = [
  { label: 'Ava broneeringu vorm', hint: 'Kliendivaate kontroll', href: '/book' },
  { label: 'Halda vabu aegu', hint: 'Kalender ja SOS', href: '/admin/slots' },
  { label: 'Lisa uus toode', hint: 'Pood ja laoseis', href: '/admin/products?action=new' },
  { label: 'Muuda bookingu tekste', hint: 'Mikrocopy ja juhised', href: '/admin/booking' },
];

export function AdminQuickActions() {
  return (
    <section className="admin-cockpit-shell sticky top-4 z-20 mb-6 rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.16em] text-[#6b7280]">Kiirtegevused</p>
        <span className="text-xs text-[#9ca3af]">Igapaevased toimingud</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="admin-action-tile rounded-2xl p-3">
            <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm font-semibold text-[#111827]">
              {action.label}
            </div>
            <p className="mt-2 text-xs text-[#6b7280]">{action.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default AdminQuickActions;
