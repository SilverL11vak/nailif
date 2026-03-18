'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface AdminPageHeaderProps {
  /** Overline (e.g. "Sisu") */
  overline?: string;
  /** Main page title */
  title: string;
  /** Helper text under title */
  subtitle?: string;
  /** Back link href (e.g. /admin) */
  backHref?: string;
  /** Back link label */
  backLabel?: string;
  /** Primary CTA: { label, onClick } */
  primaryAction?: { label: string; onClick: () => void };
  /** Secondary links: { label, href } */
  secondaryLinks?: Array<{ label: string; href: string }>;
}

export function AdminPageHeader({
  overline,
  title,
  subtitle,
  backHref = '/admin',
  backLabel = 'Halduspaneel',
  primaryAction,
  secondaryLinks,
}: AdminPageHeaderProps) {
  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
      {/* Subtle top accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" aria-hidden />
      <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            {overline && (
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                {overline}
              </p>
            )}
            <h1 className="font-brand text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:gap-3">
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="order-first w-full rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 sm:order-none sm:w-auto"
              >
                {primaryAction.label}
              </button>
            )}
            {backHref && backLabel && (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                {backLabel}
              </Link>
            )}
            {secondaryLinks?.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

export default AdminPageHeader;
