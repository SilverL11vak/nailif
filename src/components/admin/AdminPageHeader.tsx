'use client';

import Link from 'next/link';

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
    <header className="admin-cockpit-shell mb-6 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          {overline && (
            <p className="admin-section-overline mb-1">{overline}</p>
          )}
          <h1 className="type-h2 font-brand admin-heading">{title}</h1>
          {subtitle && (
            <p className="type-small admin-muted mt-1.5 max-w-xl">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="btn-primary btn-primary-md"
            >
              {primaryAction.label}
            </button>
          )}
          {backHref && (
            <Link href={backHref} className="btn-secondary btn-secondary-md">
              {backLabel}
            </Link>
          )}
          {secondaryLinks?.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="btn-secondary btn-secondary-md"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

export default AdminPageHeader;
