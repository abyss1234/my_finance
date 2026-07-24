import { NextRequest, NextResponse } from 'next/server';
import {
  authCookieName,
  createSessionCookieValue,
  isAuthConfigured,
  isValidSessionCookie,
  isValidMacroDroidKey,
  sessionMaxAgeSeconds,
} from '@/lib/auth';

const publicPaths = ['/login', '/api/login', '/api/logout'];

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

async function refreshSession(response: NextResponse) {
  response.cookies.set(authCookieName, await createSessionCookieValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionMaxAgeSeconds,
  });

  return response;
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = req.cookies.get(authCookieName)?.value;
  const isLoggedIn = isAuthConfigured() && (await isValidSessionCookie(session));

  if (pathname === '/api/macrodroid' || pathname.startsWith('/api/macrodroid/')) {
    if (isLoggedIn) {
      return refreshSession(NextResponse.next());
    }

    if (isValidMacroDroidKey(req.headers.get('x-api-key'))) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: 'Invalid MacroDroid API key' }, { status: 401 });
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthConfigured()) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication is not configured' }, { status: 503 });
    }

    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    loginUrl.searchParams.set('error', 'configuration');
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn) {
    return refreshSession(NextResponse.next());
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
