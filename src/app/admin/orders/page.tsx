import Link from 'next/link';
import { ensureOrdersTable, listOrders } from '@/lib/orders';
import { redirect } from 'next/navigation';
import { getAdminFromCookies } from '@/lib/admin-auth';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect('/admin/login');
  }

  await ensureOrdersTable();
  const orders = await listOrders(200);

  return (
    <main className="admin-shell min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff4fa_40%,_#f7ecf4_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="admin-header mb-6 rounded-3xl border border-[#e8e2dc] bg-white/90 p-6 shadow-[0_28px_42px_-34px_rgba(57,45,39,0.42)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#b983a2]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#2f2230]">Tellimused</h1>
              <p className="mt-2 text-sm text-[#6f5d53]">Stripe maksed ja broneeringute ettetasud.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-[#6f5d53]" href="/admin">
                Halduspaneel
              </Link>
              <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-[#6f5d53]" href="/admin/account">
                Konto
              </Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        <section className="admin-surface overflow-hidden rounded-3xl border border-[#ece3db] bg-white/95 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f6f2ec] text-[#5d5148]">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Tüüp</th>
                  <th className="px-4 py-3 font-medium">Staatus</th>
                  <th className="px-4 py-3 font-medium">Summa</th>
                  <th className="px-4 py-3 font-medium">Klient</th>
                  <th className="px-4 py-3 font-medium">Loodud</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#8a7367]">
                      Tellimused puuduvad.
                    </td>
                  </tr>
                )}
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-[#f1e7e1] text-[#3b2f28]">
                    <td className="px-4 py-3">{order.id}</td>
                    <td className="px-4 py-3">{order.orderType}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#f1eff7] px-2.5 py-1 text-xs text-[#5e5c7f]">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">EUR {order.amountTotal}</td>
                    <td className="px-4 py-3">
                      {order.customerName || '-'}
                      <div className="text-xs text-[#8a7367]">{order.customerEmail || '-'}</div>
                    </td>
                    <td className="px-4 py-3">{new Date(order.createdAt).toLocaleString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
