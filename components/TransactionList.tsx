'use client';

import useSWR from 'swr';
import { useEffect } from 'react';
import TransactionEditDialog from '@/components/TransactionEditDialog';
import TransactionTable from '@/components/TransactionTable';
import { useTransactionEditor } from '@/hooks/useTransactionEditor';
import { fetcher } from '@/lib/apiClient';
import type { CategoryOption, TransactionRow } from '@/lib/transactionTypes';

type TransactionResponse = {
  items: TransactionRow[];
  totals: { income: number; expense: number; net: number };
};

export default function TransactionList({
  refreshKey,
  onChanged,
}: {
  refreshKey: number;
  onChanged?: () => void;
}) {
  const { data, error, mutate, isLoading } = useSWR<TransactionResponse>(
    '/api/transactions',
    fetcher,
    { refreshInterval: 0 }
  );
  const { data: categories } = useSWR<CategoryOption[]>('/api/categories', fetcher);
  const editor = useTransactionEditor({
    afterChange: async () => {
      await mutate();
      onChanged?.();
    },
  });

  useEffect(() => {
    if (refreshKey > 0) void mutate();
  }, [mutate, refreshKey]);

  if (error) {
    return (
      <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Failed to load recent transactions.
      </div>
    );
  }

  return (
    <>
      <TransactionTable
        items={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No transactions yet."
        onEdit={editor.openEditor}
        onDelete={editor.removeTransaction}
      />

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
    </>
  );
}
