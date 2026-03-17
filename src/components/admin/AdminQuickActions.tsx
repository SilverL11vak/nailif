import Link from 'next/link';

const quickActions = [
  { label: 'Broneeringud', hint: 'Vaata ja halda broneeringuid', href: '/admin/bookings' },
  { label: 'Vabad ajad', hint: 'Lisa või muuda aegu', href: '/admin/slots' },
  { label: 'Broneerimise tekstid', hint: 'Tekstid ja lisateenused', href: '/admin/booking' },
  { label: 'Avaleht', hint: 'Vaata avalehte', href: '/' },
];

export function AdminQuickActions() {
  return (
    <section className="admin-panel mb-6 p-4">
      <p className="mb-3 type-small admin-muted">Kiirlingid</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="admin-action-tile p-3">
            <span className="block font-semibold admin-heading">{action.label}</span>
            <span className="mt-0.5 block text-xs admin-muted">{action.hint}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default AdminQuickActions;
