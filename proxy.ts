import { NextRequest, NextResponse } from 'next/server';
import {
  authCookieName,
  authCookieValue,
  isAuthConfigured,
  isValidMacroDroidKey,
} from '@/lib/auth';

const publicPaths = ['/login', '/api/login', '/api/logout'];

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = req.cookies.get(authCookieName)?.value;
  const isLoggedIn = isAuthConfigured() && session === authCookieValue();

  if (pathname === '/api/macrodroid' || pathname.startsWith('/api/macrodroid/')) {
    if (isLoggedIn || isValidMacroDroidKey(req.headers.get('x-api-key'))) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: 'Invalid MacroDroid API key' }, { status: 401 });
  }

  if (!isAuthConfigured() || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (isLoggedIn) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
