import Link from 'next/link';

const quickActions = [
  { label: 'Lisa broneering', href: '/book' },
  { label: 'Blokeeri aeg', href: '/admin/slots?action=block' },
  { label: 'Lisa toode', href: '/admin/products?action=new' },
  { label: 'Muuda hinda', href: '/admin/services?action=price' },
];

export function AdminQuickActions() {
  return (
    <section className="sticky top-4 z-20 mb-6 rounded-2xl border border-[#e8e0d9] bg-white/82 p-3 shadow-[0_18px_36px_-28px_rgba(72,56,45,0.35)] backdrop-blur-xl">
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action, index) => (
          <Link
            key={action.href}
            href={action.href}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 ${
              index % 3 === 0
                ? 'border-[#e5ddd3] bg-[#fffaf3] text-[#5f4f43] hover:shadow-[0_14px_24px_-20px_rgba(88,67,52,0.5)]'
                : index % 3 === 1
                  ? 'border-[#e6dce5] bg-[#fff7fc] text-[#5f4354] hover:shadow-[0_14px_24px_-20px_rgba(96,58,84,0.45)]'
                  : 'border-[#dee2ec] bg-[#f8faff] text-[#454f67] hover:shadow-[0_14px_24px_-20px_rgba(66,86,124,0.35)]'
            }`}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default AdminQuickActions;
