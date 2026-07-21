import { formatCurrency } from '@/lib/finance';
import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Props = { income: number; expense: number; net: number };

type SummaryItemProps = {
  title: string;
  value: number;
  tone: 'income' | 'expense' | 'net';
  icon: LucideIcon;
};

const toneClasses: Record<SummaryItemProps['tone'], string> = {
  income: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
  expense: 'border-rose-200 bg-rose-50/70 text-rose-700',
  net: 'border-indigo-200 bg-indigo-50/70 text-indigo-700',
};

function SummaryItem({ title, value, tone, icon: Icon }: SummaryItemProps) {
  return (
    <div className={`card min-w-0 p-4 ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase opacity-75">{title}</div>
        <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
      </div>
      <div className="mt-2 truncate text-xl font-semibold tabular-nums sm:text-2xl" title={formatCurrency(value)}>
        {formatCurrency(value)}
      </div>
    </div>
  );
}

export default function SummaryCards({ income, expense, net }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-3">
      <SummaryItem title="Income" value={income} tone="income" icon={ArrowUpRight} />
      <SummaryItem title="Expense" value={expense} tone="expense" icon={ArrowDownRight} />
      <SummaryItem title="Net" value={net} tone="net" icon={Scale} />
    </div>
  );
}
