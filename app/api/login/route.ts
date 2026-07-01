import { NextResponse } from 'next/server';
import { authCookieName, authCookieValue } from '@/lib/auth';

type LoginBody = {
  password?: unknown;
};

export async function POST(req: Request) {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    return NextResponse.json({ error: 'APP_PASSWORD is not configured' }, { status: 500 });
  }

  const body = (await req.json()) as LoginBody;
  if (body.password !== appPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, authCookieValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
