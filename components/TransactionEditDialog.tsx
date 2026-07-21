'use client';

import { FormEvent, useEffect, useId } from 'react';
import { Save, X } from 'lucide-react';
import { dateTimeInputToIso, dateTimeInputValue } from '@/lib/finance';
import type { CategoryOption, TransactionEditForm } from '@/lib/transactionTypes';

type Props = {
  value: TransactionEditForm;
  categories: CategoryOption[];
  error: string;
  isSaving: boolean;
  onChange: (value: TransactionEditForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function TransactionEditDialog({
  value,
  categories,
  error,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: Props) {
  const titleId = useId();
  const categoryOptions = categories.filter((category) => category.kind === value.type);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSaving) onClose();
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSaving, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="absolute inset-0 bg-zinc-950/40" aria-label="Close edit transaction" onClick={onClose} />
      <form className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-xl" onSubmit={onSubmit}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-4 py-3 sm:px-5">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-zinc-950">Edit Transaction</h2>
            <p className="mt-1 text-sm text-zinc-500">Review the transaction details.</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" title="Close" disabled={isSaving} onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`${titleId}-type`}>Type</label>
              <select id={`${titleId}-type`} className="select" value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value as TransactionEditForm['type'], categoryId: '' })}>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor={`${titleId}-amount`}>Amount</label>
              <input id={`${titleId}-amount`} className="input" type="number" min="0" step="0.01" required autoFocus value={value.amount} onChange={(event) => onChange({ ...value, amount: event.target.value })} />
            </div>

            <div>
              <label className="label" htmlFor={`${titleId}-date`}>Date and time</label>
              <input id={`${titleId}-date`} className="input" type="datetime-local" required value={dateTimeInputValue(value.date)} onChange={(event) => onChange({ ...value, date: dateTimeInputToIso(event.target.value) })} />
            </div>

            <div>
              <label className="label" htmlFor={`${titleId}-category`}>Category</label>
              <select id={`${titleId}-category`} className="select" required value={value.categoryId} onChange={(event) => onChange({ ...value, categoryId: event.target.value })}>
                <option value="">Select</option>
                {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label" htmlFor={`${titleId}-source`}>Bank / E-wallet</label>
              <input id={`${titleId}-source`} className="input" value={value.source} onChange={(event) => onChange({ ...value, source: event.target.value })} />
            </div>

            <div>
              <label className="label" htmlFor={`${titleId}-counterparty`}>Person / Shop</label>
              <input id={`${titleId}-counterparty`} className="input" value={value.counterparty} onChange={(event) => onChange({ ...value, counterparty: event.target.value })} />
            </div>

            <div>
              <label className="label" htmlFor={`${titleId}-reference`}>Reference</label>
              <input id={`${titleId}-reference`} className="input" value={value.externalRef} onChange={(event) => onChange({ ...value, externalRef: event.target.value })} />
            </div>

            <div>
              <label className="label" htmlFor={`${titleId}-note`}>Note</label>
              <input id={`${titleId}-note`} className="input" value={value.note} onChange={(event) => onChange({ ...value, note: event.target.value })} />
            </div>
          </div>

          {value.rawBody && (
            <div className="mt-4">
              <label className="label" htmlFor={`${titleId}-raw`}>Raw Notification</label>
              <textarea id={`${titleId}-raw`} className="input min-h-24 resize-y" readOnly value={value.rawBody} />
            </div>
          )}

          {error && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-5">
          <button type="button" className="btn" disabled={isSaving} onClick={onClose}>Cancel</button>
          <button className="btn border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800" disabled={isSaving}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
