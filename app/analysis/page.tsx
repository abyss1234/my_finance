'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { ChevronDown } from 'lucide-react';
import AnalysisSummaryCards from '@/components/analysis/AnalysisSummaryCards';
import BudgetProgress from '@/components/analysis/BudgetProgress';
import CategoryBarChart from '@/components/analysis/CategoryBarChart';
import CategoryDetailsTable from '@/components/analysis/CategoryDetailsTable';
import FinancialInsights from '@/components/analysis/FinancialInsights';
import MerchantSummary from '@/components/analysis/MerchantSummary';
import RelatedTransactions from '@/components/analysis/RelatedTransactions';
import StickyAnalysisFilters from '@/components/analysis/StickyAnalysisFilters';
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
  formatMalaysiaDate,
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

const monthYearFormatter = new Intl.DateTimeFormat('en-MY', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const shortDateFormatter = new Intl.DateTimeFormat('en-MY', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function dateKeyToDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function compactDateLabel(preset: DatePreset, from: string, to: string) {
  if (
    (preset === 'THIS_MONTH' || preset === 'LAST_MONTH') &&
    from
  ) {
    return monthYearFormatter.format(dateKeyToDate(from));
  }
  if (preset !== 'CUSTOM') return datePresetLabels[preset];
  if (!from || !to) return 'Custom Range';
  if (from === to) return shortDateFormatter.format(dateKeyToDate(from));
  return `${shortDateFormatter.format(dateKeyToDate(from))} - ${shortDateFormatter.format(dateKeyToDate(to))}`;
}

export default function AnalysisPage() {
  const [transactionType, setTransactionType] = useState<'' | TransactionKind>('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [comparePrevious, setComparePrevious] = useState(false);
  const [grouping, setGrouping] = useState<GroupingSelection>('AUTO');
  const [detail, setDetail] = useState<AnalysisDetailFilter | null>(null);
  const [relatedPage, setRelatedPage] = useState(1);
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);
  const [showStickyFilters, setShowStickyFilters] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filters = useFinanceFilters(() => {
    setDetail(null);
    setRelatedPage(1);
  });

  useEffect(() => {
    const filterPanel = filterPanelRef.current;
    if (!filterPanel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyFilters(!entry.isIntersecting),
      { rootMargin: '-72px 0px 0px', threshold: 0 }
    );
    observer.observe(filterPanel);
    return () => observer.disconnect();
  }, []);

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

  const effectiveFrom = data?.meta.from ? malaysiaDateKey(data.meta.from) : filters.from;
  const effectiveTo = data?.meta.to ? malaysiaDateKey(data.meta.to) : filters.to;
  const currentRange = effectiveFrom && effectiveTo
    ? `${shortDateFormatter.format(dateKeyToDate(effectiveFrom))} - ${shortDateFormatter.format(dateKeyToDate(effectiveTo))}`
    : 'Selected period';
  const periodLabel = data?.meta.periodMode === 'month-to-date'
    ? 'Month to date'
    : data?.meta.periodMode === 'matched-days'
      ? 'Matching days in each month'
      : 'Selected period';

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

  const comparisonRange =
    data?.meta.previousFrom && data.meta.previousTo
      ? `${formatMalaysiaDate(data.meta.previousFrom)} - ${formatMalaysiaDate(data.meta.previousTo)}`
      : undefined;
  const comparisonAvailable = Boolean(
    comparePrevious && data?.meta.previousDataAvailable
  );
  const comparisonUnavailable = Boolean(
    comparePrevious && !isLoading && data && !data.meta.previousDataAvailable
  );
  const comparisonLabel = data?.meta.periodMode === 'month-to-date'
    ? 'Same days last month'
    : data?.meta.periodMode === 'matched-days'
      ? 'Previous month (limited to its number of days)'
      : 'Previous period';

  const stickyFilterSummary = useMemo(() => {
    const typeLabel =
      transactionType === 'INCOME'
        ? 'Income'
        : transactionType === 'EXPENSE'
          ? 'Expense'
          : 'All Types';
    const selectedCategoryNames = categories
      ?.filter((category) => categoryIds.includes(String(category.id)))
      .map((category) => category.name);
    const categoryLabel =
      categoryIds.length === 0
        ? 'All Categories'
        : categoryIds.length === 1
          ? selectedCategoryNames?.[0] ?? '1 Category'
          : `${categoryIds.length} Categories`;

    return [
      data?.meta.periodMode && data.meta.periodMode !== 'full-period'
        ? `${periodLabel}: ${currentRange}`
        : compactDateLabel(filters.preset, filters.from, filters.to),
      typeLabel,
      categoryLabel,
      comparePrevious ? 'Compare On' : 'Compare Off',
    ].join(' · ');
  }, [
    categories,
    categoryIds,
    comparePrevious,
    filters.from,
    filters.preset,
    filters.to,
    transactionType,
    data,
    periodLabel,
    currentRange,
  ]);

  const relatedQuery = useMemo(() => {
    const params = new URLSearchParams();
    applyDateRange(params, detail?.from ?? effectiveFrom, detail?.to ?? effectiveTo);

    const effectiveType = detail?.type ?? transactionType;
    const effectiveCategories = detail?.categoryIds ?? categoryIds;
    if (effectiveType) params.set('type', effectiveType);
    effectiveCategories.forEach((categoryId) => params.append('categoryId', categoryId));
    if (detail?.counterparty) params.set('counterparty', detail.counterparty);
    params.set('page', String(relatedPage));
    params.set('pageSize', '10');
    return `/api/transactions?${params.toString()}`;
  }, [effectiveFrom, effectiveTo, transactionType, categoryIds, detail, relatedPage]);

  const {
    data: related,
    error: relatedError,
    isLoading: relatedLoading,
    mutate: mutateRelated,
  } = useSWR<TransactionResponse>(invalidDateRange || !data ? null : relatedQuery, fetcher, {
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
    const candidates = data?.insights ?? [];
    const monthlyBudgetApplies = !budgetError && transactionType !== 'INCOME' &&
      (filters.preset === 'THIS_MONTH' || filters.preset === 'LAST_MONTH') &&
      data?.meta.periodMode !== 'matched-days';
    const budget = monthlyBudgetApplies ? budgetProgress
      .filter((row) => row.budget > 0 && row.spent > 0 &&
        (categoryIds.length === 0 || (row.categoryId !== null && categoryIds.includes(String(row.categoryId)))))
      .sort((left, right) => right.percentage - left.percentage)[0] : undefined;
    if (!budget) return candidates.slice(0, 3);

    const budgetInsight: AnalysisInsight = {
      id: `budget-${budget.scopeKey}`,
      title: budget.remaining < 0
        ? `${budget.name} is ${formatCurrency(Math.abs(budget.remaining))} over budget`
        : `${budget.name} has ${formatCurrency(budget.remaining)} remaining`,
      description: `${formatCurrency(budget.spent)} of the ${formatCurrency(budget.budget)} monthly budget used (${budget.percentage.toFixed(0)}%).`,
      tone: budget.remaining < 0 ? 'negative' : budget.percentage >= 90 ? 'warning' : 'neutral',
      type: 'EXPENSE',
      categoryId: budget.categoryId ?? undefined,
    };
    return budget.remaining < 0
      ? [budgetInsight, ...candidates].slice(0, 3)
      : [...candidates.slice(0, 2), budgetInsight].slice(0, 3);
  }, [data, budgetProgress, budgetError, transactionType, filters.preset, categoryIds]);

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
    return [subject, currentRange, type === 'INCOME' ? 'Income' : type === 'EXPENSE' ? 'Expense' : null]
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
    const from = effectiveFrom && effectiveFrom > row.date ? effectiveFrom : row.date;
    const to = effectiveTo && effectiveTo < row.endDate ? effectiveTo : row.endDate;
    const period = from === to ? from : `${from} to ${to}`;
    showDetail({ label: detailLabel(period, type), type, from, to });
  }

  function selectInsight(insight: AnalysisInsight) {
    const previous = insight.period === 'previous';
    showDetail({
      label: previous
        ? `${insight.title} - Previous period: ${comparisonRange}`
        : detailLabel(insight.title, insight.type),
      type: insight.type,
      categoryIds: insight.categoryId ? [String(insight.categoryId)] : undefined,
      counterparty:
        insight.counterparty === 'Unknown' ? '__UNKNOWN__' : insight.counterparty,
      from: previous && data?.meta.previousFrom ? malaysiaDateKey(data.meta.previousFrom) : undefined,
      to: previous && data?.meta.previousTo ? malaysiaDateKey(data.meta.previousTo) : undefined,
    });
  }

  function resetFilters() {
    filters.reset();
    setTransactionType('');
    setCategoryIds([]);
    setComparePrevious(false);
    setGrouping('AUTO');
    setDetail(null);
    setRelatedPage(1);
  }

  function openFullFilters() {
    setMobileFiltersExpanded(true);
    filterPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="min-w-0 space-y-5">
      <PageHeader
        title="Analysis"
        description="Understand your income, expenses, cash flow, and financial trends."
      />

      <StickyAnalysisFilters
        visible={showStickyFilters}
        summary={stickyFilterSummary}
        onOpen={openFullFilters}
      />

      <div ref={filterPanelRef} className="scroll-mt-20">
        <FinanceFilters
          mode="transactions"
          categories={categories ?? []}
          preset={filters.preset}
          presetOptions={analysisPresets}
          from={effectiveFrom}
          to={effectiveTo}
          transactionType={transactionType}
          categoryIds={categoryIds}
          comparePrevious={comparePrevious}
          comparisonRange={comparisonRange}
          comparisonLabel={comparisonLabel}
          comparisonUnavailable={comparisonUnavailable}
          comparisonLoading={comparePrevious && isLoading}
          collapsibleOnMobile
          mobileExpanded={mobileFiltersExpanded}
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
          onComparePreviousChange={(value) => {
            setComparePrevious(value);
            setDetail(null);
            setRelatedPage(1);
          }}
          onMobileExpandedChange={setMobileFiltersExpanded}
          onReset={resetFilters}
        />
      </div>

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
            previousTotals={data?.previousTotals}
            changes={data?.changes}
            compare={comparePrevious}
            isLoading={isLoading}
            onSelect={selectSummary}
          />

          <FinancialInsights
            insights={insights}
            description={`${periodLabel}: ${currentRange}${comparePrevious && comparisonRange ? ` | Compared with ${comparisonRange}` : ''}`}
            isLoading={isLoading || budgetsLoading}
            onSelect={selectInsight}
          />

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
            <TrendChart
              rows={data?.trend ?? []}
              grouping={data?.meta.grouping ?? 'DAY'}
              selection={grouping}
              compare={comparisonAvailable}
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

          <details className="group min-w-0 border-t border-zinc-200 pt-2">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded px-1 text-sm font-semibold text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 [&::-webkit-details-marker]:hidden">
              Budget and merchant details
              <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-2 grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
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
                compare={comparisonAvailable}
                isLoading={isLoading}
                onSelect={selectMerchant}
              />
            </div>
          </details>

          <details className="group min-w-0 border-t border-zinc-200 pt-2">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded px-1 text-sm font-semibold text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 [&::-webkit-details-marker]:hidden">
              Category details
              <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-2">
              <CategoryDetailsTable
                rows={data?.byCategory ?? []}
                comparisonAvailable={comparisonAvailable}
                isLoading={isLoading}
                onSelect={selectCategory}
              />
            </div>
          </details>

          <RelatedTransactions
            items={related?.items ?? []}
            detail={detail}
            isLoading={isLoading || relatedLoading}
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
