'use client';

import useSWR from 'swr';
import { FormEvent, useMemo, useState } from 'react';
import { authFetch, fetcher } from '@/lib/apiClient';

type Category = {
  id: number;
  name: string;
  kind: 'INCOME' | 'EXPENSE';
};

type EditState = {
  id: number;
  name: string;
};

export default function CategoriesPage() {
  const { data: categories, error, isLoading, mutate } = useSWR<Category[]>('/api/categories', fetcher);
  const [kind, setKind] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [name, setName] = useState('');
  const [edit, setEdit] = useState<EditState | null>(null);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const grouped = useMemo(
    () => ({
      EXPENSE: (categories ?? []).filter((category) => category.kind === 'EXPENSE'),
      INCOME: (categories ?? []).filter((category) => category.kind === 'INCOME'),
    }),
    [categories]
  );

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setIsSaving(true);

    try {
      const response = await authFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, kind }),
      });

      if (response.ok) {
        setName('');
        await mutate();
        return;
      }

      const body = await response.json().catch(() => null);
      setMessage(body?.error ?? 'Failed to add category.');
    } catch {
      setMessage('Failed to add category.');
    } finally {
      setIsSaving(false);
    }
  }

  async function renameCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit) return;

    setMessage('');
    setIsSaving(true);

    try {
      const response = await authFetch(`/api/categories/${edit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: edit.name }),
      });

      if (response.ok) {
        setEdit(null);
        await mutate();
        return;
      }

      const body = await response.json().catch(() => null);
      setMessage(body?.error ?? 'Failed to rename category.');
    } catch {
      setMessage('Failed to rename category.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    const ok = confirm(`Delete "${category.name}"? This only works if no transactions use it.`);
    if (!ok) return;

    setMessage('');
    setIsSaving(true);

    try {
      const response = await authFetch(`/api/categories/${category.id}`, { method: 'DELETE' });

      if (response.ok) {
        await mutate();
        return;
      }

      const body = await response.json().catch(() => null);
      setMessage(body?.error ?? 'Failed to delete category.');
    } catch {
      setMessage('Failed to delete category.');
    } finally {
      setIsSaving(false);
    }
  }

  function renderGroup(title: string, items: Category[]) {
    return (
      <section className="card overflow-hidden">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {items.map((category) => (
            <div key={category.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              {edit?.id === category.id ? (
                <form className="flex flex-1 gap-2" onSubmit={renameCategory}>
                  <input
                    className="input"
                    value={edit.name}
                    onChange={(event) => setEdit({ ...edit, name: event.target.value })}
                    autoFocus
                    required
                  />
                  <button className="btn" disabled={isSaving}>
                    Save
                  </button>
                  <button type="button" className="btn" onClick={() => setEdit(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div>
                    <div className="text-sm font-medium text-zinc-900">{category.name}</div>
                    <div className="text-xs text-zinc-500">{category.kind}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn"
                      onClick={() => {
                        setMessage('');
                        setEdit({ id: category.id, name: category.name });
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="btn text-red-600"
                      disabled={isSaving}
                      onClick={() => deleteCategory(category)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">No categories yet.</div>
          )}
        </div>
      </section>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Categories</h2>
        <p className="text-sm text-zinc-600">Add or rename transaction categories.</p>
      </div>

      <form className="card p-4" onSubmit={addCategory}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <div>
            <label className="label">Type</label>
            <select
              className="select"
              value={kind}
              onChange={(event) => setKind(event.target.value as 'EXPENSE' | 'INCOME')}
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </div>

          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Parking, Groceries, Bonus..."
              required
            />
          </div>

          <button className="btn" disabled={isSaving}>
            Add
          </button>
        </div>
      </form>

      {(message || error) && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {message || 'Failed to load categories.'}
        </div>
      )}

      {isLoading ? (
        <div className="card p-4 text-sm text-zinc-500">Loading...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {renderGroup('Expense Categories', grouped.EXPENSE)}
          {renderGroup('Income Categories', grouped.INCOME)}
        </div>
      )}
    </main>
  );
}
