import { sessionMaxAgeSeconds } from '@/lib/session';

export { sessionMaxAgeSeconds };

export const authCookieName = 'myfinance_auth';

export function isAuthConfigured() {
  return Boolean(process.env.APP_PASSWORD_HASH && process.env.APP_SESSION_SECRET);
}

function sessionSecret() {
  return process.env.APP_SESSION_SECRET || '';
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function equalSignature(left: string, right: string) {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(sessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toHex(signature);
}

export async function createSessionCookieValue() {
  const expiresAt = Date.now() + sessionMaxAgeSeconds * 1000;
  return `${expiresAt}.${await sign(String(expiresAt))}`;
}

export async function isValidSessionCookie(value: string | undefined) {
  if (!value || !sessionSecret()) return false;

  const [rawExpiresAt, signature] = value.split('.');
  const expiresAt = Number(rawExpiresAt);

  if (!Number.isFinite(expiresAt) || !signature || expiresAt <= Date.now()) {
    return false;
  }

  return equalSignature(signature, await sign(rawExpiresAt));
}

export function isValidMacroDroidKey(value: string | null) {
  const expectedKey = process.env.MACRODROID_API_KEY;
  if (!expectedKey) return false;

  return value === expectedKey;
}
