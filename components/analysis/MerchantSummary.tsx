'use client';

import { ArrowRight, Store, Users } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { MerchantAnalysisRow } from '@/lib/analysisTypes';
import { formatCurrency } from '@/lib/finance';
import type { TransactionKind } from '@/lib/transactionTypes';

type Props = {
  rows: MerchantAnalysisRow[];
  selectedType: '' | TransactionKind;
  compare: boolean;
  isLoading: boolean;
  onSelect: (row: MerchantAnalysisRow) => void;
};

function changeLabel(change: number | null) {
  if (change === null) return 'New';
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
}

export default function MerchantSummary({
  rows,
  selectedType,
  compare,
  isLoading,
  onSelect,
}: Props) {
  const incomeMode = selectedType === 'INCOME';
  const title = incomeMode ? 'Top Payers' : 'Top Merchants';
  const description = incomeMode
    ? 'People and sources contributing the most income.'
    : 'People and shops receiving the most spending.';

  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} className="p-4" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={incomeMode ? Users : Store}
          title={`No ${incomeMode ? 'payer' : 'merchant'} data`}
          description="Person / Shop names will appear here when matching transactions are available."
        />
      ) : (
        <div className="divide-y divide-zinc-100">
          {rows.slice(0, 7).map((row, index) => (
            <button
              key={`${row.kind}-${row.name}`}
              type="button"
              className="grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 text-left transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
              aria-label={`View transactions for ${row.name}`}
              onClick={() => onSelect(row)}
            >
              <span className="text-xs font-semibold tabular-nums text-zinc-400">{index + 1}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-900">{row.name}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {row.count} transaction{row.count === 1 ? '' : 's'} - Avg {formatCurrency(row.average)}
                </span>
              </span>
              <span className="flex items-center gap-2 text-right">
                <span>
                  <span className="block text-sm font-semibold tabular-nums text-zinc-950">
                    {formatCurrency(row.amount)}
                  </span>
                  {compare && (
                    <span className={`block text-xs ${
                      row.change === null || row.change === 0
                        ? 'text-zinc-500'
                        : (row.change > 0) === incomeMode
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                    }`}>
                      {changeLabel(row.change)}
                    </span>
                  )}
                </span>
                <ArrowRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
