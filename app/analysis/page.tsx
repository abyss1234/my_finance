'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import SummaryCards from '@/components/SummaryCards';
import {
  DatePreset,
  dateInputToIso,
  dateInputValue,
  datePresetLabels,
  rangeForPreset,
} from '@/lib/finance';
import { fetcher } from '@/lib/apiClient';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, TimeScale);

type Category = { id: number; name: string; kind: 'INCOME' | 'EXPENSE' };

type AnalysisResponse = {
  byCategory: { categoryId: number; name: string; kind: 'INCOME' | 'EXPENSE'; amount: number }[];
  byDay: { date: string; income: number; expense: number; net: number }[];
  totals: { income: number; expense: number; net: number };
};

export default function AnalysisPage() {
  const [preset, setPreset] = useState<DatePreset>('THIS_MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const { data: categories } = useSWR<Category[]>('/api/categories', fetcher);

  const { from, to } = useMemo(() => {
    if (preset === 'CUSTOM') return { from: customFrom, to: customTo };

    const range = rangeForPreset(preset);
    return {
      from: dateInputValue(range.from),
      to: dateInputValue(range.to),
    };
  }, [preset, customFrom, customTo]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    const fromIso = dateInputToIso(from, 'start');
    const toIso = dateInputToIso(to, 'end');

    if (fromIso) params.set('from', fromIso);
    if (toIso) params.set('to', toIso);
    if (categoryId) params.set('categoryId', categoryId);

    const qs = params.toString();
    return qs ? `/api/analysis?${qs}` : '/api/analysis';
  }, [from, to, categoryId]);

  const { data, error, isLoading } = useSWR<AnalysisResponse>(query, fetcher, {
    revalidateOnFocus: false,
  });

  const pieData: ChartData<'pie', number[], string> = useMemo(() => {
    const rows = data?.byCategory ?? [];
    const palette = [
      '#2563eb',
      '#dc2626',
      '#059669',
      '#d97706',
      '#7c3aed',
      '#0891b2',
      '#be123c',
      '#4f46e5',
    ];

    return {
      labels: rows.map((category) => `${category.name} (${category.kind})`),
      datasets: [
        {
          data: rows.map((category) => category.amount),
          backgroundColor: rows.map((_, index) => palette[index % palette.length]),
          borderWidth: 0,
        },
      ],
    };
  }, [data]);

  const lineData: ChartData<'line', number[], string> = useMemo(() => {
    const rows = data?.byDay ?? [];
    return {
      labels: rows.map((day) => day.date),
      datasets: [
        {
          label: 'Income',
          data: rows.map((day) => day.income),
          borderColor: '#059669',
          backgroundColor: 'rgba(5,150,105,0.08)',
          tension: 0.2,
        },
        {
          label: 'Expense',
          data: rows.map((day) => day.expense),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.08)',
          tension: 0.2,
        },
        {
          label: 'Net',
          data: rows.map((day) => day.net),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.08)',
          tension: 0.2,
        },
      ],
    };
  }, [data]);

  const pieOptions: ChartOptions<'pie'> = useMemo(
    () => ({
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
      },
    }),
    []
  );

  const lineOptions: ChartOptions<'line'> = useMemo(
    () => ({
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: { unit: 'day', tooltipFormat: 'yyyy-MM-dd' },
        },
        y: { beginAtZero: true },
      },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { enabled: true },
      },
    }),
    []
  );

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Analysis</h2>
        <p className="text-sm text-zinc-600">
          Compare category totals and daily movement across the selected range.
        </p>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          <div className="sm:col-span-3">
            <label className="label">Date range</label>
            <select
              className="select"
              value={preset}
              onChange={(event) => setPreset(event.target.value as DatePreset)}
            >
              {Object.entries(datePresetLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label">From</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(event) => {
                setPreset('CUSTOM');
                setCustomFrom(event.target.value);
              }}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(event) => {
                setPreset('CUSTOM');
                setCustomTo(event.target.value);
              }}
            />
          </div>

          <div className="sm:col-span-3">
            <label className="label">Category</label>
            <select
              className="select"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">All Categories</option>
              {(categories ?? []).map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name} ({category.kind})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load analysis. Please try again.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">By Category</div>
          {isLoading && <div className="mt-4 text-sm text-zinc-500">Loading...</div>}
          {!isLoading && (data?.byCategory ?? []).length === 0 && (
            <div className="mt-4 text-sm text-zinc-500">No data for selected range.</div>
          )}
          {!isLoading && (data?.byCategory ?? []).length > 0 && (
            <div className="mt-4 h-72">
              <Pie data={pieData} options={pieOptions} />
            </div>
          )}
        </section>

        <section className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Time Series</div>
          {isLoading && <div className="mt-4 text-sm text-zinc-500">Loading...</div>}
          {!isLoading && (data?.byDay ?? []).length === 0 && (
            <div className="mt-4 text-sm text-zinc-500">No data for selected range.</div>
          )}
          {!isLoading && (data?.byDay ?? []).length > 0 && (
            <div className="mt-4 h-72">
              <Line data={lineData} options={lineOptions} />
            </div>
          )}
        </section>
      </div>

      <SummaryCards
        income={data?.totals.income ?? 0}
        expense={data?.totals.expense ?? 0}
        net={data?.totals.net ?? 0}
      />
    </main>
  );
}
