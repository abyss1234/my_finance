'use client';

import { FormEvent, useState } from 'react';
import { authFetch } from '@/lib/apiClient';
import {
  TransactionEditForm,
  TransactionRow,
  transactionToEditForm,
} from '@/lib/transactionTypes';

type Options = {
  afterChange: () => void | Promise<void>;
};

export function useTransactionEditor({ afterChange }: Options) {
  const [editForm, setEditForm] = useState<TransactionEditForm | null>(null);
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function openEditor(transaction: TransactionRow) {
    setEditError('');
    setEditForm(transactionToEditForm(transaction));
  }

  function closeEditor() {
    if (isSaving) return;
    setEditForm(null);
    setEditError('');
  }

  async function removeTransaction(id: number) {
    if (!confirm('Delete this transaction?')) return;

    const response = await authFetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (response.ok) {
      await afterChange();
      return;
    }

    alert('Failed to delete');
  }

  async function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm || !confirm('Save changes to this transaction?')) return;

    setEditError('');
    setIsSaving(true);

    try {
      const response = await authFetch(`/api/transactions/${editForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editForm.type,
          amount: Number(editForm.amount),
          date: editForm.date,
          categoryId: Number(editForm.categoryId),
          note: editForm.note,
          source: editForm.source,
          counterparty: editForm.counterparty,
          externalRef: editForm.externalRef,
        }),
      });

      if (response.ok) {
        setEditForm(null);
        await afterChange();
        return;
      }

      const body = await response.json().catch(() => null);
      setEditError(body?.error ?? 'Failed to update transaction.');
    } catch {
      setEditError('Failed to update transaction.');
    } finally {
      setIsSaving(false);
    }
  }

  return {
    editForm,
    editError,
    isSaving,
    openEditor,
    closeEditor,
    removeTransaction,
    saveTransaction,
    setEditForm,
  };
}
