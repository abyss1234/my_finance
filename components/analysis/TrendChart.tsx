'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import ChartCard from '@/components/ChartCard';
import type { AnalysisGrouping, GroupingSelection, TrendPoint } from '@/lib/analysisTypes';
import { formatCurrency } from '@/lib/finance';
import type { TransactionKind } from '@/lib/transactionTypes';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

type Props = {
  rows: TrendPoint[];
  grouping: AnalysisGrouping;
  selection: GroupingSelection;
  selectedType: '' | TransactionKind;
  compare: boolean;
  isLoading: boolean;
  onGroupingChange: (value: GroupingSelection) => void;
  onPointSelect: (row: TrendPoint, type?: TransactionKind) => void;
};

const dateFormatter = new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short' });
const monthFormatter = new Intl.DateTimeFormat('en-MY', { month: 'short', year: 'numeric' });

function labelFor(dateKey: string, grouping: AnalysisGrouping) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return grouping === 'MONTH' ? monthFormatter.format(date) : dateFormatter.format(date);
}

export default function TrendChart({
  rows,
  grouping,
  selection,
  selectedType,
  compare,
  isLoading,
  onGroupingChange,
  onPointSelect,
}: Props) {
  const data: ChartData<'line', number[], string> = useMemo(() => {
    const datasets: ChartData<'line', number[], string>['datasets'] = [];

    if (selectedType !== 'EXPENSE') {
      datasets.push({
        label: 'Income',
        data: rows.map((row) => row.income),
        borderColor: '#059669',
        backgroundColor: 'rgba(5,150,105,0.10)',
        pointBackgroundColor: '#059669',
        fill: true,
        tension: 0.25,
      });
    }
    if (selectedType !== 'INCOME') {
      datasets.push({
        label: 'Expense',
        data: rows.map((row) => row.expense),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.08)',
        pointBackgroundColor: '#dc2626',
        fill: true,
        tension: 0.25,
      });
    }
    datasets.push({
      label: 'Net cash flow',
      data: rows.map((row) => row.net),
      borderColor: '#4f46e5',
      backgroundColor: 'rgba(79,70,229,0.06)',
      pointBackgroundColor: '#4f46e5',
      tension: 0.25,
    });

    if (compare) {
      if (selectedType !== 'EXPENSE') {
        datasets.push({
          label: 'Previous income',
          data: rows.map((row) => row.previousIncome ?? 0),
          borderColor: 'rgba(5,150,105,0.45)',
          borderDash: [6, 5],
          pointRadius: 0,
          tension: 0.25,
        });
      }
      if (selectedType !== 'INCOME') {
        datasets.push({
          label: 'Previous expense',
          data: rows.map((row) => row.previousExpense ?? 0),
          borderColor: 'rgba(220,38,38,0.42)',
          borderDash: [6, 5],
          pointRadius: 0,
          tension: 0.25,
        });
      }
    }

    return {
      labels: rows.map((row) => labelFor(row.date, grouping)),
      datasets,
    };
  }, [rows, grouping, compare, selectedType]);

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onClick: (_, elements) => {
        const selected = elements[0];
        if (!selected) return;
        const label = data.datasets[selected.datasetIndex]?.label ?? '';
        if (label.startsWith('Previous')) return;
        const kind = label === 'Income' ? 'INCOME' : label === 'Expense' ? 'EXPENSE' : undefined;
        onPointSelect(rows[selected.index], kind);
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0, autoSkipPadding: 20, color: '#71717a' },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(228,228,231,0.75)' },
          ticks: {
            color: '#71717a',
            callback: (value) => `RM ${Intl.NumberFormat('en-MY', { notation: 'compact' }).format(Number(value))}`,
          },
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 16 },
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const row = rows[items[0]?.dataIndex];
              if (!row) return '';
              return row.date === row.endDate ? row.date : `${row.date} to ${row.endDate}`;
            },
            label: (context) => `${context.dataset.label}: ${formatCurrency(Number(context.raw))}`,
          },
        },
      },
    }),
    [data.datasets, onPointSelect, rows]
  );

  const summary = rows.length
    ? `Trend from ${rows[0].date} to ${rows[rows.length - 1].endDate}. Income ${formatCurrency(rows.reduce((sum, row) => sum + row.income, 0))}; expenses ${formatCurrency(rows.reduce((sum, row) => sum + row.expense, 0))}.`
    : 'No trend data for the selected range.';

  return (
    <ChartCard
      title="Income and Expense Trend"
      description={`Cash flow grouped ${grouping.toLocaleLowerCase()}. Select a point to inspect its transactions.`}
      actions={
        <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5" aria-label="Trend grouping">
          {(['AUTO', 'DAY', 'WEEK', 'MONTH'] as GroupingSelection[]).map((value) => (
            <button
              key={value}
              type="button"
              className={`min-h-8 rounded px-2 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                selection === value ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
              aria-pressed={selection === value}
              title={value === 'AUTO' ? `Automatic (${grouping.toLocaleLowerCase()})` : undefined}
              onClick={() => onGroupingChange(value)}
            >
              {value === 'AUTO' ? 'Auto' : value.charAt(0) + value.slice(1).toLocaleLowerCase()}
            </button>
          ))}
        </div>
      }
      isLoading={isLoading}
      isEmpty={rows.length === 0}
      chartClassName="h-80 lg:h-96"
      emptyTitle="No transactions found for this period"
      emptyDescription="Try another date range or add a transaction."
    >
      <div className="h-full" role="img" aria-label={summary}>
        <Line data={data} options={options} />
      </div>
    </ChartCard>
  );
}
