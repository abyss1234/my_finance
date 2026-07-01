import { formatCurrency } from '@/lib/finance';

type Props = { income: number; expense: number; net: number };

type SummaryItemProps = {
  title: string;
  value: number;
  tone: 'income' | 'expense' | 'net';
};

const toneClasses: Record<SummaryItemProps['tone'], string> = {
  income: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
  expense: 'border-rose-200 bg-rose-50/70 text-rose-700',
  net: 'border-indigo-200 bg-indigo-50/70 text-indigo-700',
};

function SummaryItem({ title, value, tone }: SummaryItemProps) {
  return (
    <div className={`card p-4 ${toneClasses[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-75">{title}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{formatCurrency(value)}</div>
    </div>
  );
}

export default function SummaryCards({ income, expense, net }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryItem title="Income" value={income} tone="income" />
      <SummaryItem title="Expense" value={expense} tone="expense" />
      <SummaryItem title="Net" value={net} tone="net" />
    </div>
  );
}
