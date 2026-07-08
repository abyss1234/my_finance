'use client';

import useSWR from 'swr';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/finance';
import { authFetch, fetcher } from '@/lib/apiClient';

type Category = { id: number; name: string; kind: 'INCOME' | 'EXPENSE' };

type Tx = {
  id: number;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  date: string;
  note?: string | null;
  source?: string | null;
  counterparty?: string | null;
  externalRef?: string | null;
  rawBody?: string | null;
  category: { id: number; name: string; kind: 'INCOME' | 'EXPENSE' };
};

type TransactionResponse = {
  items: Tx[];
  totals: { income: number; expense: number; net: number };
};

type EditForm = {
  id: number;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  date: string;
  categoryId: string;
  note: string;
  source: string;
  counterparty: string;
  externalRef: string;
  rawBody: string;
};

function toDateInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function toEditForm(transaction: Tx): EditForm {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: String(transaction.amount),
    date: toDateInputValue(transaction.date),
    categoryId: String(transaction.category.id),
    note: transaction.note ?? '',
    source: transaction.source ?? '',
    counterparty: transaction.counterparty ?? '',
    externalRef: transaction.externalRef ?? '',
    rawBody: transaction.rawBody ?? '',
  };
}

export default function TransactionList({
  refreshKey,
  onChanged,
}: {
  refreshKey: number;
  onChanged?: () => void;
}) {
  const { data, error, mutate, isLoading } = useSWR<TransactionResponse>(
    '/api/transactions',
    fetcher,
    { refreshInterval: 0 }
  );
  const { data: categories } = useSWR<Category[]>('/api/categories', fetcher);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = useMemo(
    () => (categories ?? []).filter((category) => category.kind === editForm?.type),
    [categories, editForm?.type]
  );

  useEffect(() => {
    if (refreshKey > 0) void mutate();
  }, [mutate, refreshKey]);

  async function remove(id: number) {
    const ok = confirm('Delete this transaction?');
    if (!ok) return;

    const response = await authFetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (response.ok) {
      await mutate();
      onChanged?.();
      return;
    }

    alert('Failed to delete');
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm) return;

    const ok = confirm('Save changes to this transaction?');
    if (!ok) return;

    setEditError('');
    setIsSaving(true);

    try {
      const response = await authFetch(`/api/transactions/${editForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editForm.type,
          amount: Number(editForm.amount),
          date: editForm.date,
          categoryId: Number(editForm.categoryId),
          note: editForm.note,
          source: editForm.source,
          counterparty: editForm.counterparty,
          externalRef: editForm.externalRef,
        }),
      });

      if (response.ok) {
        setEditForm(null);
        await mutate();
        onChanged?.();
        return;
      }

      const body = await response.json().catch(() => null);
      setEditError(body?.error ?? 'Failed to update transaction.');
    } catch {
      setEditError('Failed to update transaction.');
    } finally {
      setIsSaving(false);
    }
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
    <>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Source</th>
              <th className="px-4 py-2 text-left">Person / Shop</th>
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
                <td className="px-4 py-2">{transaction.source ?? ''}</td>
                <td className="px-4 py-2">{transaction.counterparty ?? ''}</td>
                <td className="px-4 py-2 text-right font-medium">
                  {formatCurrency(Number(transaction.amount))}
                </td>
                <td className="px-4 py-2">{transaction.note ?? ''}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      className="text-xs font-medium text-zinc-700 hover:underline"
                      onClick={() => {
                        setEditError('');
                        setEditForm(toEditForm(transaction));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs font-medium text-red-600 hover:underline"
                      onClick={() => remove(transaction.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-zinc-500" colSpan={8}>
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <form
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5 shadow-xl"
            onSubmit={saveEdit}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Edit Transaction</h2>
                <p className="text-sm text-zinc-500">Review imported details before saving.</p>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
                onClick={() => setEditForm(null)}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Type</label>
                <select
                  className="select"
                  value={editForm.type}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      type: event.target.value as 'INCOME' | 'EXPENSE',
                      categoryId: '',
                    })
                  }
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </div>

              <div>
                <label className="label">Amount</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={editForm.amount}
                  onChange={(event) => setEditForm({ ...editForm, amount: event.target.value })}
                />
              </div>

              <div>
                <label className="label">Date</label>
                <input
                  className="input"
                  type="date"
                  required
                  value={editForm.date}
                  onChange={(event) => setEditForm({ ...editForm, date: event.target.value })}
                />
              </div>

              <div>
                <label className="label">Category</label>
                <select
                  className="select"
                  required
                  value={editForm.categoryId}
                  onChange={(event) => setEditForm({ ...editForm, categoryId: event.target.value })}
                >
                  <option value="">Select</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Bank / E-wallet</label>
                <input
                  className="input"
                  value={editForm.source}
                  onChange={(event) => setEditForm({ ...editForm, source: event.target.value })}
                />
              </div>

              <div>
                <label className="label">Person / Shop</label>
                <input
                  className="input"
                  value={editForm.counterparty}
                  onChange={(event) =>
                    setEditForm({ ...editForm, counterparty: event.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Reference</label>
                <input
                  className="input"
                  value={editForm.externalRef}
                  onChange={(event) =>
                    setEditForm({ ...editForm, externalRef: event.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Note</label>
                <input
                  className="input"
                  value={editForm.note}
                  onChange={(event) => setEditForm({ ...editForm, note: event.target.value })}
                />
              </div>
            </div>

            {editForm.rawBody && (
              <div className="mt-4">
                <label className="label">Raw Notification</label>
                <textarea className="input min-h-20 resize-y" readOnly value={editForm.rawBody} />
              </div>
            )}

            {editError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {editError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn" onClick={() => setEditForm(null)}>
                Cancel
              </button>
              <button className="btn" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
