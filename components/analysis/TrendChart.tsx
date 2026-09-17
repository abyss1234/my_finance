'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { Line } from 'react-chartjs-2';
import {
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { ChartData, ChartOptions, Plugin } from 'chart.js';
import ChartCard from '@/components/ChartCard';
import type { AnalysisGrouping, GroupingSelection, TrendPoint } from '@/lib/analysisTypes';
import { formatCurrency } from '@/lib/finance';
import type { TransactionKind } from '@/lib/transactionTypes';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
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

type SeriesKey = 'income' | 'expense' | 'net' | 'previousIncome' | 'previousExpense';
type TrendSeries = {
  key: SeriesKey;
  label: string;
  color: string;
  type?: TransactionKind;
  previous?: boolean;
};

const allSeries: TrendSeries[] = [
  { key: 'income', label: 'Income', color: '#059669', type: 'INCOME' },
  { key: 'expense', label: 'Expense', color: '#e11d48', type: 'EXPENSE' },
  { key: 'net', label: 'Net cash flow', color: '#6366f1' },
  { key: 'previousIncome', label: 'Previous income', color: '#6eaa98', type: 'INCOME', previous: true },
  { key: 'previousExpense', label: 'Previous expense', color: '#d695a3', type: 'EXPENSE', previous: true },
];
const groupingLabels = { DAY: 'Daily', WEEK: 'Weekly', MONTH: 'Monthly' };
const dateFormatter = new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('en-MY', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const fullDateFormatter = new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeZone: 'UTC' });
const compactAmount = new Intl.NumberFormat('en-MY', { notation: 'compact', maximumFractionDigits: 1 });

function subscribeToMotionPreference(callback: () => void) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  preference.addEventListener('change', callback);
  return () => preference.removeEventListener('change', callback);
}

const hoverGuide: Plugin<'line'> = {
  id: 'trend-hover-guide',
  afterDatasetsDraw(chart) {
    const point = chart.tooltip?.getActiveElements()[0]?.element;
    if (!point) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 1;
    ctx.moveTo(point.x, chartArea.top);
    ctx.lineTo(point.x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};
const chartPlugins = [hoverGuide];

function periodLabel(row: TrendPoint) {
  const from = fullDateFormatter.format(new Date(`${row.date}T00:00:00Z`));
  const to = fullDateFormatter.format(new Date(`${row.endDate}T00:00:00Z`));
  return row.date === row.endDate ? from : `${from} - ${to}`;
}

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
  const [hiddenSeries, setHiddenSeries] = useState<SeriesKey[]>([]);
  const [overlap, setOverlap] = useState<{ row: TrendPoint; keys: SeriesKey[] } | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );
  const series = useMemo(
    () => allSeries.filter((item) =>
      (!item.previous || compare) && (!selectedType || !item.type || item.type === selectedType)
    ),
    [compare, selectedType]
  );
  const currentSeries = series.filter((item) => !item.previous && !hiddenSeries.includes(item.key));
  const overlappingSeries = overlap && rows.includes(overlap.row)
    ? currentSeries.filter((item) => overlap.keys.includes(item.key))
    : [];

  const data: ChartData<'line', (number | null)[], string> = useMemo(() => ({
    labels: rows.map((row) => labelFor(row.date, grouping)),
    datasets: series.map((item) => ({
      label: item.label,
      data: rows.map((row) => row[item.key] ?? null),
      hidden: hiddenSeries.includes(item.key),
      borderColor: item.color,
      backgroundColor: item.color,
      borderWidth: item.previous ? 1.5 : 2.5,
      borderDash: item.previous ? [3, 5] : item.key === 'net' ? [6, 4] : [],
      borderCapStyle: 'round',
      borderJoinStyle: 'round',
      // Smooth between recorded values without inventing peaks or negative spending.
      cubicInterpolationMode: 'monotone',
      fill: false,
      pointRadius: rows.length === 1 ? 4 : 0,
      pointHitRadius: 14,
      pointHoverRadius: 5,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: item.color,
      pointBorderWidth: 2,
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderWidth: 2.5,
    })),
  }), [rows, grouping, series, hiddenSeries]);

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : { duration: 450, easing: 'easeOutQuart' },
      transitions: { active: { animation: { duration: reducedMotion ? 0 : 150 } } },
      interaction: { mode: 'nearest', axis: 'xy', intersect: true },
      onHover: (_, elements, chart) => {
        chart.canvas.style.cursor = elements.some((point) => !series[point.datasetIndex]?.previous)
          ? 'pointer'
          : 'default';
      },
      onClick: (_, elements) => {
        // Index-mode tooltips group a date; drill-down must use the nearest actual point.
        const selectable = elements.filter((point) => !series[point.datasetIndex]?.previous);
        const selected = selectable[0];
        const row = selected && rows[selected.index];
        if (!row) return;
        if (selectable.length > 1) {
          setOverlap({ row, keys: selectable.map((point) => series[point.datasetIndex].key) });
          return;
        }
        setOverlap(null);
        onPointSelect(row, series[selected.datasetIndex].type);
      },
      layout: { padding: { top: 12, right: 8 } },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { maxRotation: 0, maxTicksLimit: 7, autoSkipPadding: 24, padding: 10, color: '#71717a', font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grace: '8%',
          border: { display: false, dash: [3, 5] },
          grid: { color: (context) => context.tick.value === 0 ? '#e4e4e7' : '#f1f1f3', drawTicks: false },
          ticks: {
            maxTicksLimit: 5,
            padding: 12,
            color: '#71717a',
            font: { size: 11 },
            callback: (value) => `RM ${compactAmount.format(Number(value))}`,
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#ffffff',
          borderColor: '#e4e4e7',
          borderWidth: 1,
          titleColor: '#18181b',
          bodyColor: '#52525b',
          titleFont: { size: 12, weight: 600 },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          titleMarginBottom: 8,
          bodySpacing: 6,
          usePointStyle: true,
          boxWidth: 7,
          boxHeight: 7,
          callbacks: {
            title: (items) => {
              const row = rows[items[0]?.dataIndex];
              if (!row) return '';
              return periodLabel(row);
            },
            label: (context) => `${context.dataset.label}: ${formatCurrency(Number(context.raw))}`,
          },
        },
      },
    }),
    [series, onPointSelect, rows, reducedMotion]
  );

  const summary = rows.length
    ? `Trend from ${rows[0].date} to ${rows[rows.length - 1].endDate}. Income ${formatCurrency(rows.reduce((sum, row) => sum + row.income, 0))}; expenses ${formatCurrency(rows.reduce((sum, row) => sum + row.expense, 0))}.`
    : 'No trend data for the selected range.';

  return (
    <ChartCard
      title="Income and Expense Trend"
      description={`${groupingLabels[grouping]} totals in RM`}
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
      chartClassName="min-h-80"
      emptyTitle="No transactions found for this period"
      emptyDescription="Try another date range or add a transaction."
    >
      <div className="flex flex-wrap gap-x-4 gap-y-1 pb-3" role="group" aria-label="Visible trend series">
        {series.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={!hiddenSeries.includes(item.key)}
            aria-label={`${item.label} series`}
            className={`inline-flex min-h-9 items-center gap-2 rounded px-1 text-xs transition focus-visible:ring-2 focus-visible:ring-zinc-400 ${hiddenSeries.includes(item.key) ? 'text-zinc-400 line-through' : 'text-zinc-600 hover:text-zinc-950'}`}
            onClick={() => {
              setOverlap(null);
              setHiddenSeries((current) => current.includes(item.key)
                ? current.filter((key) => key !== item.key)
                : [...current, item.key]);
            }}
          >
            <span aria-hidden="true" className={`w-5 border-t-2 ${item.previous || item.key === 'net' ? 'border-dashed' : 'border-solid'}`} style={{ borderColor: item.color }} />
            {item.label}
          </button>
        ))}
      </div>
      <div className="relative h-72 min-w-0 sm:h-80 xl:h-[22rem]">
        <Line data={data} options={options} plugins={chartPlugins} aria-label={summary} />
      </div>
      {overlap && overlappingSeries.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3" role="group" aria-label={`Transactions for ${periodLabel(overlap.row)}`}>
          <span className="w-full text-xs font-medium text-zinc-600" role="status">{periodLabel(overlap.row)}</span>
          {overlappingSeries.map((item) => (
            <button key={item.key} type="button" className="btn text-xs" onClick={() => onPointSelect(overlap.row, item.type)}>
              {item.label}: {formatCurrency(overlap.row[item.key] ?? 0)}
            </button>
          ))}
        </div>
      )}
      <details className="mt-3 border-t border-zinc-100 pt-3">
        <summary className="w-fit cursor-pointer rounded text-xs font-medium text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400">Trend values</summary>
        <div className="mt-3 max-h-64 overflow-y-auto">
          <table className="w-full table-fixed text-left text-xs tabular-nums">
            <caption className="sr-only">Current period trend values and related transactions</caption>
            <thead className="sticky top-0 bg-white text-zinc-500">
              <tr>
                <th scope="col" className="py-2 font-medium">Date</th>
                {currentSeries.map((item) => <th key={item.key} scope="col" className="px-1 py-2 text-right font-medium">{item.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date} className="border-t border-zinc-100">
                  <th scope="row" className="py-2 font-normal text-zinc-600">{labelFor(row.date, grouping)}</th>
                  {currentSeries.map((item) => (
                    <td key={item.key} className="px-1 py-1 text-right">
                      <button
                        type="button"
                        className="min-h-9 max-w-full wrap-break-word rounded px-1 text-zinc-800 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-400"
                        aria-label={`View ${item.label} transactions for ${periodLabel(row)}: ${formatCurrency(row[item.key] ?? 0)}`}
                        onClick={() => onPointSelect(row, item.type)}
                      >
                        {formatCurrency(row[item.key] ?? 0)}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </ChartCard>
  );
}
