'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
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
import ChartCard from '@/components/ChartCard';
import FinanceFilters from '@/components/FinanceFilters';
import PageHeader from '@/components/PageHeader';
import SummaryCards from '@/components/SummaryCards';
import { useFinanceFilters } from '@/hooks/useFinanceFilters';
import { fetcher } from '@/lib/apiClient';
import { dateInputToIso } from '@/lib/finance';
import type { CategoryOption } from '@/lib/transactionTypes';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  TimeScale
);

type AnalysisResponse = {
  byCategory: { categoryId: number; name: string; kind: 'INCOME' | 'EXPENSE'; amount: number }[];
  byDay: { date: string; income: number; expense: number; net: number }[];
  totals: { income: number; expense: number; net: number };
};

export default function AnalysisPage() {
  const filters = useFinanceFilters();

  const { data: categories } = useSWR<CategoryOption[]>('/api/categories', fetcher);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    const fromIso = dateInputToIso(filters.from, 'start');
    const toIso = dateInputToIso(filters.to, 'end');

    if (fromIso) params.set('from', fromIso);
    if (toIso) params.set('to', toIso);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);

    const queryString = params.toString();
    return queryString ? `/api/analysis?${queryString}` : '/api/analysis';
  }, [filters.from, filters.to, filters.categoryId]);

  const { data, error, isLoading } = useSWR<AnalysisResponse>(query, fetcher, {
    revalidateOnFocus: false,
  });

  const pieData: ChartData<'pie', number[], string> = useMemo(() => {
    const rows = data?.byCategory ?? [];
    const palette = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2', '#be123c', '#4f46e5'];

    return {
      labels: rows.map((category) => `${category.name} (${category.kind})`),
      datasets: [{
        data: rows.map((category) => category.amount),
        backgroundColor: rows.map((_, index) => palette[index % palette.length]),
        borderWidth: 0,
      }],
    };
  }, [data]);

  const lineData: ChartData<'line', number[], string> = useMemo(() => {
    const rows = data?.byDay ?? [];
    return {
      labels: rows.map((day) => day.date),
      datasets: [
        { label: 'Income', data: rows.map((day) => day.income), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', tension: 0.2 },
        { label: 'Expense', data: rows.map((day) => day.expense), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.08)', tension: 0.2 },
        { label: 'Net', data: rows.map((day) => day.net), borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.08)', tension: 0.2 },
      ],
    };
  }, [data]);

  const pieOptions: ChartOptions<'pie'> = useMemo(() => ({
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
  }), []);

  const lineOptions: ChartOptions<'line'> = useMemo(() => ({
    maintainAspectRatio: false,
    scales: {
      x: { type: 'time', time: { unit: 'day', tooltipFormat: 'yyyy-MM-dd' }, grid: { display: false } },
      y: { beginAtZero: true, grid: { color: '#e4e4e7' } },
    },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
      tooltip: { enabled: true },
    },
  }), []);

  return (
    <main className="min-w-0 space-y-5">
      <PageHeader
        title="Analysis"
        description="Compare category totals and daily movement across the selected range."
      />

      <FinanceFilters
        categories={categories ?? []}
        preset={filters.preset}
        from={filters.from}
        to={filters.to}
        categoryId={filters.categoryId}
        onPresetChange={filters.setPreset}
        onFromChange={filters.setFrom}
        onToChange={filters.setTo}
        onCategoryChange={filters.setCategoryId}
      />

      {error && (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load analysis. Please try again.
        </div>
      )}

      <SummaryCards
        income={data?.totals.income ?? 0}
        expense={data?.totals.expense ?? 0}
        net={data?.totals.net ?? 0}
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <ChartCard
          title="Daily Movement"
          description="Income, expenses, and net value over time."
          isLoading={isLoading}
          isEmpty={(data?.byDay.length ?? 0) === 0}
          chartClassName="h-80 lg:h-96"
        >
          <Line data={lineData} options={lineOptions} />
        </ChartCard>

        <ChartCard
          title="By Category"
          description="Share of activity in the selected range."
          isLoading={isLoading}
          isEmpty={(data?.byCategory.length ?? 0) === 0}
          chartClassName="h-80 lg:h-96"
        >
          <Pie data={pieData} options={pieOptions} />
        </ChartCard>
      </div>
    </main>
  );
}
