'use client';

import useSWR from 'swr';
import { useState, useMemo } from 'react';

type Category = { id: number; name: string; kind: 'INCOME'|'EXPENSE' };
const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function TransactionForm({ onCreated }: { onCreated?: () => void }) {
  const { data: categories } = useSWR<Category[]>('/api/categories', fetcher);

  const [type, setType] = useState<'INCOME'|'EXPENSE'>('EXPENSE');
  const options = useMemo(
    () => (categories ?? []).filter(c => c.kind === type),
    [categories, type]
  );

  async function submit(formData: FormData) {
    const payload = {
      type,
      amount: Number(formData.get('amount')),
      date: formData.get('date') || undefined,
      note: (formData.get('note') as string) || undefined,
      categoryId: Number(formData.get('categoryId')),
    };
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      (document.getElementById('tx-form') as HTMLFormElement)?.reset();
      onCreated?.();
    } else {
      alert('Failed to save');
    }
  }

  return (
    <form id="tx-form" className="card p-4" action={submit}>
      <div className="mb-3 flex gap-2">
        <button type="button"
          className={`btn ${type==='EXPENSE'?'bg-zinc-100':''}`}
          onClick={() => setType('EXPENSE')}>Expense</button>
        <button type="button"
          className={`btn ${type==='INCOME'?'bg-zinc-100':''}`}
          onClick={() => setType('INCOME')}>Income</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <label className="label">Amount</label>
          <input name="amount" type="number" step="0.01" min="0" required className="input" placeholder="0.00" />
        </div>
        <div className="sm:col-span-1">
          <label className="label">Date</label>
          <input name="date" type="date" className="input" />
        </div>
        <div className="sm:col-span-1">
          <label className="label">Category</label>
          <select name="categoryId" required className="select">
            <option value="">Select</option>
            {options.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-1">
          <label className="label">Note</label>
          <input name="note" type="text" className="input" placeholder="(optional)" />
        </div>
      </div>

      <div className="mt-4">
        <button className="btn">Add {type === 'EXPENSE' ? 'Expense' : 'Income'}</button>
      </div>
    </form>
  );
}
