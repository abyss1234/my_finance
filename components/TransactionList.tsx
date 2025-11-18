'use client';

import useSWR from 'swr';

type Tx = {
  id: number;
  type: 'INCOME'|'EXPENSE';
  amount: string; // decimal as string
  date: string;
  note?: string | null;
  category: { name: string; kind: 'INCOME'|'EXPENSE' };
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function TransactionList({ refreshKey }: { refreshKey: number }) {
  const { data, mutate, isLoading } = useSWR<{ items: Tx[]; totals: {income:number; expense:number; net:number} }>(
    '/api/transactions',
    fetcher,
    { refreshInterval: 0 }
  );

  async function remove(id: number) {
    const ok = confirm('Delete this transaction?');
    if (!ok) return;
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) mutate(); else alert('Failed to delete');
  }

  if (isLoading) return <div className="card p-4">Loading…</div>;
  const items = data?.items ?? [];

  return (
    <div className="card overflow-x-auto"> // card overflow-hidden
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">Category</th>
            <th className="px-4 py-2 text-right">Amount (RM)</th>
            <th className="px-4 py-2 text-left">Note</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(tx => (
            <tr key={tx.id} className="border-t">
              <td className="px-4 py-2">{new Date(tx.date).toLocaleDateString()}</td>
              <td className="px-4 py-2">{tx.type}</td>
              <td className="px-4 py-2">{tx.category.name}</td>
              <td className="px-4 py-2 text-right">
                {Number(tx.amount).toFixed(2)}
              </td>
              <td className="px-4 py-2">{tx.note ?? ''}</td>
              <td className="px-4 py-2 text-right">
                <button className="text-xs text-red-600 hover:underline" onClick={() => remove(tx.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td className="px-4 py-6 text-center text-zinc-500" colSpan={6}>No transactions yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
