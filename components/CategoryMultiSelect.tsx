'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { CategoryOption, TransactionKind } from '@/lib/transactionTypes';

type Props = {
  id: string;
  categories: CategoryOption[];
  selectedIds: string[];
  transactionType: '' | TransactionKind;
  disabled: boolean;
  onChange: (ids: string[]) => void;
};

export default function CategoryMultiSelect({
  id: buttonId,
  categories,
  selectedIds,
  transactionType,
  disabled,
  onChange,
}: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const typeLabel = transactionType === 'INCOME' ? 'income' : 'expense';
  const selectedCategories = categories.filter((category) =>
    selectedIds.includes(String(category.id))
  );

  const buttonText = disabled
    ? 'Select a type first'
    : selectedCategories.length === 0
      ? `All ${typeLabel} categories`
      : selectedCategories.length === 1
        ? selectedCategories[0].name
        : `${selectedCategories.length} categories selected`;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function toggleCategory(categoryId: string) {
    onChange(
      selectedIds.includes(categoryId)
        ? selectedIds.filter((id) => id !== categoryId)
        : [...selectedIds, categoryId]
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        id={buttonId}
        type="button"
        className="select flex items-center justify-between gap-2 text-left"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="min-w-0 truncate">{buttonText}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
      </button>

      {isOpen && !disabled && (
        <div
          id={`${id}-menu`}
          role="group"
          aria-label="Categories"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 shadow-lg"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-400"
            onClick={() => onChange([])}
          >
            <Check
              className={`h-4 w-4 shrink-0 ${selectedIds.length === 0 ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden="true"
            />
            All {typeLabel} categories
          </button>

          {categories.map((category) => {
            const categoryId = String(category.id);
            return (
              <label
                key={category.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-400"
                  checked={selectedIds.includes(categoryId)}
                  onChange={() => toggleCategory(categoryId)}
                />
                <span className="min-w-0 wrap-break-word">{category.name}</span>
              </label>
            );
          })}

          {categories.length === 0 && (
            <p className="px-2 py-3 text-sm text-zinc-500">No categories available.</p>
          )}
        </div>
      )}
    </div>
  );
}
