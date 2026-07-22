import type { AnalysisCategoryRow, BudgetRecord } from '@/lib/analysisTypes';

export type BudgetStatus = 'ON_TRACK' | 'APPROACHING' | 'NEAR_LIMIT' | 'OVER';

export type BudgetProgressItem = {
  scopeKey: string;
  categoryId: number | null;
  name: string;
  budget: number;
  spent: number;
  percentage: number;
  remaining: number;
  status: BudgetStatus;
};

export function budgetPeriods(from: string, to: string) {
  if (!from || !to || from > to) return [];
  const periods: string[] = [];
  const current = new Date(`${from.slice(0, 7)}-01T00:00:00.000Z`);
  const last = `${to.slice(0, 7)}-01`;
  let guard = 0;

  while (current.toISOString().slice(0, 10) <= last && guard < 240) {
    periods.push(current.toISOString().slice(0, 7));
    current.setUTCMonth(current.getUTCMonth() + 1, 1);
    guard += 1;
  }

  return periods;
}

function statusFor(percentage: number): BudgetStatus {
  if (percentage > 100) return 'OVER';
  if (percentage >= 91) return 'NEAR_LIMIT';
  if (percentage >= 71) return 'APPROACHING';
  return 'ON_TRACK';
}

export function buildBudgetProgress(
  budgets: BudgetRecord[],
  categories: AnalysisCategoryRow[],
  totalExpense: number
) {
  const grouped = new Map<
    string,
    { categoryId: number | null; name: string; budget: number }
  >();

  for (const record of budgets) {
    const row = grouped.get(record.scopeKey) ?? {
      categoryId: record.categoryId,
      name: record.category?.name ?? 'Overall expenses',
      budget: 0,
    };
    row.budget += Number(record.amount);
    grouped.set(record.scopeKey, row);
  }

  return Array.from(grouped.entries())
    .map(([scopeKey, row]): BudgetProgressItem => {
      const spent =
        row.categoryId === null
          ? totalExpense
          : categories.find((category) => category.categoryId === row.categoryId)?.amount ?? 0;
      const percentage = row.budget === 0 ? 0 : (spent / row.budget) * 100;
      return {
        scopeKey,
        categoryId: row.categoryId,
        name: row.name,
        budget: row.budget,
        spent,
        percentage,
        remaining: row.budget - spent,
        status: statusFor(percentage),
      };
    })
    .sort((left, right) => {
      if (left.categoryId === null) return -1;
      if (right.categoryId === null) return 1;
      return right.percentage - left.percentage;
    });
}
