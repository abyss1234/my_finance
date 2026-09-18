'use client';

import { AlertTriangle, ArrowUpRight, CircleDollarSign, Lightbulb, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { AnalysisInsight } from '@/lib/analysisTypes';

type Props = {
  insights: AnalysisInsight[];
  isLoading: boolean;
  description?: string;
  onSelect: (insight: AnalysisInsight) => void;
};

const toneStyles: Record<AnalysisInsight['tone'], { icon: LucideIcon; className: string }> = {
  positive: { icon: TrendingUp, className: 'bg-emerald-100 text-emerald-700' },
  warning: { icon: AlertTriangle, className: 'bg-amber-100 text-amber-700' },
  negative: { icon: AlertTriangle, className: 'bg-rose-100 text-rose-700' },
  neutral: { icon: CircleDollarSign, className: 'bg-zinc-100 text-zinc-600' },
};

export default function FinancialInsights({ insights, isLoading, description, onSelect }: Props) {
  return (
    <section className="min-w-0 space-y-3" aria-labelledby="financial-insights-title">
      <div>
        <h2 id="financial-insights-title" className="text-sm font-semibold text-zinc-900">Financial Insights</h2>
        {description && <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No insights for this period"
          description="There are no transaction patterns to highlight in this range."
        />
      ) : (
        <div className={`grid min-w-0 gap-3 ${insights.length >= 3 ? 'lg:grid-cols-3' : insights.length === 2 ? 'sm:grid-cols-2' : ''}`}>
          {insights.slice(0, 3).map((insight) => {
            const style = toneStyles[insight.tone];
            const Icon = style.icon;
            return (
              <button
                key={insight.id}
                type="button"
                className="card flex w-full min-w-0 items-start gap-3 p-4 text-left transition hover:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1"
                aria-label={`${insight.title}. View ${insight.period === 'previous' ? 'previous-period' : 'related'} transactions`}
                onClick={() => onSelect(insight)}
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${style.className}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-900">{insight.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-zinc-500">{insight.description}</span>
                  {insight.period === 'previous' && <span className="mt-2 block text-xs font-medium text-zinc-600">Previous-period records</span>}
                </span>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
