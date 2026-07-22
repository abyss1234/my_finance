import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  isLoading: boolean;
  isEmpty: boolean;
  children: ReactNode;
  className?: string;
  chartClassName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

export default function ChartCard({
  title,
  description,
  actions,
  isLoading,
  isEmpty,
  children,
  className = '',
  chartClassName = 'h-80',
  emptyTitle = 'No data for selected range',
  emptyDescription,
}: Props) {
  return (
    <section className={`card min-w-0 overflow-hidden ${className}`}>
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-1">{actions}</div>}
      </div>
      <div className="p-4">
        {isLoading && (
          <div className={`${chartClassName} flex items-center justify-center text-sm text-zinc-500`}>
            Loading...
          </div>
        )}
        {!isLoading && isEmpty && (
          <div className={`${chartClassName} flex flex-col items-center justify-center px-4 text-center`}>
            <p className="text-sm font-medium text-zinc-700">{emptyTitle}</p>
            {emptyDescription && (
              <p className="mt-1 max-w-md text-sm text-zinc-500">{emptyDescription}</p>
            )}
          </div>
        )}
        {!isLoading && !isEmpty && <div className={chartClassName}>{children}</div>}
      </div>
    </section>
  );
}
