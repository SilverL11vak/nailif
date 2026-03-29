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
    <header className="admin-v2-surface mb-8 overflow-hidden">
      <div className="h-px w-full bg-gradient-to-r from-[#ead8e3] via-[#f2e8ee] to-transparent" aria-hidden />
      <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-7 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            {overline && (
              <p className="admin-v2-overline mb-2">
                {overline}
              </p>
            )}
            <h1 className="admin-v2-title">
              {title}
            </h1>
            {subtitle && (
              <p className="admin-v2-subtitle mt-2">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:gap-3">
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="admin-v2-btn-primary order-first w-full sm:order-none sm:w-auto"
              >
                {primaryAction.label}
              </button>
            )}
            {backHref && backLabel && (
              <Link
                href={backHref}
                className="admin-v2-btn-secondary"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                {backLabel}
              </Link>
            )}
            {secondaryLinks?.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="admin-v2-btn-ghost"
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
