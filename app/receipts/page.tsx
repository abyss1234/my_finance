'use client';

import useSWR from 'swr';
import { RefreshCw, Smartphone } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { fetcher } from '@/lib/apiClient';
import { formatMalaysiaDate, formatMalaysiaTime } from '@/lib/finance';

type MacroDroidReceipt = {
  id: number;
  receivedAt: string;
  app: string | null;
  title: string | null;
  text: string;
  phoneTime: string | null;
};

function PhoneTime({ value }: { value: string }) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return <span>{value}</span>;

  return (
    <span>
      <span className="block">{formatMalaysiaDate(timestamp)}</span>
      <span className="block">{formatMalaysiaTime(timestamp)}</span>
    </span>
  );
}

export default function ReceiptsPage() {
  const { data: receipts, error, isLoading, isValidating, mutate } =
    useSWR<MacroDroidReceipt[]>('/api/receipts', fetcher);

  return (
    <main className="min-w-0 space-y-5">
      <PageHeader
        title="Macro Logs"
        description="The latest requests received from MacroDroid."
        actions={
          <button className="btn" disabled={isValidating} onClick={() => mutate()}>
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isValidating ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {error && (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load phone receipts.
        </div>
      )}

      {isLoading ? (
        <div className="card p-6 text-sm text-zinc-500">Loading...</div>
      ) : (
        <section className="card min-w-0 divide-y divide-zinc-100 overflow-hidden">
          {(receipts ?? []).map((receipt) => (
            <article
              key={receipt.id}
              className="grid min-w-0 gap-3 p-4 lg:grid-cols-[minmax(150px,0.28fr)_minmax(0,1fr)_150px] lg:gap-5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Smartphone className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
                  <span className="truncate">{receipt.app ?? 'Unknown app'}</span>
                </div>
                <div className="mt-1 wrap-break-word text-sm text-zinc-600">
                  {receipt.title ?? 'No title'}
                </div>
              </div>

              <p className="min-w-0 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-zinc-800">
                {receipt.text || '(No text)'}
              </p>

              <dl className="grid grid-cols-2 gap-3 text-xs text-zinc-500 lg:grid-cols-1 lg:text-right">
                <div>
                  <dt className="font-medium text-zinc-600">Received</dt>
                  <dd className="mt-0.5">
                    <span className="block">{formatMalaysiaDate(receipt.receivedAt)}</span>
                    <span className="block">{formatMalaysiaTime(receipt.receivedAt)}</span>
                  </dd>
                </div>
                {receipt.phoneTime && (
                  <div>
                    <dt className="font-medium text-zinc-600">Phone time</dt>
                    <dd className="mt-0.5"><PhoneTime value={receipt.phoneTime} /></dd>
                  </div>
                )}
              </dl>
            </article>
          ))}

          {!error && receipts?.length === 0 && (
            <div className="p-8 text-center text-sm text-zinc-500">
              No MacroDroid requests received yet.
            </div>
          )}
        </section>
      )}
    </main>
  );
}
