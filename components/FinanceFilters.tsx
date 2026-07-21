'use client';

import { useId } from 'react';
import { ListFilter } from 'lucide-react';
import { DatePreset, datePresetLabels } from '@/lib/finance';
import type { CategoryOption } from '@/lib/transactionTypes';

type Props = {
  categories: CategoryOption[];
  preset: DatePreset;
  from: string;
  to: string;
  categoryId: string;
  onPresetChange: (value: DatePreset) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  pageSize?: 10 | 20 | 50;
  onPageSizeChange?: (value: 10 | 20 | 50) => void;
};

export default function FinanceFilters({
  categories,
  preset,
  from,
  to,
  categoryId,
  onPresetChange,
  onFromChange,
  onToChange,
  onCategoryChange,
  pageSize,
  onPageSizeChange,
}: Props) {
  const id = useId();
  const hasPageSize = pageSize !== undefined && onPageSizeChange !== undefined;

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

        <div className={hasPageSize ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <label className="label" htmlFor={`${id}-category`}>
            Category
          </label>
          <select
            id={`${id}-category`}
            className="select"
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name} ({category.kind})
              </option>
            ))}
          </select>
        </div>

        {hasPageSize && (
          <div className="lg:col-span-2">
            <label className="label" htmlFor={`${id}-rows`}>
              Rows
            </label>
            <select
              id={`${id}-rows`}
              className="select"
              value={pageSize}
              onChange={(event) => onPageSizeChange?.(Number(event.target.value) as 10 | 20 | 50)}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>
    </section>
  );
}
