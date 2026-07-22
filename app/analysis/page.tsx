'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import AnalysisSummaryCards from '@/components/analysis/AnalysisSummaryCards';
import BudgetProgress from '@/components/analysis/BudgetProgress';
import CategoryBarChart from '@/components/analysis/CategoryBarChart';
import CategoryDetailsTable from '@/components/analysis/CategoryDetailsTable';
import FinancialInsights from '@/components/analysis/FinancialInsights';
import MerchantSummary from '@/components/analysis/MerchantSummary';
import RelatedTransactions from '@/components/analysis/RelatedTransactions';
import TrendChart from '@/components/analysis/TrendChart';
import FinanceFilters from '@/components/FinanceFilters';
import PageHeader from '@/components/PageHeader';
import TransactionEditDialog from '@/components/TransactionEditDialog';
import { useFinanceFilters } from '@/hooks/useFinanceFilters';
import { useTransactionEditor } from '@/hooks/useTransactionEditor';
import { fetcher } from '@/lib/apiClient';
import type {
  AnalysisCategoryRow,
  AnalysisDetailFilter,
  AnalysisInsight,
  AnalysisResponse,
  BudgetRecord,
  GroupingSelection,
  MerchantAnalysisRow,
  TrendPoint,
} from '@/lib/analysisTypes';
import { budgetPeriods, buildBudgetProgress } from '@/lib/budgets';
import {
  dateInputToIso,
  datePresetLabels,
  formatCurrency,
  malaysiaDateKey,
  type DatePreset,
} from '@/lib/finance';
import type { CategoryOption, TransactionKind, TransactionRow } from '@/lib/transactionTypes';

const analysisPresets: DatePreset[] = [
  'THIS_WEEK',
  'THIS_MONTH',
  'LAST_MONTH',
  'LAST_3_MONTHS',
  'THIS_YEAR',
  'CUSTOM',
];

type TransactionResponse = {
  items: TransactionRow[];
  totals: { income: number; expense: number; net: number };
  page: number;
  pageSize: number;
  totalCount: number;
};

function applyDateRange(params: URLSearchParams, from: string, to: string) {
  const fromIso = dateInputToIso(from, 'start');
  const toIso = dateInputToIso(to, 'end');
  if (fromIso) params.set('from', fromIso);
  if (toIso) params.set('to', toIso);
}

export default function AnalysisPage() {
  const [transactionType, setTransactionType] = useState<'' | TransactionKind>('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [comparePrevious, setComparePrevious] = useState(true);
  const [grouping, setGrouping] = useState<GroupingSelection>('AUTO');
  const [detail, setDetail] = useState<AnalysisDetailFilter | null>(null);
  const [relatedPage, setRelatedPage] = useState(1);
  const filters = useFinanceFilters(() => {
    setDetail(null);
    setRelatedPage(1);
  });

  const invalidDateRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const { data: categories } = useSWR<CategoryOption[]>('/api/categories', fetcher);

  const analysisQuery = useMemo(() => {
    const params = new URLSearchParams();
    applyDateRange(params, filters.from, filters.to);
    params.set('preset', filters.preset);
    if (transactionType) params.set('type', transactionType);
    categoryIds.forEach((categoryId) => params.append('categoryId', categoryId));
    params.set('compare', String(comparePrevious));
    if (grouping !== 'AUTO') params.set('grouping', grouping);
    return `/api/analysis?${params.toString()}`;
  }, [filters.from, filters.to, filters.preset, transactionType, categoryIds, comparePrevious, grouping]);

  const {
    data,
    error,
    isLoading,
    mutate: mutateAnalysis,
  } = useSWR<AnalysisResponse>(invalidDateRange ? null : analysisQuery, fetcher, {
    revalidateOnFocus: false,
  });

  const periods = useMemo(() => budgetPeriods(filters.from, filters.to), [filters.from, filters.to]);
  const currentPeriod = malaysiaDateKey(new Date()).slice(0, 7);
  const budgetQuery = useMemo(() => {
    const params = new URLSearchParams();
    (periods.length > 0 ? periods : [currentPeriod]).forEach((period) =>
      params.append('period', period)
    );
    return `/api/budgets?${params.toString()}`;
  }, [periods, currentPeriod]);
  const {
    data: budgets,
    error: budgetError,
    isLoading: budgetsLoading,
    mutate: mutateBudgets,
  } = useSWR<BudgetRecord[]>(invalidDateRange ? null : budgetQuery, fetcher, {
    revalidateOnFocus: false,
  });

  const budgetProgress = useMemo(
    () => buildBudgetProgress(budgets ?? [], data?.byCategory ?? [], data?.totals.expense ?? 0),
    [budgets, data]
  );

  const relatedQuery = useMemo(() => {
    const params = new URLSearchParams();
    applyDateRange(params, detail?.from ?? filters.from, detail?.to ?? filters.to);

    const effectiveType = detail?.type ?? transactionType;
    const effectiveCategories = detail?.categoryIds ?? categoryIds;
    if (effectiveType) params.set('type', effectiveType);
    effectiveCategories.forEach((categoryId) => params.append('categoryId', categoryId));
    if (detail?.counterparty) params.set('counterparty', detail.counterparty);
    params.set('page', String(relatedPage));
    params.set('pageSize', '10');
    return `/api/transactions?${params.toString()}`;
  }, [filters.from, filters.to, transactionType, categoryIds, detail, relatedPage]);

  const {
    data: related,
    error: relatedError,
    isLoading: relatedLoading,
    mutate: mutateRelated,
  } = useSWR<TransactionResponse>(invalidDateRange ? null : relatedQuery, fetcher, {
    revalidateOnFocus: false,
  });

  const editor = useTransactionEditor({
    afterChange: async () => {
      await Promise.all([mutateAnalysis(), mutateRelated()]);
    },
  });

  const totalPages = related
    ? Math.max(1, Math.ceil(related.totalCount / related.pageSize))
    : 1;

  const insights = useMemo(() => {
    const budgetInsights: AnalysisInsight[] = budgetProgress
      .filter((row) => row.percentage > 90)
      .slice(0, 2)
      .map((row) => ({
        id: `budget-${row.scopeKey}`,
        title: row.percentage > 100
          ? `${row.name} is over budget`
          : `${row.name} has reached ${row.percentage.toFixed(0)}% of budget`,
        description: row.remaining < 0
          ? `Spending exceeded the limit by ${formatCurrency(Math.abs(row.remaining))}.`
          : `${formatCurrency(row.remaining)} remains.`,
        tone: row.percentage > 100 ? 'negative' : 'warning',
        type: 'EXPENSE',
        categoryId: row.categoryId ?? undefined,
      }));
    return [...(data?.insights ?? []), ...budgetInsights].slice(0, 7);
  }, [data?.insights, budgetProgress]);

  function showDetail(next: AnalysisDetailFilter) {
    setDetail(next);
    setRelatedPage(1);
    window.requestAnimationFrame(() => {
      document.getElementById('related-transactions')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  function detailLabel(subject: string, type?: TransactionKind) {
    return [subject, datePresetLabels[filters.preset], type === 'INCOME' ? 'Income' : type === 'EXPENSE' ? 'Expense' : null]
      .filter(Boolean)
      .join(' - ');
  }

  function selectSummary(label: string, type?: TransactionKind) {
    showDetail({ label: detailLabel(label, type), type });
  }

  function selectCategory(row: AnalysisCategoryRow) {
    showDetail({
      label: detailLabel(row.name, row.kind),
      type: row.kind,
      categoryIds: [String(row.categoryId)],
    });
  }

  function selectMerchant(row: MerchantAnalysisRow) {
    showDetail({
      label: detailLabel(row.name, row.kind),
      type: row.kind,
      counterparty: row.name === 'Unknown' ? '__UNKNOWN__' : row.name,
    });
  }

  function selectTrend(row: TrendPoint, type?: TransactionKind) {
    const period = row.date === row.endDate ? row.date : `${row.date} to ${row.endDate}`;
    showDetail({ label: detailLabel(period, type), type, from: row.date, to: row.endDate });
  }

  function selectInsight(insight: AnalysisInsight) {
    showDetail({
      label: detailLabel(insight.title, insight.type),
      type: insight.type,
      categoryIds: insight.categoryId ? [String(insight.categoryId)] : undefined,
      counterparty:
        insight.counterparty === 'Unknown' ? '__UNKNOWN__' : insight.counterparty,
    });
  }

  return (
    <main className="min-w-0 space-y-5">
      <PageHeader
        title="Analysis"
        description="Understand your income, expenses, cash flow, and financial trends."
      />

      <FinanceFilters
        mode="transactions"
        categories={categories ?? []}
        preset={filters.preset}
        presetOptions={analysisPresets}
        from={filters.from}
        to={filters.to}
        transactionType={transactionType}
        categoryIds={categoryIds}
        comparePrevious={comparePrevious}
        collapsibleOnMobile
        onPresetChange={filters.setPreset}
        onFromChange={filters.setFrom}
        onToChange={filters.setTo}
        onTransactionTypeChange={(value) => {
          setTransactionType(value);
          setCategoryIds([]);
          setDetail(null);
          setRelatedPage(1);
        }}
        onCategoryIdsChange={(ids) => {
          setCategoryIds(ids);
          setDetail(null);
          setRelatedPage(1);
        }}
        onComparePreviousChange={setComparePrevious}
      />

      {invalidDateRange && (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          The start date must be before or equal to the end date.
        </div>
      )}

      {error && !invalidDateRange && (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load analysis. Please try again.
        </div>
      )}

      {!invalidDateRange && !error && (
        <>
          <AnalysisSummaryCards
            totals={data?.totals}
            changes={data?.changes}
            compare={comparePrevious}
            isLoading={isLoading}
            onSelect={selectSummary}
          />

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
            <TrendChart
              rows={data?.trend ?? []}
              grouping={data?.meta.grouping ?? 'DAY'}
              selection={grouping}
              compare={comparePrevious}
              selectedType={transactionType}
              isLoading={isLoading}
              onGroupingChange={setGrouping}
              onPointSelect={selectTrend}
            />
            <CategoryBarChart
              rows={data?.byCategory ?? []}
              selectedType={transactionType}
              isLoading={isLoading}
              onSelect={selectCategory}
            />
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
            <BudgetProgress
              budgets={budgets ?? []}
              progress={budgetProgress}
              categories={categories ?? []}
              defaultPeriod={periods.at(-1) ?? currentPeriod}
              isLoading={budgetsLoading}
              error={Boolean(budgetError)}
              expenseAnalysisDisabled={transactionType === 'INCOME'}
              onChanged={mutateBudgets}
              onSelect={(row) =>
                showDetail({
                  label: detailLabel(row.name, 'EXPENSE'),
                  type: 'EXPENSE',
                  categoryIds: row.categoryId ? [String(row.categoryId)] : undefined,
                })
              }
            />
            <MerchantSummary
              rows={data?.merchants ?? []}
              selectedType={transactionType}
              compare={comparePrevious}
              isLoading={isLoading}
              onSelect={selectMerchant}
            />
          </div>

          <FinancialInsights
            insights={insights}
            isLoading={isLoading || budgetsLoading}
            onSelect={selectInsight}
          />

          <CategoryDetailsTable
            rows={data?.byCategory ?? []}
            compare={comparePrevious}
            isLoading={isLoading}
            onSelect={selectCategory}
          />

          <RelatedTransactions
            items={related?.items ?? []}
            detail={detail}
            isLoading={relatedLoading}
            error={Boolean(relatedError)}
            page={related?.page ?? relatedPage}
            totalPages={totalPages}
            totalCount={related?.totalCount ?? 0}
            onPageChange={setRelatedPage}
            onClear={() => {
              setDetail(null);
              setRelatedPage(1);
            }}
            onEdit={editor.openEditor}
            onDelete={editor.removeTransaction}
          />
        </>
      )}

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
