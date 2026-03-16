export type LocaleCode = 'et' | 'en';

export const LOCALES: LocaleCode[] = ['et', 'en'];
export const DEFAULT_LOCALE: LocaleCode = 'et';
export const LOCALE_COOKIE = 'nailify_locale';

export function isLocale(value: string | null | undefined): value is LocaleCode {
  return value === 'et' || value === 'en';
}

export function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') return '/';
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

export function getLocaleFromPathname(pathname: string): LocaleCode | null {
  const normalized = normalizePathname(pathname);
  const firstSegment = normalized.split('/').filter(Boolean)[0] ?? '';
  return isLocale(firstSegment) ? firstSegment : null;
}

export function stripLocalePrefix(pathname: string) {
  const normalized = normalizePathname(pathname);
  const locale = getLocaleFromPathname(normalized);
  if (!locale) return normalized;
  const stripped = normalized.replace(new RegExp(`^/${locale}`), '');
  return stripped.length > 0 ? stripped : '/';
}

export function withLocale(pathname: string, locale: LocaleCode) {
  const stripped = stripLocalePrefix(pathname);
  if (stripped === '/') return `/${locale}`;
  return `/${locale}${stripped}`;
}
