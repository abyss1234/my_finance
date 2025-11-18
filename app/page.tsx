'use client';

import { useState } from 'react';
import useSWR from 'swr';
import SummaryCards from '@/components/SummaryCards';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function HomePage() {
  const { data, mutate } = useSWR<{ totals: { income: number; expense: number; net: number } }>(
    '/api/transactions',
    fetcher
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshAll = async () => { await mutate(); setRefreshKey(k => k + 1); };

  return (
    <main className="space-y-6">
      <SummaryCards income={data?.totals.income ?? 0} expense={data?.totals.expense ?? 0} net={data?.totals.net ?? 0} />

      <TransactionForm onCreated={refreshAll} />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">Recent Transactions</h2>
        <button className="btn" onClick={refreshAll}>Refresh</button>
      </div>

      <TransactionList refreshKey={refreshKey} />
    </main>
  );
}
