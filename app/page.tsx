'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { RefreshCw } from 'lucide-react';
import PageHeader, { SectionHeader } from '@/components/PageHeader';
import SummaryCards from '@/components/SummaryCards';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import { fetcher } from '@/lib/apiClient';
import { dateInputToIso, malaysiaDateKey } from '@/lib/finance';

function thisMonthTransactionsUrl() {
  const [year, month] = malaysiaDateKey(new Date()).split('-').map(Number);
  const monthText = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const params = new URLSearchParams({
    from: dateInputToIso(`${year}-${monthText}-01`, 'start'),
    to: dateInputToIso(`${year}-${monthText}-${lastDay}`, 'end'),
  });

  return `/api/transactions?${params}`;
}

export default function HomePage() {
  const { data, error, mutate } = useSWR<{ totals: { income: number; expense: number; net: number } }>(
    thisMonthTransactionsUrl(),
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
        description="Add transactions and review this month's balance at a glance."
      />

      <SummaryCards income={data?.totals.income ?? 0} expense={data?.totals.expense ?? 0} net={data?.totals.net ?? 0} />

      {error && (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load this month&apos;s totals. You can still try adding a transaction.
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
