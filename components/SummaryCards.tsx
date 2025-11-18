type Props = { income: number; expense: number; net: number };
export default function SummaryCards({ income, expense, net }: Props) {
  const Item = ({ title, value }: { title: string; value: number }) => (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">RM {value.toFixed(2)}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Item title="Income" value={income} />
      <Item title="Expense" value={expense} />
      <Item title="Net" value={net} />
    </div>
  );
}
