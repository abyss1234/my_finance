'use client';

import { useId, useState } from 'react';
import { ChevronDown, ListFilter, RotateCcw } from 'lucide-react';
import CategoryMultiSelect from '@/components/CategoryMultiSelect';
import { DatePreset, datePresetLabels } from '@/lib/finance';
import type { CategoryOption, TransactionKind } from '@/lib/transactionTypes';

type CommonProps = {
  categories: CategoryOption[];
  preset: DatePreset;
  presetOptions?: DatePreset[];
  from: string;
  to: string;
  comparePrevious?: boolean;
  comparisonRange?: string;
  comparisonUnavailable?: boolean;
  comparisonLoading?: boolean;
  collapsibleOnMobile?: boolean;
  mobileExpanded?: boolean;
  onPresetChange: (value: DatePreset) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onComparePreviousChange?: (value: boolean) => void;
  onMobileExpandedChange?: (value: boolean) => void;
  onReset?: () => void;
};

type SingleCategoryProps = {
  mode?: 'single';
  categoryId: string;
  onCategoryChange: (value: string) => void;
};

type TransactionCategoryProps = {
  mode: 'transactions';
  transactionType: '' | TransactionKind;
  categoryIds: string[];
  onTransactionTypeChange: (value: '' | TransactionKind) => void;
  onCategoryIdsChange: (ids: string[]) => void;
};

type Props = CommonProps & (SingleCategoryProps | TransactionCategoryProps);

export default function FinanceFilters(props: Props) {
  const id = useId();
  const {
    categories,
    preset,
    presetOptions = Object.keys(datePresetLabels) as DatePreset[],
    from,
    to,
    comparePrevious,
    comparisonRange,
    comparisonUnavailable = false,
    comparisonLoading = false,
    collapsibleOnMobile = false,
    mobileExpanded,
    onPresetChange,
    onFromChange,
    onToChange,
    onComparePreviousChange,
    onMobileExpandedChange,
    onReset,
  } = props;
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = mobileExpanded ?? internalMobileOpen;
  const isTransactionFilter = props.mode === 'transactions';
  const customRange = preset === 'CUSTOM';
  const hasComparison =
    comparePrevious !== undefined && onComparePreviousChange !== undefined;
  const visibleCategories = isTransactionFilter
    ? categories.filter((category) => category.kind === props.transactionType)
    : categories;

  function setMobileOpen(value: boolean) {
    if (onMobileExpandedChange) {
      onMobileExpandedChange(value);
      return;
    }
    setInternalMobileOpen(value);
  }

  return (
    <section className="card p-4" aria-labelledby={`${id}-title`}>
      <div className="mb-4 flex items-center gap-2">
        <ListFilter className="h-4 w-4 text-zinc-500" aria-hidden="true" />
        <h2 id={`${id}-title`} className="text-sm font-semibold text-zinc-900">
          Filters
        </h2>
        <div className="ml-auto flex items-center gap-1">
          {onReset && (
            <button type="button" className="btn min-h-8 px-2 text-xs" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset filters
            </button>
          )}
          {collapsibleOnMobile && (
            <button
              type="button"
              className="icon-btn sm:hidden"
              aria-label={mobileOpen ? 'Collapse filters' : 'Expand filters'}
              aria-expanded={mobileOpen}
              aria-controls={`${id}-fields`}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <ChevronDown
                className={`h-4 w-4 transition ${mobileOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </div>

      <div
        id={`${id}-fields`}
        className={`${collapsibleOnMobile && !mobileOpen ? 'hidden' : 'grid'} grid-cols-1 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-12`}
      >
        <div className={hasComparison ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <label className="label" htmlFor={`${id}-preset`}>
            Date range
          </label>
          <select
            id={`${id}-preset`}
            className="select"
            value={preset}
            onChange={(event) => onPresetChange(event.target.value as DatePreset)}
          >
            {presetOptions.map((value) => (
              <option key={value} value={value}>
                {datePresetLabels[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="label" htmlFor={`${id}-from`}>
            From
          </label>
          <input
            id={`${id}-from`}
            type="date"
            className={`input ${customRange ? '' : 'cursor-default bg-zinc-50 text-zinc-600'}`}
            value={from}
            readOnly={!customRange}
            aria-readonly={!customRange}
            title={customRange ? undefined : 'Select Custom Range to edit this date'}
            onChange={(event) => {
              if (customRange) onFromChange(event.target.value);
            }}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="label" htmlFor={`${id}-to`}>
            To
          </label>
          <input
            id={`${id}-to`}
            type="date"
            className={`input ${customRange ? '' : 'cursor-default bg-zinc-50 text-zinc-600'}`}
            value={to}
            readOnly={!customRange}
            aria-readonly={!customRange}
            title={customRange ? undefined : 'Select Custom Range to edit this date'}
            onChange={(event) => {
              if (customRange) onToChange(event.target.value);
            }}
          />
        </div>

        {isTransactionFilter ? (
          <>
            <div className="lg:col-span-2">
              <label className="label" htmlFor={`${id}-type`}>
                Type
              </label>
              <select
                id={`${id}-type`}
                className="select"
                value={props.transactionType}
                onChange={(event) =>
                  props.onTransactionTypeChange(event.target.value as '' | TransactionKind)
                }
              >
                <option value="">All Types</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>

            <div className={hasComparison ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <label className="label" htmlFor={`${id}-category`}>
                Category
              </label>
              <CategoryMultiSelect
                key={props.transactionType || 'all'}
                id={`${id}-category`}
                categories={visibleCategories}
                selectedIds={props.categoryIds}
                transactionType={props.transactionType}
                disabled={!props.transactionType}
                onChange={props.onCategoryIdsChange}
              />
            </div>
          </>
        ) : (
          <div className="lg:col-span-5">
            <label className="label" htmlFor={`${id}-category`}>
              Category
            </label>
            <select
              id={`${id}-category`}
              className="select"
              value={props.categoryId}
              onChange={(event) => props.onCategoryChange(event.target.value)}
            >
              <option value="">All Categories</option>
              {visibleCategories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name} ({category.kind})
                </option>
              ))}
            </select>
          </div>
        )}

        {hasComparison && (
          <div className="lg:col-span-2">
            <span id={`${id}-compare-label`} className="label">
              Compare with previous period
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={comparePrevious}
              aria-labelledby={`${id}-compare-label`}
              className="flex min-h-10 w-full items-center justify-between rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 transition focus-visible:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-300"
              onClick={() => onComparePreviousChange(!comparePrevious)}
            >
              <span>{comparePrevious ? 'Enabled' : 'Disabled'}</span>
              <span
                className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
                  comparePrevious ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
                aria-hidden="true"
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${
                    comparePrevious ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>
        )}

        {hasComparison && comparePrevious && (
          <p
            className={`sm:col-span-2 lg:col-span-12 text-xs ${
              comparisonUnavailable ? 'text-amber-700' : 'text-zinc-500'
            }`}
            aria-live="polite"
          >
            {comparisonLoading
              ? 'Loading previous-period range...'
              : comparisonRange
                ? `Previous period: ${comparisonRange}${comparisonUnavailable ? ' - No previous-period data' : ''}`
                : 'Previous-period range is unavailable.'}
          </p>
        )}
      </div>
    </section>
  );
}
