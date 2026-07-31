'use client';

import useSWR from 'swr';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react';
import { authFetch, fetcher } from '@/lib/apiClient';
import { dateTimeInputToIso } from '@/lib/finance';
import type { CategoryOption, TransactionKind } from '@/lib/transactionTypes';

const MAX_AMOUNT_CENTS = 999_999_999_999;

function formatAmount(cents: number) {
  const digits = String(cents).padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

function parseAmountInput(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return 0;

  const cents = Number(digits);
  return Number.isSafeInteger(cents) ? Math.min(cents, MAX_AMOUNT_CENTS) : MAX_AMOUNT_CENTS;
}

export default function TransactionForm({ onCreated }: { onCreated?: () => void }) {
  const { data: categories, error: categoriesError } = useSWR<CategoryOption[]>(
    '/api/categories',
    fetcher
  );
  const [type, setType] = useState<TransactionKind>('EXPENSE');
  const [amountCents, setAmountCents] = useState(0);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const options = useMemo(
    () => (categories ?? []).filter((category) => category.kind === type),
    [categories, type]
  );

  async function submit(formData: FormData) {
    setError('');

    if (amountCents === 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    setIsSaving(true);

    try {
      const date = formData.get('date');
      const response = await authFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: amountCents / 100,
          date: typeof date === 'string' && date ? dateTimeInputToIso(date) : undefined,
          note: (formData.get('note') as string) || undefined,
          source: (formData.get('source') as string) || undefined,
          counterparty: (formData.get('counterparty') as string) || undefined,
          categoryId: Number(formData.get('categoryId')),
        }),
      });

      if (response.ok) {
        (document.getElementById('tx-form') as HTMLFormElement)?.reset();
        setAmountCents(0);
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

  function handleAmountKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      const digit = Number(event.key);
      setAmountCents((current) => {
        const next = current * 10 + digit;
        return next <= MAX_AMOUNT_CENTS ? next : current;
      });
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      setAmountCents((current) => Math.floor(current / 10));
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      setAmountCents(0);
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
            <input
              id="transaction-amount"
              name="amount"
              type="text"
              inputMode="numeric"
              required
              className="input text-right tabular-nums"
              value={formatAmount(amountCents)}
              onChange={(event) => setAmountCents(parseAmountInput(event.target.value))}
              onKeyDown={handleAmountKeyDown}
              onFocus={(event) => {
                const end = event.currentTarget.value.length;
                event.currentTarget.setSelectionRange(end, end);
              }}
              onClick={(event) => {
                const end = event.currentTarget.value.length;
                event.currentTarget.setSelectionRange(end, end);
              }}
              autoComplete="off"
            />
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
