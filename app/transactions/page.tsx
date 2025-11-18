'use client';

import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { addDays, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';

type Category = { id: number; name: string; kind: 'INCOME'|'EXPENSE' };
type Tx = {
  id: number;
  type: 'INCOME'|'EXPENSE';
  amount: string;
  date: string;
  note?: string | null;
  category: { id: number; name: string; kind: 'INCOME'|'EXPENSE' };
};

type ApiData = {
  items: Tx[];
  totals: { income: number; expense: number; net: number };
  page: number;
  pageSize: number;
  totalCount: number;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

type DatePreset = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_WEEK' | 'TODAY' | 'ALL' | 'CUSTOM';

function rangeFor(preset: DatePreset) {
  const now = new Date();
  switch (preset) {
    case 'THIS_MONTH':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'LAST_MONTH': {
      const lastMonth = addDays(startOfMonth(now), -1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case 'THIS_WEEK':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'TODAY':
      return { from: startOfDay(now), to: now };
    case 'ALL':
      return { from: null as Date | null, to: null as Date | null };
    default:
      return { from: null as Date | null, to: null as Date | null };
  }
}

export default function TransactionsPage() {
  // Filters
  const [preset, setPreset] = useState<DatePreset>('THIS_MONTH');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>(''); // '' = All
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);

  // Options
  const { data: categories } = useSWR<Category[]>('/api/categories', fetcher);

  // Apply preset to from/to
  useEffect(() => {
    if (preset === 'CUSTOM') return;
    const r = rangeFor(preset);
    setFrom(r.from ? r.from.toISOString().slice(0, 10) : '');
    setTo(r.to ? r.to.toISOString().slice(0, 10) : '');
    setPage(1);
  }, [preset]);

  // Build query
  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (from) sp.set('from', new Date(from).toISOString());
    if (to) sp.set('to', new Date(to).toISOString());
    if (categoryId) sp.set('categoryId', categoryId);
    sp.set('page', String(page));
    sp.set('pageSize', String(pageSize));
    return `/api/transactions?${sp.toString()}`;
  }, [from, to, categoryId, page, pageSize]);

  const { data, isLoading } = useSWR<ApiData>(query, fetcher, { revalidateOnFocus: false });

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1),
    [data]
  );

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">Transactions</h2>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Income</div>
          <div className="mt-1 text-2xl font-semibold">RM {(data?.totals.income ?? 0).toFixed(2)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Expense</div>
          <div className="mt-1 text-2xl font-semibold">RM {(data?.totals.expense ?? 0).toFixed(2)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Net</div>
          <div className="mt-1 text-2xl font-semibold">RM {(data?.totals.net ?? 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          {/* Date preset */}
          <div className="sm:col-span-3">
            <label className="label">Date range</label>
            <select
              className="select"
              value={preset}
              onChange={(e) => setPreset(e.target.value as DatePreset)}
            >
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="TODAY">Today</option>
              <option value="ALL">All Time</option>
              <option value="CUSTOM">Custom…</option>
            </select>
          </div>

          {/* Custom dates */}
          <div className="sm:col-span-2">
            <label className="label">From</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPreset('CUSTOM'); setPage(1); }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPreset('CUSTOM'); setPage(1); }}
            />
          </div>

          {/* Category */}
          <div className="sm:col-span-3">
            <label className="label">Category</label>
            <select
              className="select"
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {(categories ?? []).map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} ({c.kind})
                </option>
              ))}
            </select>
          </div>

          {/* Page size */}
          <div className="sm:col-span-2">
            <label className="label">Rows</label>
            <select
              className="select"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value) as 10|20|50); setPage(1); }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto"> //card overflow-hidden
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-right">Amount (RM)</th>
              <th className="px-4 py-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="px-4 py-6 text-center" colSpan={5}>Loading…</td></tr>
            )}
            {!isLoading && (data?.items ?? []).map(tx => (
              <tr key={tx.id} className="border-t">
                <td className="px-4 py-2">{new Date(tx.date).toLocaleDateString()}</td>
                <td className="px-4 py-2">{tx.type}</td>
                <td className="px-4 py-2">{tx.category.name}</td>
                <td className="px-4 py-2 text-right">{Number(tx.amount).toFixed(2)}</td>
                <td className="px-4 py-2">{tx.note ?? ''}</td>
              </tr>
            ))}
            {!isLoading && (data?.items?.length ?? 0) === 0 && (
              <tr><td className="px-4 py-6 text-center text-zinc-500" colSpan={5}>No transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600">
          Page {data?.page ?? page} of {totalPages}
          {data && (
            <> — {data.totalCount} record{data.totalCount === 1 ? '' : 's'}</>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <button
            className="btn"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}
