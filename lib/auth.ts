export const authCookieName = 'myfinance_auth';

export function isAuthConfigured() {
  return Boolean(process.env.APP_PASSWORD);
}

export function authCookieValue() {
  return process.env.APP_SESSION_SECRET || process.env.APP_PASSWORD || '';
}

export function isValidMacroDroidKey(value: string | null) {
  const expectedKey = process.env.MACRODROID_API_KEY;
  if (!expectedKey) return false;

  return value === expectedKey;
}
