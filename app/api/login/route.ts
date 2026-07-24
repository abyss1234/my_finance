import { NextResponse } from 'next/server';
import { authCookieName, createSessionCookieValue, sessionMaxAgeSeconds } from '@/lib/auth';
import { isSupportedPasswordHash, verifyPassword } from '@/lib/password';

type LoginBody = {
  password?: unknown;
};

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const passwordHash = process.env.APP_PASSWORD_HASH;
  if (!isSupportedPasswordHash(passwordHash) || !process.env.APP_SESSION_SECRET) {
    return NextResponse.json(
      { error: 'Authentication environment variables are not configured correctly' },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => null)) as LoginBody | null;
  const password = body?.password;
  if (
    typeof password !== 'string' ||
    password.length > 1024 ||
    !(await verifyPassword(password, passwordHash))
  ) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, await createSessionCookieValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionMaxAgeSeconds,
  });

  return response;
}
