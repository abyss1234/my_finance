'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        router.replace(searchParams.get('next') || '/');
        router.refresh();
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
    <form className="card w-full p-5" onSubmit={submit}>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-zinc-900">Login</h2>
        <p className="text-sm text-zinc-500">Enter your app password to continue.</p>
      </div>

      <label className="label">Password</label>
      <input
        className="input"
        type="password"
        autoFocus
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button className="btn" disabled={isLoading}>
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
