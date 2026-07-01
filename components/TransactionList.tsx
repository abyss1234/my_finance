'use client';

import useSWR from 'swr';
import { useEffect } from 'react';
import { formatCurrency } from '@/lib/finance';

type Tx = {
  id: number;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  date: string;
  note?: string | null;
  category: { name: string; kind: 'INCOME' | 'EXPENSE' };
};

type TransactionResponse = {
  items: Tx[];
  totals: { income: number; expense: number; net: number };
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as T;
};

export default function TransactionList({ refreshKey }: { refreshKey: number }) {
  const { data, error, mutate, isLoading } = useSWR<TransactionResponse>(
    '/api/transactions',
    fetcher,
    { refreshInterval: 0 }
  );

  useEffect(() => {
    if (refreshKey > 0) void mutate();
  }, [mutate, refreshKey]);

  async function remove(id: number) {
    const ok = confirm('Delete this transaction?');
    if (!ok) return;

    const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (response.ok) {
      void mutate();
      return;
    }

    alert('Failed to delete');
  }

  if (isLoading) return <div className="card p-4 text-sm text-zinc-500">Loading...</div>;
  if (error) {
    return (
      <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load recent transactions.
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">Category</th>
            <th className="px-4 py-2 text-right">Amount</th>
            <th className="px-4 py-2 text-left">Note</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((transaction) => (
            <tr key={transaction.id} className="border-t">
              <td className="px-4 py-2">{new Date(transaction.date).toLocaleDateString()}</td>
              <td className="px-4 py-2">{transaction.type}</td>
              <td className="px-4 py-2">{transaction.category.name}</td>
              <td className="px-4 py-2 text-right font-medium">
                {formatCurrency(Number(transaction.amount))}
              </td>
              <td className="px-4 py-2">{transaction.note ?? ''}</td>
              <td className="px-4 py-2 text-right">
                <button
                  className="text-xs font-medium text-red-600 hover:underline"
                  onClick={() => remove(transaction.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-zinc-500" colSpan={6}>
                No transactions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
