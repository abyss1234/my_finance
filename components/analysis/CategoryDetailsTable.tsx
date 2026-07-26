'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, Download, Eye, Search } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { AnalysisCategoryRow } from '@/lib/analysisTypes';
import { formatCurrency } from '@/lib/finance';

type SortKey = 'amount' | 'count' | 'change';

type Props = {
  rows: AnalysisCategoryRow[];
  comparisonAvailable: boolean;
  isLoading: boolean;
  onSelect: (row: AnalysisCategoryRow) => void;
};

function changeLabel(change: number | null) {
  if (change === null) return '-';
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function SortButton({
  value,
  label,
  active,
  onSelect,
}: {
  value: SortKey;
  label: string;
  active: boolean;
  onSelect: (value: SortKey) => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-semibold hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-400"
      aria-pressed={active}
      onClick={() => onSelect(value)}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

export default function CategoryDetailsTable({
  rows,
  comparisonAvailable,
  isLoading,
  onSelect,
}: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('amount');

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('en-MY');
    return rows
      .filter((row) => !query || row.name.toLocaleLowerCase('en-MY').includes(query))
      .sort((left, right) => {
        if (sortKey === 'count') return right.count - left.count;
        if (sortKey === 'change' && comparisonAvailable) {
          return (right.change ?? -Infinity) - (left.change ?? -Infinity);
        }
        return right.amount - left.amount;
      });
  }, [comparisonAvailable, rows, search, sortKey]);

  function exportCsv() {
    const headers: string[] = [
      'Category',
      'Type',
      'Transactions',
      'Total',
      'Percentage',
      'Average',
    ];
    if (comparisonAvailable) headers.push('Previous Total', 'Change');

    const lines = visibleRows.map((row) => {
      const values: Array<string | number> = [
        row.name,
        row.kind,
        row.count,
        row.amount.toFixed(2),
        row.percentage.toFixed(2),
        row.average.toFixed(2),
      ];
      if (comparisonAvailable) {
        values.push(row.previousAmount.toFixed(2), row.change?.toFixed(2) ?? '');
      }
      return values.map(csvCell).join(',');
    });
    const blob = new Blob([[headers.map(csvCell).join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'analysis-categories.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Detailed Category Analysis</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {comparisonAvailable
              ? 'Compare category totals, frequency, averages, and change.'
              : 'Review category totals, frequency, averages, and share.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-52">
            <label className="sr-only" htmlFor="category-analysis-search">Filter categories</label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <input id="category-analysis-search" className="input min-h-9 pl-8" type="search" placeholder="Filter categories" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <button type="button" className="icon-btn border border-zinc-300 bg-white" aria-label="Export category analysis to CSV" title="Export CSV" disabled={visibleRows.length === 0} onClick={exportCsv}>
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} className="p-4" />
      ) : visibleRows.length === 0 ? (
        <EmptyState icon={Search} title="No category results" description="Try another filter or date range." />
      ) : (
        <>
          <div className="hidden xl:block">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className={comparisonAvailable ? 'w-[22%]' : 'w-[30%]'} />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-32" />
                <col className="w-24" />
                <col className="w-32" />
                {comparisonAvailable && <col className="w-32" />}
                {comparisonAvailable && <col className="w-24" />}
                <col className="w-16" />
              </colgroup>
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
                <tr>
                  <th className="px-4 py-3 text-left" scope="col">Category</th>
                  <th className="px-3 py-3 text-left" scope="col">Type</th>
                  <th className="px-3 py-3 text-right" scope="col"><SortButton value="count" label="Count" active={sortKey === 'count'} onSelect={setSortKey} /></th>
                  <th className="px-3 py-3 text-right" scope="col"><SortButton value="amount" label="Total" active={sortKey === 'amount'} onSelect={setSortKey} /></th>
                  <th className="px-3 py-3 text-right" scope="col">Share</th>
                  <th className="hidden px-3 py-3 text-right xl:table-cell" scope="col">Average</th>
                  {comparisonAvailable && (
                    <th className="px-3 py-3 text-right" scope="col">Previous</th>
                  )}
                  {comparisonAvailable && (
                    <th className="px-3 py-3 text-right" scope="col">
                      <SortButton value="change" label="Change" active={sortKey === 'change'} onSelect={setSortKey} />
                    </th>
                  )}
                  <th className="px-3 py-3" scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {visibleRows.map((row) => (
                  <tr key={row.categoryId} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <button type="button" className="max-w-full truncate text-left font-medium text-zinc-900 hover:underline focus-visible:ring-2 focus-visible:ring-zinc-400" onClick={() => onSelect(row)}>{row.name}</button>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold ${row.kind === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>{row.kind === 'INCOME' ? 'Income' : 'Expense'}</span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-700">{row.count}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-zinc-950">{formatCurrency(row.amount)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-700">{row.percentage.toFixed(1)}%</td>
                    <td className="hidden px-3 py-3 text-right tabular-nums text-zinc-700 xl:table-cell">{formatCurrency(row.average)}</td>
                    {comparisonAvailable && (
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-700">
                        {formatCurrency(row.previousAmount)}
                      </td>
                    )}
                    {comparisonAvailable && (
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-700">
                        {changeLabel(row.change)}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="icon-btn" aria-label={`View ${row.name} transactions`} title="View transactions" onClick={() => onSelect(row)}>
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-zinc-100 xl:hidden">
            {visibleRows.map((row) => (
              <button key={row.categoryId} type="button" className="block w-full p-4 text-left transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400" onClick={() => onSelect(row)}>
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-900">{row.name}</span>
                    <span className={`mt-1 block text-xs font-semibold ${row.kind === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>{row.kind === 'INCOME' ? 'Income' : 'Expense'}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold tabular-nums text-zinc-950">{formatCurrency(row.amount)}</span>
                    <span className="mt-1 block text-xs text-zinc-500">{row.percentage.toFixed(1)}% share</span>
                  </span>
                </span>
                <span
                  className={`mt-3 grid gap-3 text-xs ${
                    comparisonAvailable ? 'grid-cols-3' : 'grid-cols-2'
                  }`}
                >
                  <span><span className="block text-zinc-500">Transactions</span><span className="mt-0.5 block font-medium tabular-nums text-zinc-800">{row.count}</span></span>
                  <span><span className="block text-zinc-500">Average</span><span className="mt-0.5 block font-medium tabular-nums text-zinc-800">{formatCurrency(row.average)}</span></span>
                  {comparisonAvailable && (
                    <span><span className="block text-zinc-500">Change</span><span className="mt-0.5 block font-medium tabular-nums text-zinc-800">{changeLabel(row.change)}</span></span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
