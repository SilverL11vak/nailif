import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  DEFAULT_LOCALE,
  getLocaleFromPathname,
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

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    if (isPublicAsset(pathname)) {
      return NextResponse.next();
    }

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

    const localeInPath = getLocaleFromPathname(pathname);
    if (localeInPath) {
      return NextResponse.next();
    }

    const localizedPath = withLocale(stripLocalePrefix(pathname), DEFAULT_LOCALE);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = localizedPath;
    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  // Exclude all _next (static, chunks, webpack, react-refresh, etc.) to avoid 500s on asset requests
  matcher: ['/((?!_next).*)'],
};
