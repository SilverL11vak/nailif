import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { ensureOrdersTable, listOrders } from '@/lib/orders';

export const dynamic = 'force-dynamic';

function orderTypeLabel(orderType: string) {
  if (orderType === 'booking_deposit') return 'Broneeringu ettemaks';
  if (orderType === 'product') return 'Toote ost';
  if (orderType === 'mixed') return 'Segakorv';
  return orderType;
}

function orderStatusMeta(status: string) {
  if (status === 'paid' || status === 'succeeded') {
    return { label: 'Makstud', className: 'bg-emerald-100 text-emerald-700' };
  }
  if (status === 'pending' || status === 'requires_payment_method') {
    return { label: 'Ootel', className: 'bg-amber-100 text-amber-700' };
  }
  if (status === 'refunded') {
    return { label: 'Tagastatud', className: 'bg-slate-100 text-slate-700' };
  }
  if (status === 'failed' || status === 'canceled') {
    return { label: 'Ebaonnestunud', className: 'bg-rose-100 text-rose-700' };
  }
  return { label: status, className: 'bg-[#f1eff7] text-[#5e5c7f]' };
}

export default async function AdminOrdersPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect('/admin/login');
  }

  await ensureOrdersTable();
  const orders = await listOrders(200);

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6b7280]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#111827]">Tellimused</h1>
              <p className="mt-2 text-sm text-[#4b5563]">Stripe maksed ja broneeringute ettemaksud.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563]" href="/admin">
                Halduspaneel
              </Link>
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563]" href="/admin/account">
                Konto
              </Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        <section className="admin-surface overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white/95 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f6f2ec] text-[#5d5148]">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Tuup</th>
                  <th className="px-4 py-3 font-medium">Staatus</th>
                  <th className="px-4 py-3 font-medium">Summa</th>
                  <th className="px-4 py-3 font-medium">Klient</th>
                  <th className="px-4 py-3 font-medium">Loodud</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#6b7280]">
                      Tellimused puuduvad.
                    </td>
                  </tr>
                )}
                {orders.map((order) => {
                  const statusMeta = orderStatusMeta(order.status);
                  return (
                    <tr key={order.id} className="border-t border-[#f1e7e1] text-[#3b2f28]">
                      <td className="px-4 py-3">{order.id}</td>
                      <td className="px-4 py-3">{orderTypeLabel(order.orderType)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">EUR {order.amountTotal}</td>
                      <td className="px-4 py-3">
                        {order.customerName || '-'}
                        <div className="text-xs text-[#6b7280]">{order.customerEmail || '-'}</div>
                      </td>
                      <td className="px-4 py-3">{new Date(order.createdAt).toLocaleString('et-EE')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
