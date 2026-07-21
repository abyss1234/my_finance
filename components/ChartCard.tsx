import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  isLoading: boolean;
  isEmpty: boolean;
  children: ReactNode;
  className?: string;
  chartClassName?: string;
};

export default function ChartCard({
  title,
  description,
  isLoading,
  isEmpty,
  children,
  className = '',
  chartClassName = 'h-80',
}: Props) {
  return (
    <section className={`card min-w-0 overflow-hidden ${className}`}>
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
      </div>
      <div className="p-4">
        {isLoading && (
          <div className={`${chartClassName} flex items-center justify-center text-sm text-zinc-500`}>
            Loading...
          </div>
        )}
        {!isLoading && isEmpty && (
          <div className={`${chartClassName} flex items-center justify-center text-sm text-zinc-500`}>
            No data for selected range.
          </div>
        )}
        {!isLoading && !isEmpty && <div className={chartClassName}>{children}</div>}
      </div>
    </section>
  );
}
