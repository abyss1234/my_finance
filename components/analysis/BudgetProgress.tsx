'use client';

import { FormEvent, useState } from 'react';
import { Plus, Save, Target, Trash2, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { authFetch } from '@/lib/apiClient';
import type { BudgetRecord } from '@/lib/analysisTypes';
import type { BudgetProgressItem } from '@/lib/budgets';
import { formatCurrency } from '@/lib/finance';
import type { CategoryOption } from '@/lib/transactionTypes';

type Props = {
  budgets: BudgetRecord[];
  progress: BudgetProgressItem[];
  categories: CategoryOption[];
  defaultPeriod: string;
  isLoading: boolean;
  error?: boolean;
  expenseAnalysisDisabled?: boolean;
  onChanged: () => unknown | Promise<unknown>;
  onSelect: (row: BudgetProgressItem) => void;
};

const statusDetails = {
  ON_TRACK: { label: 'On track', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  APPROACHING: { label: 'Approaching budget', bar: 'bg-amber-500', text: 'text-amber-700' },
  NEAR_LIMIT: { label: 'Near limit', bar: 'bg-orange-500', text: 'text-orange-700' },
  OVER: { label: 'Over budget', bar: 'bg-rose-600', text: 'text-rose-700' },
} as const;

export default function BudgetProgress({
  budgets,
  progress,
  categories,
  defaultPeriod,
  isLoading,
  error,
  expenseAnalysisDisabled = false,
  onChanged,
  onSelect,
}: Props) {
  const [isManaging, setIsManaging] = useState(false);
  const [period, setPeriod] = useState(defaultPeriod);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const expenseCategories = categories.filter((category) => category.kind === 'EXPENSE');

  function openManager() {
    setPeriod(defaultPeriod);
    setFormError('');
    setIsManaging(true);
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setIsSaving(true);

    try {
      const response = await authFetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          amount: Number(amount),
          categoryId: categoryId ? Number(categoryId) : null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setFormError(body?.error ?? 'Failed to save budget.');
        return;
      }
      setAmount('');
      await onChanged();
    } catch {
      setFormError('Failed to save budget.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteBudget(id: number) {
    if (!confirm('Delete this budget?')) return;
    const response = await authFetch(`/api/budgets/${id}`, { method: 'DELETE' });
    if (response.ok) await onChanged();
    else setFormError('Failed to delete budget.');
  }

  if (
    !isLoading &&
    !error &&
    !expenseAnalysisDisabled &&
    budgets.length === 0 &&
    progress.length === 0 &&
    !isManaging
  ) {
    return (
      <section
        className="card flex min-h-[176px] min-w-0 items-center p-5"
        aria-labelledby="empty-budget-title"
      >
        <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
            <Target className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="empty-budget-title" className="text-sm font-semibold text-zinc-900">
              No budget configured
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Create a monthly budget to monitor spending limits.
            </p>
          </div>
          <button type="button" className="btn shrink-0" onClick={openManager}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create budget
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900">Budget Progress</h2>
          <p className="mt-1 text-xs text-zinc-500">Monthly limits covering the selected period.</p>
        </div>
        <button
          type="button"
          className="icon-btn shrink-0"
          aria-label={isManaging ? 'Close budget manager' : 'Manage budgets'}
          title={isManaging ? 'Close' : 'Manage budgets'}
          onClick={() => (isManaging ? setIsManaging(false) : openManager())}
        >
          {isManaging ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {isManaging && (
        <div className="border-b border-zinc-200 bg-zinc-50/60 p-4">
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.4fr_1fr_auto] sm:items-end" onSubmit={saveBudget}>
            <div>
              <label className="label" htmlFor="budget-period">Month</label>
              <input id="budget-period" className="input" type="month" required value={period} onChange={(event) => setPeriod(event.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="budget-category">Scope</label>
              <select id="budget-category" className="select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">Overall expenses</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="budget-amount">Amount</label>
              <input id="budget-amount" className="input" type="number" min="0.01" step="0.01" required placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <button className="btn border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800" disabled={isSaving} aria-label="Save budget">
              <Save className="h-4 w-4" aria-hidden="true" />
              <span className="sm:sr-only">Save budget</span>
            </button>
          </form>

          {formError && <p className="mt-3 text-sm text-rose-700">{formError}</p>}

          {budgets.length > 0 && (
            <div className="mt-4 border-t border-zinc-200 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">Configured budgets</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {budgets.map((budget) => (
                  <div key={budget.id} className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-800">{budget.category?.name ?? 'Overall expenses'}</p>
                      <p className="text-xs text-zinc-500">{budget.period} - {formatCurrency(Number(budget.amount))}</p>
                    </div>
                    <button type="button" className="icon-btn text-rose-600 hover:bg-rose-50" aria-label={`Delete ${budget.period} ${budget.category?.name ?? 'overall'} budget`} onClick={() => deleteBudget(budget.id)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton rows={4} className="p-4" />
      ) : expenseAnalysisDisabled ? (
        <EmptyState
          icon={Target}
          title="Budget progress uses expense data"
          description="Choose All Types or Expense to compare spending with your budgets."
        />
      ) : error ? (
        <EmptyState icon={Target} title="Budget data could not be loaded" description="Try refreshing this page." />
      ) : progress.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No budgets for this period"
          description="Set an overall or category monthly budget to track spending limits."
          action={
            <button type="button" className="btn" onClick={openManager}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create budget
            </button>
          }
        />
      ) : (
        <div className="divide-y divide-zinc-100">
          {progress.map((row) => {
            const status = statusDetails[row.status];
            return (
              <button
                key={row.scopeKey}
                type="button"
                className="block w-full px-4 py-3 text-left transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
                onClick={() => onSelect(row)}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-900">{row.name}</span>
                    <span className="mt-0.5 block text-xs tabular-nums text-zinc-500">
                      {formatCurrency(row.spent)} / {formatCurrency(row.budget)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className={`block text-xs font-semibold ${status.text}`}>{status.label}</span>
                    <span className="mt-0.5 block text-xs tabular-nums text-zinc-500">
                      {row.remaining >= 0 ? `${formatCurrency(row.remaining)} remaining` : `${formatCurrency(Math.abs(row.remaining))} over`}
                    </span>
                  </span>
                </span>
                <span className="mt-2 flex items-center gap-3">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <span className={`block h-full rounded-full ${status.bar}`} style={{ width: `${Math.min(100, Math.max(0, row.percentage))}%` }} />
                  </span>
                  <span className="w-14 text-right text-xs font-semibold tabular-nums text-zinc-700">{row.percentage.toFixed(0)}%</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
