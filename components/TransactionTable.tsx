import { Pencil, Trash2 } from 'lucide-react';
import {
  formatCurrency,
  formatMalaysiaDate,
  formatMalaysiaTime,
} from '@/lib/finance';
import type { TransactionRow } from '@/lib/transactionTypes';

type Props = {
  items: TransactionRow[];
  isLoading?: boolean;
  emptyMessage: string;
  onEdit: (transaction: TransactionRow) => void;
  onDelete: (id: number) => void;
};

function TypeLabel({ type }: { type: TransactionRow['type'] }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
        type === 'INCOME'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-rose-50 text-rose-700'
      }`}
    >
      {type === 'INCOME' ? 'Income' : 'Expense'}
    </span>
  );
}

function RowActions({ transaction, onEdit, onDelete }: Omit<Props, 'items' | 'isLoading' | 'emptyMessage'> & { transaction: TransactionRow }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        className="icon-btn"
        aria-label={`Edit transaction ${transaction.id}`}
        title="Edit transaction"
        onClick={() => onEdit(transaction)}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="icon-btn text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        aria-label={`Delete transaction ${transaction.id}`}
        title="Delete transaction"
        onClick={() => onDelete(transaction.id)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function TransactionTable({
  items,
  isLoading = false,
  emptyMessage,
  onEdit,
  onDelete,
}: Props) {
  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[820px] table-fixed text-sm">
          <colgroup>
            <col className="w-28" />
            <col className="w-20" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-40" />
            <col className="w-28" />
            <col />
            <col className="w-20" />
          </colgroup>
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">Date</th>
              <th scope="col" className="px-4 py-3 text-left">Type</th>
              <th scope="col" className="px-4 py-3 text-left">Category</th>
              <th scope="col" className="px-4 py-3 text-left">Source</th>
              <th scope="col" className="px-4 py-3 text-left">Person / Shop</th>
              <th scope="col" className="px-4 py-3 text-right">Amount</th>
              <th scope="col" className="px-4 py-3 text-left">Note</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoading && (
              <tr>
                <td className="px-4 py-10 text-center text-zinc-500" colSpan={8}>Loading...</td>
              </tr>
            )}
            {!isLoading && items.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-zinc-50/70">
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="font-medium text-zinc-800">{formatMalaysiaDate(transaction.date)}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">{formatMalaysiaTime(transaction.date)}</div>
                </td>
                <td className="px-4 py-3"><TypeLabel type={transaction.type} /></td>
                <td className="truncate px-4 py-3 text-zinc-700" title={transaction.category.name}>{transaction.category.name}</td>
                <td className="truncate px-4 py-3 text-zinc-600" title={transaction.source ?? ''}>{transaction.source ?? '-'}</td>
                <td className="truncate px-4 py-3 text-zinc-700" title={transaction.counterparty ?? ''}>{transaction.counterparty ?? '-'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-zinc-900">{formatCurrency(Number(transaction.amount))}</td>
                <td className="truncate px-4 py-3 text-zinc-600" title={transaction.note ?? ''}>{transaction.note ?? '-'}</td>
                <td className="px-3 py-2"><RowActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} /></td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-zinc-500" colSpan={8}>{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-zinc-100 lg:hidden">
        {isLoading && <div className="p-8 text-center text-sm text-zinc-500">Loading...</div>}
        {!isLoading && items.map((transaction) => (
          <article key={transaction.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-900">{formatMalaysiaDate(transaction.date)}</div>
                <div className="text-xs text-zinc-500">{formatMalaysiaTime(transaction.date)}</div>
              </div>
              <div className="text-right">
                <div className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-950">{formatCurrency(Number(transaction.amount))}</div>
                <div className="mt-1"><TypeLabel type={transaction.type} /></div>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="min-w-0">
                <dt className="text-xs text-zinc-500">Category</dt>
                <dd className="truncate text-zinc-800">{transaction.category.name}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-zinc-500">Source</dt>
                <dd className="truncate text-zinc-800">{transaction.source ?? '-'}</dd>
              </div>
              <div className="col-span-2 min-w-0">
                <dt className="text-xs text-zinc-500">Person / Shop</dt>
                <dd className="wrap-break-word text-zinc-800">{transaction.counterparty ?? '-'}</dd>
              </div>
              {transaction.note && (
                <div className="col-span-2 min-w-0">
                  <dt className="text-xs text-zinc-500">Note</dt>
                  <dd className="wrap-break-word text-zinc-700">{transaction.note}</dd>
                </div>
              )}
            </dl>

            <RowActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
          </article>
        ))}
        {!isLoading && items.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500">{emptyMessage}</div>
        )}
      </div>
    </section>
  );
}
