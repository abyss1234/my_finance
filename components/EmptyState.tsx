import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: Props) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-10 text-center ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-zinc-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
