'use client';

import useSWR from 'swr';
import { FormEvent, useMemo, useState } from 'react';
import SummaryCards from '@/components/SummaryCards';
import {
  DatePreset,
  dateInputToIso,
  dateInputValue,
  datePresetLabels,
  formatCurrency,
  rangeForPreset,
} from '@/lib/finance';
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

type ApiData = {
  items: Tx[];
  totals: { income: number; expense: number; net: number };
  page: number;
  pageSize: number;
  totalCount: number;
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

export default function TransactionsPage() {
  const [preset, setPreset] = useState<DatePreset>('THIS_MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: categories } = useSWR<Category[]>('/api/categories', fetcher);

  const { from, to } = useMemo(() => {
    if (preset === 'CUSTOM') return { from: customFrom, to: customTo };

    const range = rangeForPreset(preset);
    return {
      from: dateInputValue(range.from),
      to: dateInputValue(range.to),
    };
  }, [preset, customFrom, customTo]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    const fromIso = dateInputToIso(from, 'start');
    const toIso = dateInputToIso(to, 'end');

    if (fromIso) params.set('from', fromIso);
    if (toIso) params.set('to', toIso);
    if (categoryId) params.set('categoryId', categoryId);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    return `/api/transactions?${params.toString()}`;
  }, [from, to, categoryId, page, pageSize]);

  const { data, error, isLoading, mutate } = useSWR<ApiData>(query, fetcher, {
    revalidateOnFocus: false,
  });

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1),
    [data]
  );

  const categoryOptions = useMemo(
    () => (categories ?? []).filter((category) => category.kind === editForm?.type),
    [categories, editForm?.type]
  );

  async function remove(id: number) {
    const ok = confirm('Delete this transaction?');
    if (!ok) return;

    const response = await authFetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (response.ok) {
      await mutate();
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

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Transactions</h2>
        <p className="text-sm text-zinc-600">
          Review income and expenses by date, category, and page size.
        </p>
      </div>

      <SummaryCards
        income={data?.totals.income ?? 0}
        expense={data?.totals.expense ?? 0}
        net={data?.totals.net ?? 0}
      />

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          <div className="sm:col-span-3">
            <label className="label">Date range</label>
            <select
              className="select"
              value={preset}
              onChange={(event) => {
                setPreset(event.target.value as DatePreset);
                setPage(1);
              }}
            >
              {Object.entries(datePresetLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label">From</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(event) => {
                setCustomFrom(event.target.value);
                setPreset('CUSTOM');
                setPage(1);
              }}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(event) => {
                setCustomTo(event.target.value);
                setPreset('CUSTOM');
                setPage(1);
              }}
            />
          </div>

          <div className="sm:col-span-3">
            <label className="label">Category</label>
            <select
              className="select"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {(categories ?? []).map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name} ({category.kind})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label">Rows</label>
            <select
              className="select"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as 10 | 20 | 50);
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load transactions. Please try again.
        </div>
      )}

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
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-center text-zinc-500" colSpan={8}>
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading &&
              (data?.items ?? []).map((transaction) => (
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
            {!isLoading && (data?.items?.length ?? 0) === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-zinc-500" colSpan={8}>
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-600">
          Page {data?.page ?? page} of {totalPages}
          {data && (
            <>
              {' '}
              - {data.totalCount} record{data.totalCount === 1 ? '' : 's'}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="btn"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <button
            className="btn"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
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
    </main>
  );
}
