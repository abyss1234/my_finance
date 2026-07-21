'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { RefreshCw } from 'lucide-react';
import PageHeader, { SectionHeader } from '@/components/PageHeader';
import SummaryCards from '@/components/SummaryCards';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import { fetcher } from '@/lib/apiClient';

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
    <main className="min-w-0 space-y-5">
      <PageHeader
        title="Dashboard"
        description="Add transactions and review your latest balance at a glance."
      />

      <SummaryCards income={data?.totals.income ?? 0} expense={data?.totals.expense ?? 0} net={data?.totals.net ?? 0} />

      {error && (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load totals. You can still try adding a transaction.
        </div>
      )}

      <TransactionForm onCreated={refreshAll} />

      <SectionHeader
        title="Recent Transactions"
        description="The latest entries across income and expenses."
        actions={
          <button className="btn" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        }
      />

      <TransactionList refreshKey={refreshKey} onChanged={refreshAll} />
    </main>
  );
}
