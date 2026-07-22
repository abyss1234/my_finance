'use client';

import { AlertTriangle, CircleDollarSign, Lightbulb, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { AnalysisInsight } from '@/lib/analysisTypes';

type Props = {
  insights: AnalysisInsight[];
  isLoading: boolean;
  onSelect: (insight: AnalysisInsight) => void;
};

const toneStyles: Record<AnalysisInsight['tone'], { icon: LucideIcon; className: string }> = {
  positive: { icon: TrendingUp, className: 'bg-emerald-100 text-emerald-700' },
  warning: { icon: AlertTriangle, className: 'bg-amber-100 text-amber-700' },
  negative: { icon: AlertTriangle, className: 'bg-rose-100 text-rose-700' },
  neutral: { icon: CircleDollarSign, className: 'bg-zinc-100 text-zinc-600' },
};

export default function FinancialInsights({ insights, isLoading, onSelect }: Props) {
  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Financial Insights</h2>
        <p className="mt-1 text-xs text-zinc-500">Rule-based observations from the selected period.</p>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={4} className="p-4" />
      ) : insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No notable changes detected"
          description="Insights will appear when there is enough current and previous-period data."
        />
      ) : (
        <div className="divide-y divide-zinc-100">
          {insights.map((insight) => {
            const style = toneStyles[insight.tone];
            const Icon = style.icon;
            const interactive = Boolean(insight.type || insight.categoryId || insight.counterparty);
            return (
              <button
                key={insight.id}
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400 disabled:cursor-default disabled:hover:bg-white"
                disabled={!interactive}
                onClick={() => onSelect(insight)}
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${style.className}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-zinc-900">{insight.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-zinc-500">{insight.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
