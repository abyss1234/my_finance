'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Percent,
  Scale,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AnalysisChanges, AnalysisTotals } from '@/lib/analysisTypes';
import { formatCurrency } from '@/lib/finance';
import type { TransactionKind } from '@/lib/transactionTypes';

type Props = {
  totals?: AnalysisTotals;
  previousTotals?: AnalysisTotals | null;
  changes?: AnalysisChanges;
  compare: boolean;
  isLoading: boolean;
  onSelect: (label: string, type?: TransactionKind) => void;
};

type SummaryCardProps = {
  title: string;
  value: string;
  detail: string;
  change: number | null;
  previousValue: string | null;
  changeUnit?: 'percent' | 'points';
  compare: boolean;
  comparisonAvailable: boolean;
  positiveChangeIsGood: boolean;
  tone: 'income' | 'expense' | 'positive' | 'negative' | 'neutral' | 'savings';
  icon: LucideIcon;
  isLoading: boolean;
  disabled: boolean;
  onClick: () => void;
};

const toneClasses: Record<SummaryCardProps['tone'], string> = {
  income: 'border-emerald-200 bg-emerald-50/60',
  expense: 'border-rose-200 bg-rose-50/60',
  positive: 'border-emerald-200 bg-emerald-50/60',
  negative: 'border-rose-200 bg-rose-50/60',
  neutral: 'border-zinc-200 bg-white',
  savings: 'border-indigo-200 bg-indigo-50/60',
};

const iconClasses: Record<SummaryCardProps['tone'], string> = {
  income: 'bg-emerald-100 text-emerald-700',
  expense: 'bg-rose-100 text-rose-700',
  positive: 'bg-emerald-100 text-emerald-700',
  negative: 'bg-rose-100 text-rose-700',
  neutral: 'bg-zinc-100 text-zinc-600',
  savings: 'bg-indigo-100 text-indigo-700',
};

function SummaryCard({
  title,
  value,
  detail,
  change,
  previousValue,
  changeUnit = 'percent',
  compare,
  comparisonAvailable,
  positiveChangeIsGood,
  tone,
  icon: Icon,
  isLoading,
  disabled,
  onClick,
}: SummaryCardProps) {
  const hasChange = compare && comparisonAvailable && change !== null;
  const isImprovement = change !== null && (change >= 0) === positiveChangeIsGood;
  const ChangeIcon =
    !comparisonAvailable || change === null || change === 0
      ? Minus
      : change > 0
        ? TrendingUp
        : TrendingDown;
  const changeLabel =
    !comparisonAvailable
      ? 'No previous-period data'
      : change === null
        ? previousValue === null
          ? 'Previous value unavailable'
          : `Previous: ${previousValue}`
        : `${change > 0 ? '+' : ''}${change.toFixed(1)}${changeUnit === 'points' ? ' pts' : '%'} vs previous period`;

  return (
    <button
      type="button"
      className={`card min-w-0 p-4 text-left transition enabled:hover:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 disabled:cursor-default disabled:opacity-70 ${toneClasses[tone]}`}
      aria-label={`View transactions for ${title}`}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-zinc-600">{title}</p>
          {isLoading ? (
            <div className="mt-3 h-8 w-32 animate-pulse rounded bg-zinc-200/80" />
          ) : (
            <p className="mt-2 truncate text-xl font-semibold tabular-nums text-zinc-950 sm:text-2xl" title={value}>
              {value}
            </p>
          )}
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconClasses[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3 min-h-10 text-xs">
        {compare && !isLoading && (
          <p
            className={`flex items-center gap-1 font-medium ${
              !hasChange ? 'text-zinc-500' : isImprovement ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            <ChangeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {changeLabel}
          </p>
        )}
        <p className={`${compare && !isLoading ? 'mt-1' : ''} text-zinc-500`}>{detail}</p>
      </div>
    </button>
  );
}

export default function AnalysisSummaryCards({
  totals,
  previousTotals,
  changes,
  compare,
  isLoading,
  onSelect,
}: Props) {
  const income = totals?.income ?? 0;
  const expense = totals?.expense ?? 0;
  const net = totals?.net ?? 0;
  const netTone = net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral';
  const comparisonAvailable = previousTotals !== null && previousTotals !== undefined;

  return (
    <section className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4" aria-label="Financial summary">
      <SummaryCard
        title="Total Income"
        value={formatCurrency(income)}
        detail={`${totals?.incomeCount ?? 0} income transaction${totals?.incomeCount === 1 ? '' : 's'}`}
        change={changes?.income ?? null}
        previousValue={previousTotals ? formatCurrency(previousTotals.income) : null}
        compare={compare}
        comparisonAvailable={comparisonAvailable}
        positiveChangeIsGood
        tone="income"
        icon={ArrowUpRight}
        isLoading={isLoading}
        disabled={(totals?.incomeCount ?? 0) === 0}
        onClick={() => onSelect('Total Income', 'INCOME')}
      />
      <SummaryCard
        title="Total Expense"
        value={formatCurrency(expense)}
        detail={`${totals?.expenseCount ?? 0} expense transaction${totals?.expenseCount === 1 ? '' : 's'}`}
        change={changes?.expense ?? null}
        previousValue={previousTotals ? formatCurrency(previousTotals.expense) : null}
        compare={compare}
        comparisonAvailable={comparisonAvailable}
        positiveChangeIsGood={false}
        tone="expense"
        icon={ArrowDownRight}
        isLoading={isLoading}
        disabled={(totals?.expenseCount ?? 0) === 0}
        onClick={() => onSelect('Total Expense', 'EXPENSE')}
      />
      <SummaryCard
        title="Net Cash Flow"
        value={formatCurrency(net)}
        detail={net > 0 ? 'Positive cash flow' : net < 0 ? 'Negative cash flow' : 'Balanced cash flow'}
        change={changes?.net ?? null}
        previousValue={previousTotals ? formatCurrency(previousTotals.net) : null}
        compare={compare}
        comparisonAvailable={comparisonAvailable}
        positiveChangeIsGood
        tone={netTone}
        icon={Scale}
        isLoading={isLoading}
        disabled={(totals?.totalCount ?? 0) === 0}
        onClick={() => onSelect('Net Cash Flow')}
      />
      <SummaryCard
        title="Savings Rate"
        value={totals?.savingsRate === null || totals?.savingsRate === undefined ? '-' : `${totals.savingsRate.toFixed(1)}%`}
        detail="Net cash flow as a share of income"
        change={changes?.savingsRate ?? null}
        previousValue={
          previousTotals?.savingsRate === null || previousTotals?.savingsRate === undefined
            ? null
            : `${previousTotals.savingsRate.toFixed(1)}%`
        }
        changeUnit="points"
        compare={compare}
        comparisonAvailable={comparisonAvailable}
        positiveChangeIsGood
        tone="savings"
        icon={Percent}
        isLoading={isLoading}
        disabled={(totals?.totalCount ?? 0) === 0}
        onClick={() => onSelect('Savings Rate')}
      />
    </section>
  );
}
