'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import SummaryCards from '@/components/SummaryCards';
import {
  DatePreset,
  dateInputToIso,
  dateInputValue,
  datePresetLabels,
  formatCurrency,
  rangeForPreset,
} from '@/lib/finance';

type Category = { id: number; name: string; kind: 'INCOME' | 'EXPENSE' };
type Tx = {
  id: number;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  date: string;
  note?: string | null;
  category: { id: number; name: string; kind: 'INCOME' | 'EXPENSE' };
};

type ApiData = {
  items: Tx[];
  totals: { income: number; expense: number; net: number };
  page: number;
  pageSize: number;
  totalCount: number;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as T;
};

export default function TransactionsPage() {
  const [preset, setPreset] = useState<DatePreset>('THIS_MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);

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

  const { data, error, isLoading } = useSWR<ApiData>(query, fetcher, {
    revalidateOnFocus: false,
  });

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1),
    [data]
  );

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
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-center text-zinc-500" colSpan={5}>
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
                  <td className="px-4 py-2 text-right font-medium">
                    {formatCurrency(Number(transaction.amount))}
                  </td>
                  <td className="px-4 py-2">{transaction.note ?? ''}</td>
                </tr>
              ))}
            {!isLoading && (data?.items?.length ?? 0) === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-zinc-500" colSpan={5}>
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
    </main>
  );
}
