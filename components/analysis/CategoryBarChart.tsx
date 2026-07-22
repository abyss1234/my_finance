'use client';

import ChartCard from '@/components/ChartCard';
import type { AnalysisCategoryRow } from '@/lib/analysisTypes';
import { formatCurrency } from '@/lib/finance';
import type { TransactionKind } from '@/lib/transactionTypes';

type Props = {
  rows: AnalysisCategoryRow[];
  selectedType: '' | TransactionKind;
  isLoading: boolean;
  onSelect: (row: AnalysisCategoryRow) => void;
};

export default function CategoryBarChart({ rows, selectedType, isLoading, onSelect }: Props) {
  const chartType = selectedType || 'EXPENSE';
  const visibleRows = rows
    .filter((row) => row.kind === chartType)
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 8);
  const maximum = Math.max(...visibleRows.map((row) => row.amount), 0);
  const label = chartType === 'INCOME' ? 'Income' : 'Expense';

  return (
    <ChartCard
      title={`${label} by Category`}
      description="Ranked by total amount. Select a bar to see its transactions."
      isLoading={isLoading}
      isEmpty={visibleRows.length === 0}
      chartClassName="min-h-80"
      emptyTitle={`No ${label.toLocaleLowerCase()} category data`}
      emptyDescription="Choose another period or transaction type."
    >
      <div className="space-y-3" role="img" aria-label={`${label} category breakdown`}>
        {visibleRows.map((row) => {
          const width = maximum <= 0 ? 0 : Math.max(2, (row.amount / maximum) * 100);
          return (
            <button
              key={row.categoryId}
              type="button"
              className="block w-full rounded-md px-1 py-1.5 text-left transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-400"
              aria-label={`${row.name}: ${formatCurrency(row.amount)}, ${row.percentage.toFixed(1)} percent, ${row.count} transactions`}
              onClick={() => onSelect(row)}
            >
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-zinc-800">{row.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-zinc-950">
                  {formatCurrency(row.amount)}
                </span>
              </span>
              <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-zinc-100">
                <span
                  className={`block h-full rounded-full ${chartType === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className="mt-1 flex justify-between gap-3 text-xs text-zinc-500">
                <span>{row.count} transaction{row.count === 1 ? '' : 's'}</span>
                <span>{row.percentage.toFixed(1)}%</span>
              </span>
            </button>
          );
        })}
      </div>
    </ChartCard>
  );
}
