'use client';

import { useState } from 'react';
import useSWR from 'swr';
import SummaryCards from '@/components/SummaryCards';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as T;
};

export default function HomePage() {
  const { data, error, mutate } = useSWR<{ totals: { income: number; expense: number; net: number } }>(
    '/api/transactions',
    fetcher
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshAll = async () => {
    await mutate();
    setRefreshKey((key) => key + 1);
  };

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Dashboard</h2>
        <p className="text-sm text-zinc-600">Add transactions and review your latest balance at a glance.</p>
      </div>

      <SummaryCards income={data?.totals.income ?? 0} expense={data?.totals.expense ?? 0} net={data?.totals.net ?? 0} />

      {error && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load totals. You can still try adding a transaction.
        </div>
      )}

      <TransactionForm onCreated={refreshAll} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Recent Transactions</h2>
          <p className="text-sm text-zinc-500">The latest entries across income and expenses.</p>
        </div>
        <button className="btn" onClick={refreshAll}>Refresh</button>
      </div>

      <TransactionList refreshKey={refreshKey} onChanged={refreshAll} />
    </main>
  );
}
