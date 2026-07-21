'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FinanceFilters from '@/components/FinanceFilters';
import PageHeader from '@/components/PageHeader';
import SummaryCards from '@/components/SummaryCards';
import TransactionEditDialog from '@/components/TransactionEditDialog';
import TransactionTable from '@/components/TransactionTable';
import { useFinanceFilters } from '@/hooks/useFinanceFilters';
import { useTransactionEditor } from '@/hooks/useTransactionEditor';
import { fetcher } from '@/lib/apiClient';
import { dateInputToIso } from '@/lib/finance';
import type { CategoryOption, TransactionRow } from '@/lib/transactionTypes';

type ApiData = {
  items: TransactionRow[];
  totals: { income: number; expense: number; net: number };
  page: number;
  pageSize: number;
  totalCount: number;
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);
  const filters = useFinanceFilters(() => setPage(1));

  const { data: categories } = useSWR<CategoryOption[]>('/api/categories', fetcher);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    const fromIso = dateInputToIso(filters.from, 'start');
    const toIso = dateInputToIso(filters.to, 'end');

    if (fromIso) params.set('from', fromIso);
    if (toIso) params.set('to', toIso);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    return `/api/transactions?${params.toString()}`;
  }, [filters.from, filters.to, filters.categoryId, page, pageSize]);

  const { data, error, isLoading, mutate } = useSWR<ApiData>(query, fetcher, {
    revalidateOnFocus: false,
  });
  const editor = useTransactionEditor({
    afterChange: async () => {
      await mutate();
    },
  });

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1),
    [data]
  );

  return (
    <main className="min-w-0 space-y-5">
      <PageHeader
        title="Transactions"
        description="Review income and expenses by date, category, and page size."
      />

      <SummaryCards
        income={data?.totals.income ?? 0}
        expense={data?.totals.expense ?? 0}
        net={data?.totals.net ?? 0}
      />

      <FinanceFilters
        categories={categories ?? []}
        preset={filters.preset}
        from={filters.from}
        to={filters.to}
        categoryId={filters.categoryId}
        pageSize={pageSize}
        onPresetChange={filters.setPreset}
        onFromChange={filters.setFrom}
        onToChange={filters.setTo}
        onCategoryChange={filters.setCategoryId}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
      />

      {error && (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load transactions. Please try again.
        </div>
      )}

      <TransactionTable
        items={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No transactions found."
        onEdit={editor.openEditor}
        onDelete={editor.removeTransaction}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm text-zinc-600">
          Page {data?.page ?? page} of {totalPages}
          {data && <span className="hidden sm:inline"> · {data.totalCount} record{data.totalCount === 1 ? '' : 's'}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="icon-btn border border-zinc-300 bg-white"
            aria-label="Previous page"
            title="Previous page"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn border border-zinc-300 bg-white"
            aria-label="Next page"
            title="Next page"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {editor.editForm && (
        <TransactionEditDialog
          value={editor.editForm}
          categories={categories ?? []}
          error={editor.editError}
          isSaving={editor.isSaving}
          onChange={editor.setEditForm}
          onClose={editor.closeEditor}
          onSubmit={editor.saveTransaction}
        />
      )}
    </main>
  );
}
