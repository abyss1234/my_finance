'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react';
import { authFetch, fetcher } from '@/lib/apiClient';
import { dateTimeInputToIso } from '@/lib/finance';
import type { CategoryOption, TransactionKind } from '@/lib/transactionTypes';

export default function TransactionForm({ onCreated }: { onCreated?: () => void }) {
  const { data: categories, error: categoriesError } = useSWR<CategoryOption[]>(
    '/api/categories',
    fetcher
  );
  const [type, setType] = useState<TransactionKind>('EXPENSE');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const options = useMemo(
    () => (categories ?? []).filter((category) => category.kind === type),
    [categories, type]
  );

  async function submit(formData: FormData) {
    setError('');
    setIsSaving(true);

    try {
      const date = formData.get('date');
      const response = await authFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: Number(formData.get('amount')),
          date: typeof date === 'string' && date ? dateTimeInputToIso(date) : undefined,
          note: (formData.get('note') as string) || undefined,
          source: (formData.get('source') as string) || undefined,
          counterparty: (formData.get('counterparty') as string) || undefined,
          categoryId: Number(formData.get('categoryId')),
        }),
      });

      if (response.ok) {
        (document.getElementById('tx-form') as HTMLFormElement)?.reset();
        onCreated?.();
        return;
      }

      const body = await response.json().catch(() => null);
      setError(body?.error ?? 'Failed to save transaction.');
    } catch {
      setError('Failed to save transaction.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form id="tx-form" className="card overflow-hidden" action={submit}>
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Add Transaction</h2>
        <p className="mt-1 text-xs text-zinc-500">Record a new income or expense entry.</p>
      </div>

      <div className="p-4">
        <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-1" aria-label="Transaction type">
          <button
            type="button"
            aria-pressed={type === 'EXPENSE'}
            className={`inline-flex h-8 items-center gap-1.5 rounded px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-zinc-400 ${type === 'EXPENSE' ? 'bg-white text-rose-700 shadow-sm' : 'text-zinc-600 hover:text-zinc-950'}`}
            onClick={() => {
              setType('EXPENSE');
              setError('');
            }}
          >
            <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
            Expense
          </button>
          <button
            type="button"
            aria-pressed={type === 'INCOME'}
            className={`inline-flex h-8 items-center gap-1.5 rounded px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-zinc-400 ${type === 'INCOME' ? 'bg-white text-emerald-700 shadow-sm' : 'text-zinc-600 hover:text-zinc-950'}`}
            onClick={() => {
              setType('INCOME');
              setError('');
            }}
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            Income
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-2">
            <label className="label" htmlFor="transaction-amount">Amount</label>
            <input id="transaction-amount" name="amount" type="number" step="0.01" min="0" required className="input" placeholder="0.00" />
          </div>
          <div className="xl:col-span-3">
            <label className="label" htmlFor="transaction-date">Date and time</label>
            <input id="transaction-date" name="date" type="datetime-local" className="input" />
          </div>
          <div className="xl:col-span-3">
            <label className="label" htmlFor="transaction-category">Category</label>
            <select id="transaction-category" name="categoryId" required className="select">
              <option value="">Select</option>
              {options.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <label className="label" htmlFor="transaction-note">Note</label>
            <input id="transaction-note" name="note" type="text" className="input" placeholder="Optional" />
          </div>
          <div className="xl:col-span-6">
            <label className="label" htmlFor="transaction-source">Bank / E-wallet</label>
            <select id="transaction-source" name="source" className="select">
              <option value="">Select source</option>
              <option value="MAE">MAE</option>
              <option value="TNG eWallet">TNG eWallet</option>
              <option value="CIMB">CIMB</option>
              <option value="Cash">Cash</option>
            </select>
          </div>
          <div className="xl:col-span-6">
            <label className="label" htmlFor="transaction-counterparty">Person / Shop</label>
            <input id="transaction-counterparty" name="counterparty" type="text" className="input" placeholder="Optional" />
          </div>
        </div>

        {(error || categoriesError) && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error || 'Failed to load categories.'}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button className="btn border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800" disabled={isSaving || options.length === 0}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {isSaving ? 'Saving...' : `Add ${type === 'EXPENSE' ? 'Expense' : 'Income'}`}
          </button>
        </div>
      </div>
    </form>
  );
}
