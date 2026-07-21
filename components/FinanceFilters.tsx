'use client';

import { useId } from 'react';
import { ListFilter } from 'lucide-react';
import CategoryMultiSelect from '@/components/CategoryMultiSelect';
import { DatePreset, datePresetLabels } from '@/lib/finance';
import type { CategoryOption, TransactionKind } from '@/lib/transactionTypes';

type CommonProps = {
  categories: CategoryOption[];
  preset: DatePreset;
  from: string;
  to: string;
  onPresetChange: (value: DatePreset) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
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
  const { categories, preset, from, to, onPresetChange, onFromChange, onToChange } = props;
  const isTransactionFilter = props.mode === 'transactions';
  const visibleCategories = isTransactionFilter
    ? categories.filter((category) => category.kind === props.transactionType)
    : categories;

  return (
    <section className="card p-4" aria-labelledby={`${id}-title`}>
      <div className="mb-4 flex items-center gap-2">
        <ListFilter className="h-4 w-4 text-zinc-500" aria-hidden="true" />
        <h2 id={`${id}-title`} className="text-sm font-semibold text-zinc-900">
          Filters
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <label className="label" htmlFor={`${id}-preset`}>
            Date range
          </label>
          <select
            id={`${id}-preset`}
            className="select"
            value={preset}
            onChange={(event) => onPresetChange(event.target.value as DatePreset)}
          >
            {Object.entries(datePresetLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
            className="input"
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="label" htmlFor={`${id}-to`}>
            To
          </label>
          <input
            id={`${id}-to`}
            type="date"
            className="input"
            value={to}
            onChange={(event) => onToChange(event.target.value)}
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

            <div className="lg:col-span-3">
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
      </div>
    </section>
  );
}
