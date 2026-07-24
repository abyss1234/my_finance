'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LogIn } from 'lucide-react';

function getSafeNextPath(next: string | null) {
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/';
}

function LoginForm() {
  const searchParams = useSearchParams();
  const hasConfigurationError = searchParams.get('error') === 'configuration';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        window.location.replace(getSafeNextPath(searchParams.get('next')));
        return;
      }

      const body = await response.json().catch(() => null);
      setError(body?.error ?? 'Login failed.');
    } catch {
      setError('Login failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="card w-full p-5 sm:p-6" onSubmit={submit}>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-zinc-900">Login</h2>
        <p className="text-sm text-zinc-500">Enter your app password to continue.</p>
      </div>

      {hasConfigurationError && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Authentication is not configured. Set APP_PASSWORD_HASH and APP_SESSION_SECRET.
        </div>
      )}

      <label className="label" htmlFor="login-password">
        Password
      </label>
      <input
        id="login-password"
        className="input"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button className="btn border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800" disabled={isLoading}>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {isLoading ? 'Checking...' : 'Login'}
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md items-center">
      <Suspense fallback={<div className="card w-full p-5 text-sm text-zinc-500">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
