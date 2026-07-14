'use client';

import useSWR from 'swr';
import { useState, useMemo } from 'react';
import { authFetch, fetcher } from '@/lib/apiClient';
import { dateTimeInputToIso } from '@/lib/finance';

type Category = { id: number; name: string; kind: 'INCOME' | 'EXPENSE' };

export default function TransactionForm({ onCreated }: { onCreated?: () => void }) {
  const { data: categories, error: categoriesError } = useSWR<Category[]>('/api/categories', fetcher);

  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const options = useMemo(
    () => (categories ?? []).filter(c => c.kind === type),
    [categories, type]
  );

  async function submit(formData: FormData) {
    setError('');
    setIsSaving(true);

    try {
      const date = formData.get('date');
      const payload = {
        type,
        amount: Number(formData.get('amount')),
        date: typeof date === 'string' && date ? dateTimeInputToIso(date) : undefined,
        note: (formData.get('note') as string) || undefined,
        categoryId: Number(formData.get('categoryId')),
      };
      const res = await authFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        (document.getElementById('tx-form') as HTMLFormElement)?.reset();
        onCreated?.();
        return;
      }

      const body = await res.json().catch(() => null);
      setError(body?.error ?? 'Failed to save transaction.');
    } catch {
      setError('Failed to save transaction.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form id="tx-form" className="card p-4" action={submit}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Add Transaction</h2>
          <p className="text-sm text-zinc-500">Record a new income or expense entry.</p>
        </div>
      </div>

      <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-1">
        <button type="button"
          className={`rounded px-3 py-1.5 text-sm font-medium ${type === 'EXPENSE' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-600'}`}
          onClick={() => { setType('EXPENSE'); setError(''); }}>Expense</button>
        <button type="button"
          className={`rounded px-3 py-1.5 text-sm font-medium ${type === 'INCOME' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-600'}`}
          onClick={() => { setType('INCOME'); setError(''); }}>Income</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <label className="label">Amount</label>
          <input name="amount" type="number" step="0.01" min="0" required className="input" placeholder="0.00" />
        </div>
        <div className="sm:col-span-1">
          <label className="label">Date and time</label>
          <input name="date" type="datetime-local" className="input" />
        </div>
        <div className="sm:col-span-1">
          <label className="label">Category</label>
          <select name="categoryId" required className="select">
            <option value="">Select</option>
            {options.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-1">
          <label className="label">Note</label>
          <input name="note" type="text" className="input" placeholder="(optional)" />
        </div>
      </div>

      {(error || categoriesError) && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || 'Failed to load categories.'}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button className="btn" disabled={isSaving || options.length === 0}>
          {isSaving ? 'Saving...' : `Add ${type === 'EXPENSE' ? 'Expense' : 'Income'}`}
        </button>
      </div>
    </form>
  );
}
