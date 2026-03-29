'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  Clock3,
  Gem,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  Package,
  UserSquare2,
  Users,
  X,
} from 'lucide-react';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';
import { AdminSearch } from '@/components/admin/AdminSearch';

type AdminShellProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: '/admin', label: 'Ülevaade', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Broneeringud', icon: CalendarDays },
  { href: '/admin/slots', label: 'Vabad ajad', icon: Clock3 },
  { href: '/admin/services', label: 'Teenused', icon: Gem },
  { href: '/admin/products', label: 'Tooted', icon: Package },
  { href: '/admin/customers', label: 'Kliendid', icon: Users },
  { href: '/admin/gallery', label: 'Galerii', icon: ImageIcon },
  { href: '/admin/team', label: 'Tiim', icon: UserSquare2 },
  { href: '/admin/analytics', label: 'Analüütika', icon: BarChart3 },
  { href: '/admin/account', label: 'Seaded', icon: UserSquare2 },
] as const;

const titleMap: Record<string, string> = {
  '/admin': 'Ülevaade',
  '/admin/bookings': 'Broneeringud',
  '/admin/slots': 'Vabad ajad',
  '/admin/services': 'Teenused',
  '/admin/products': 'Tooted',
  '/admin/customers': 'Kliendid',
  '/admin/gallery': 'Galerii',
  '/admin/team': 'Tiim',
  '/admin/analytics': 'Analüütika',
  '/admin/account': 'Seaded',
  '/admin/feedback': 'Tagasiside',
  '/admin/tools': 'Tööriistad',
  '/admin/booking': 'Broneerimise sisu',
  '/admin/orders': 'Tellimused',
};

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveTitle(pathname: string) {
  const exact = titleMap[pathname];
  if (exact) return exact;
  const match = Object.entries(titleMap).find(([key]) => key !== '/admin' && pathname.startsWith(`${key}/`));
  return match?.[1] ?? 'Halduspaneel';
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pageTitle = resolveTitle(pathname);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="admin-app-shell">
      <aside className={`admin-app-sidebar ${mobileMenuOpen ? 'is-open' : ''}`}>
        <div className="admin-app-sidebar-head">
          <Link href="/admin" className="font-brand text-[2rem] font-semibold leading-none tracking-[-0.02em] text-[#bf4f84]">
            Nailify
          </Link>
          <p className="mt-1 text-xs text-[#8a7583]">Halduspaneel</p>
        </div>

        <nav className="admin-app-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`admin-app-nav-item ${isActive(pathname, item.href) ? 'is-active' : ''}`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.9} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-app-sidebar-foot">
          <Link href="/admin/booking" className="admin-app-link-chip">
            Broneerimise tekstid
          </Link>
          <Link href="/admin/tools" className="admin-app-link-chip">
            Tööriistad
          </Link>
          <Link href="/" className="admin-app-link-chip">
            Ava veebileht
          </Link>
        </div>
      </aside>

      <div className="admin-app-main">
        <header className="admin-app-topbar">
          <button
            type="button"
            className="admin-app-mobile-toggle lg:hidden"
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-label={mobileMenuOpen ? 'Sulge menüü' : 'Ava menüü'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8392]">Nailify admin</p>
            <h1 className="truncate text-xl font-semibold tracking-[-0.01em] text-[#2f2430]">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <AdminSearch />
            <AdminLogoutButton />
          </div>
        </header>

        <div className="admin-app-content">{children}</div>
      </div>
    </div>
  );
}

export default AdminShell;
