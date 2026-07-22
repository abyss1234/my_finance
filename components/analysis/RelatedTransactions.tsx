'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SectionHeader } from '@/components/PageHeader';
import TransactionTable from '@/components/TransactionTable';
import type { AnalysisDetailFilter } from '@/lib/analysisTypes';
import type { TransactionRow } from '@/lib/transactionTypes';

type Props = {
  items: TransactionRow[];
  detail: AnalysisDetailFilter | null;
  isLoading: boolean;
  error?: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onClear: () => void;
  onEdit: (transaction: TransactionRow) => void;
  onDelete: (id: number) => void;
};

export default function RelatedTransactions({
  items,
  detail,
  isLoading,
  error,
  page,
  totalPages,
  totalCount,
  onPageChange,
  onClear,
  onEdit,
  onDelete,
}: Props) {
  return (
    <section id="related-transactions" className="min-w-0 space-y-3 scroll-mt-24">
      <SectionHeader
        title="Related Transactions"
        description="The records contributing to the selected analysis result."
        actions={detail ? (
          <button type="button" className="btn" onClick={onClear}>
            <X className="h-4 w-4" aria-hidden="true" />
            Clear detail filter
          </button>
        ) : undefined}
      />

      <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm">
        <span className="text-zinc-500">Showing transactions for: </span>
        <span className="font-medium text-zinc-900">{detail?.label ?? 'All current filters'}</span>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Failed to load related transactions.
        </div>
      )}

      <TransactionTable
        items={items}
        isLoading={isLoading}
        emptyMessage="No transactions found for this detail filter."
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-zinc-600">
          Page {page} of {totalPages}
          <span className="hidden sm:inline"> - {totalCount} record{totalCount === 1 ? '' : 's'}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" className="icon-btn border border-zinc-300 bg-white" aria-label="Previous transaction page" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn border border-zinc-300 bg-white" aria-label="Next transaction page" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
