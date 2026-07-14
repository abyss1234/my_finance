'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/apiClient';

type MacroDroidReceipt = {
  id: number;
  receivedAt: string;
  app: string | null;
  title: string | null;
  text: string;
  phoneTime: string | null;
};

function formatReceivedAt(value: string) {
  return new Date(value).toLocaleString('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

export default function ReceiptsPage() {
  const { data: receipts, error, isLoading, isValidating, mutate } =
    useSWR<MacroDroidReceipt[]>('/api/receipts', fetcher);

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Phone Receipts</h2>
          <p className="text-sm text-zinc-600">
            The latest requests received from MacroDroid.
          </p>
        </div>
        <button className="btn" disabled={isValidating} onClick={() => mutate()}>
          {isValidating ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load phone receipts.
        </div>
      )}

      {isLoading ? (
        <div className="card p-4 text-sm text-zinc-500">Loading...</div>
      ) : (
        <section className="card divide-y divide-zinc-100 overflow-hidden">
          {(receipts ?? []).map((receipt) => (
            <article key={receipt.id} className="space-y-2 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {receipt.app ?? 'Unknown app'}
                  </div>
                  <div className="text-sm text-zinc-600">
                    {receipt.title ?? 'No title'}
                  </div>
                </div>
                <time className="shrink-0 text-xs text-zinc-500" dateTime={receipt.receivedAt}>
                  {formatReceivedAt(receipt.receivedAt)}
                </time>
              </div>
              <p className="whitespace-pre-wrap wrap-break-word text-sm text-zinc-800">
                {receipt.text || '(No text)'}
              </p>
              {receipt.phoneTime && (
                <div className="text-xs text-zinc-500">Phone time: {receipt.phoneTime}</div>
              )}
            </article>
          ))}

          {!error && receipts?.length === 0 && (
            <div className="p-6 text-center text-sm text-zinc-500">
              No MacroDroid requests received yet.
            </div>
          )}
        </section>
      )}
    </main>
  );
}
