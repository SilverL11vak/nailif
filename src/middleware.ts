import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  DEFAULT_LOCALE,
  getLocaleFromPathname,
  isLocale,
  LOCALE_COOKIE,
  stripLocalePrefix,
  withLocale,
} from '@/lib/i18n/locale-path';

const ADMIN_SESSION_COOKIE = 'nailify_admin_session';

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/sitemap') ||
    pathname.startsWith('/robots') ||
    pathname.includes('.') ||
    pathname.startsWith('/api')
  );
}

function preferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  const localeInPath = getLocaleFromPathname(pathname);
  if (localeInPath) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, localeInPath, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  const locale = preferredLocale(request);
  const localizedPath = withLocale(stripLocalePrefix(pathname), locale);
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = localizedPath;
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
