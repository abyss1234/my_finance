import { Prisma, TransactionType } from '@prisma/client';
import type {
  AnalysisCategoryRow,
  AnalysisGrouping,
  AnalysisInsight,
  AnalysisResponse,
  AnalysisTotals,
  MerchantAnalysisRow,
  TrendPoint,
} from '@/lib/analysisTypes';
import { formatCurrency, malaysiaDateKey } from '@/lib/finance';

export type AnalysisTransaction = {
  id: number;
  amount: Prisma.Decimal;
  date: Date;
  type: TransactionType;
  categoryId: number;
  counterparty: string | null;
  category: {
    id: number;
    name: string;
    kind: TransactionType;
  };
};

type AnalysisOptions = {
  from: Date | null;
  to: Date | null;
  previousFrom: Date | null;
  previousTo: Date | null;
  grouping: AnalysisGrouping;
  compare: boolean;
  merchantType: TransactionType;
};

const dayMs = 24 * 60 * 60 * 1000;

function amountOf(transaction: AnalysisTransaction) {
  return transaction.amount instanceof Prisma.Decimal
    ? transaction.amount.toNumber()
    : Number(transaction.amount);
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function summarize(items: AnalysisTransaction[]): AnalysisTotals {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const transaction of items) {
    const amount = amountOf(transaction);
    if (transaction.type === TransactionType.INCOME) {
      income += amount;
      incomeCount += 1;
    } else {
      expense += amount;
      expenseCount += 1;
    }
  }

  const net = income - expense;
  return {
    income,
    expense,
    net,
    savingsRate: income === 0 ? null : (net / income) * 100,
    incomeCount,
    expenseCount,
    totalCount: incomeCount + expenseCount,
  };
}

function keyToDate(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function dateToKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function groupStart(dateKey: string, grouping: AnalysisGrouping) {
  if (grouping === 'DAY') return dateKey;
  if (grouping === 'MONTH') return `${dateKey.slice(0, 7)}-01`;

  const date = keyToDate(dateKey);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return dateToKey(date);
}

function groupEnd(startKey: string, grouping: AnalysisGrouping) {
  const date = keyToDate(startKey);
  if (grouping === 'DAY') return startKey;
  if (grouping === 'WEEK') date.setUTCDate(date.getUTCDate() + 6);
  if (grouping === 'MONTH') date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return dateToKey(date);
}

function nextGroup(startKey: string, grouping: AnalysisGrouping) {
  const date = keyToDate(startKey);
  if (grouping === 'DAY') date.setUTCDate(date.getUTCDate() + 1);
  if (grouping === 'WEEK') date.setUTCDate(date.getUTCDate() + 7);
  if (grouping === 'MONTH') date.setUTCMonth(date.getUTCMonth() + 1, 1);
  return dateToKey(date);
}

function aggregateTrend(
  items: AnalysisTransaction[],
  grouping: AnalysisGrouping,
  from: Date | null,
  to: Date | null
) {
  const map = new Map<string, TrendPoint>();

  for (const transaction of items) {
    const key = groupStart(malaysiaDateKey(transaction.date), grouping);
    const row = map.get(key) ?? {
      date: key,
      endDate: groupEnd(key, grouping),
      income: 0,
      expense: 0,
      net: 0,
    };
    const amount = amountOf(transaction);
    if (transaction.type === TransactionType.INCOME) row.income += amount;
    else row.expense += amount;
    row.net = row.income - row.expense;
    map.set(key, row);
  }

  const firstDate = from
    ? malaysiaDateKey(from)
    : items.length > 0
      ? malaysiaDateKey(items[0].date)
      : '';
  const lastDate = to
    ? malaysiaDateKey(to)
    : items.length > 0
      ? malaysiaDateKey(items[items.length - 1].date)
      : '';

  if (firstDate && lastDate) {
    let key = groupStart(firstDate, grouping);
    const finalKey = groupStart(lastDate, grouping);
    let guard = 0;

    while (key <= finalKey && guard < 5000) {
      if (!map.has(key)) {
        map.set(key, {
          date: key,
          endDate: groupEnd(key, grouping),
          income: 0,
          expense: 0,
          net: 0,
        });
      }
      key = nextGroup(key, grouping);
      guard += 1;
    }
  }

  return Array.from(map.values()).sort((left, right) => left.date.localeCompare(right.date));
}

function aggregateCategories(
  items: AnalysisTransaction[],
  previousItems: AnalysisTransaction[],
  totals: AnalysisTotals
) {
  const current = new Map<number, Omit<AnalysisCategoryRow, 'percentage' | 'average' | 'previousAmount' | 'change'>>();
  const previous = new Map<number, number>();

  for (const transaction of items) {
    const row = current.get(transaction.categoryId) ?? {
      categoryId: transaction.categoryId,
      name: transaction.category?.name ?? 'Uncategorized',
      kind: transaction.category?.kind ?? transaction.type,
      amount: 0,
      count: 0,
    };
    row.amount += amountOf(transaction);
    row.count += 1;
    current.set(transaction.categoryId, row);
  }

  for (const transaction of previousItems) {
    previous.set(
      transaction.categoryId,
      (previous.get(transaction.categoryId) ?? 0) + amountOf(transaction)
    );
  }

  return Array.from(current.values())
    .map((row): AnalysisCategoryRow => {
      const denominator =
        row.kind === TransactionType.INCOME ? totals.income : totals.expense;
      const previousAmount = previous.get(row.categoryId) ?? 0;
      return {
        ...row,
        percentage: denominator === 0 ? 0 : (row.amount / denominator) * 100,
        average: row.count === 0 ? 0 : row.amount / row.count,
        previousAmount,
        change: percentageChange(row.amount, previousAmount),
      };
    })
    .sort((left, right) => right.amount - left.amount);
}

function aggregateMerchants(
  items: AnalysisTransaction[],
  previousItems: AnalysisTransaction[],
  kind: TransactionType
) {
  type MerchantAccumulator = { name: string; amount: number; count: number };
  const current = new Map<string, MerchantAccumulator>();
  const previous = new Map<string, number>();

  for (const transaction of items.filter((item) => item.type === kind)) {
    const name = transaction.counterparty?.trim() || 'Unknown';
    const key = name.toLocaleLowerCase('en-MY');
    const row = current.get(key) ?? { name, amount: 0, count: 0 };
    row.amount += amountOf(transaction);
    row.count += 1;
    current.set(key, row);
  }

  for (const transaction of previousItems.filter((item) => item.type === kind)) {
    const name = transaction.counterparty?.trim() || 'Unknown';
    const key = name.toLocaleLowerCase('en-MY');
    previous.set(key, (previous.get(key) ?? 0) + amountOf(transaction));
  }

  return Array.from(current.entries())
    .map(([key, row]): MerchantAnalysisRow => {
      const previousAmount = previous.get(key) ?? 0;
      return {
        name: row.name,
        kind,
        amount: row.amount,
        count: row.count,
        average: row.count === 0 ? 0 : row.amount / row.count,
        previousAmount,
        change: percentageChange(row.amount, previousAmount),
      };
    })
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 10);
}

function createInsights(
  items: AnalysisTransaction[],
  totals: AnalysisTotals,
  changes: AnalysisResponse['changes'],
  categories: AnalysisCategoryRow[],
  merchants: MerchantAnalysisRow[]
) {
  const insights: AnalysisInsight[] = [];

  if (changes.expense !== null && Math.abs(changes.expense) >= 1) {
    const increased = changes.expense > 0;
    insights.push({
      id: 'expense-change',
      title: `Expenses ${increased ? 'increased' : 'decreased'} by ${Math.abs(changes.expense).toFixed(1)}%`,
      description: `You spent ${formatCurrency(totals.expense)} in the selected period.`,
      tone: increased ? 'warning' : 'positive',
      type: 'EXPENSE',
    });
  }

  const topExpense = categories.find((category) => category.kind === TransactionType.EXPENSE);
  if (topExpense) {
    insights.push({
      id: 'top-expense-category',
      title: `${topExpense.name} was your highest spending category`,
      description: `${formatCurrency(topExpense.amount)} across ${topExpense.count} transaction${topExpense.count === 1 ? '' : 's'}.`,
      tone: 'neutral',
      type: 'EXPENSE',
      categoryId: topExpense.categoryId,
    });
  }

  const growingCategory = categories
    .filter(
      (category) =>
        category.kind === TransactionType.EXPENSE &&
        category.previousAmount > 0 &&
        category.change !== null &&
        category.change > 20
    )
    .sort((left, right) => (right.change ?? 0) - (left.change ?? 0))[0];
  if (growingCategory) {
    insights.push({
      id: 'growing-category',
      title: `${growingCategory.name} spending rose ${growingCategory.change?.toFixed(1)}%`,
      description: `An increase of ${formatCurrency(growingCategory.amount - growingCategory.previousAmount)} from the previous period.`,
      tone: 'warning',
      type: 'EXPENSE',
      categoryId: growingCategory.categoryId,
    });
  }

  if (changes.savingsRate !== null && Math.abs(changes.savingsRate) >= 5) {
    const improved = changes.savingsRate > 0;
    insights.push({
      id: 'savings-rate-change',
      title: `Savings rate ${improved ? 'improved' : 'fell'} by ${Math.abs(changes.savingsRate).toFixed(1)} points`,
      description: totals.savingsRate === null
        ? 'No savings rate is available without income.'
        : `Your current savings rate is ${totals.savingsRate.toFixed(1)}%.`,
      tone: improved ? 'positive' : 'negative',
    });
  }

  const categoryAverages = new Map(
    categories.map((category) => [category.categoryId, category.average])
  );
  const unusual = items.filter((transaction) => {
    const average = categoryAverages.get(transaction.categoryId) ?? 0;
    return average > 0 && amountOf(transaction) >= average * 2.5;
  });
  if (unusual.length > 0) {
    insights.push({
      id: 'unusual-transactions',
      title: `${unusual.length} unusually large transaction${unusual.length === 1 ? '' : 's'} detected`,
      description: 'These transactions were at least 2.5 times their category average.',
      tone: 'warning',
    });
  }

  const repeatedMerchant = merchants.find((merchant) => merchant.count >= 3);
  const merchantAmounts = new Map<string, { name: string; values: number[] }>();
  for (const transaction of items.filter((item) => item.type === TransactionType.EXPENSE)) {
    const name = transaction.counterparty?.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase('en-MY');
    const entry = merchantAmounts.get(key) ?? { name, values: [] };
    entry.values.push(amountOf(transaction));
    merchantAmounts.set(key, entry);
  }
  const possibleSubscription = Array.from(merchantAmounts.values()).find((entry) => {
    if (entry.values.length < 2) return false;
    const average = entry.values.reduce((sum, value) => sum + value, 0) / entry.values.length;
    return average > 0 && entry.values.every((value) => Math.abs(value - average) <= Math.max(1, average * 0.05));
  });

  if (possibleSubscription) {
    const average =
      possibleSubscription.values.reduce((sum, value) => sum + value, 0) /
      possibleSubscription.values.length;
    insights.push({
      id: 'possible-subscription',
      title: `${possibleSubscription.name} may be a recurring payment`,
      description: `${possibleSubscription.values.length} similar payments averaging ${formatCurrency(average)}.`,
      tone: 'neutral',
      type: 'EXPENSE',
      counterparty: possibleSubscription.name,
    });
  } else if (repeatedMerchant) {
    insights.push({
      id: 'repeated-merchant',
      title: `${repeatedMerchant.name} appeared ${repeatedMerchant.count} times`,
      description: `Combined value: ${formatCurrency(repeatedMerchant.amount)}.`,
      tone: 'neutral',
      type: repeatedMerchant.kind,
      counterparty: repeatedMerchant.name,
    });
  }

  return insights.slice(0, 6);
}

export function resolveAnalysisGrouping(
  from: Date | null,
  to: Date | null,
  requested: AnalysisGrouping | null
): AnalysisGrouping {
  if (requested) return requested;
  if (!from || !to) return 'MONTH';

  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime() + 1) / dayMs));
  if (days <= 45) return 'DAY';
  if (days <= 180) return 'WEEK';
  return 'MONTH';
}

export function buildAnalysisResponse(
  items: AnalysisTransaction[],
  previousItems: AnalysisTransaction[],
  options: AnalysisOptions
): AnalysisResponse {
  const totals = summarize(items);
  const previousDataAvailable = options.compare && previousItems.length > 0;
  const previousTotals = previousDataAvailable ? summarize(previousItems) : null;
  const changes = {
    income: previousTotals ? percentageChange(totals.income, previousTotals.income) : null,
    expense: previousTotals ? percentageChange(totals.expense, previousTotals.expense) : null,
    net: previousTotals ? percentageChange(totals.net, previousTotals.net) : null,
    savingsRate:
      previousTotals?.savingsRate !== null &&
      previousTotals?.savingsRate !== undefined &&
      totals.savingsRate !== null
        ? totals.savingsRate - previousTotals.savingsRate
        : null,
  };
  const categories = aggregateCategories(items, previousItems, totals);
  const merchants = aggregateMerchants(items, previousItems, options.merchantType);
  const trend = aggregateTrend(items, options.grouping, options.from, options.to);

  if (previousDataAvailable && options.previousFrom && options.previousTo) {
    const previousTrend = aggregateTrend(
      previousItems,
      options.grouping,
      options.previousFrom,
      options.previousTo
    );
    trend.forEach((point, index) => {
      const previous = previousTrend[index];
      point.previousIncome = previous?.income ?? 0;
      point.previousExpense = previous?.expense ?? 0;
      point.previousNet = previous?.net ?? 0;
    });
  }

  const days =
    options.from && options.to
      ? Math.max(1, Math.ceil((options.to.getTime() - options.from.getTime() + 1) / dayMs))
      : Math.max(1, new Set(items.map((item) => malaysiaDateKey(item.date))).size);
  const expenseItems = items.filter((item) => item.type === TransactionType.EXPENSE);
  const largestExpense = expenseItems.reduce(
    (largest, transaction) => Math.max(largest, amountOf(transaction)),
    0
  );
  const highestSpendingCategory = categories.find(
    (category) => category.kind === TransactionType.EXPENSE
  );

  return {
    totals,
    previousTotals,
    changes,
    byDay: trend,
    trend,
    byCategory: categories,
    merchants,
    insights: createInsights(items, totals, changes, categories, merchants),
    secondary: {
      averageDailySpending: totals.expense / days,
      largestExpense,
      highestSpendingCategory: highestSpendingCategory?.name ?? null,
    },
    meta: {
      grouping: options.grouping,
      compare: options.compare,
      from: options.from?.toISOString() ?? null,
      to: options.to?.toISOString() ?? null,
      previousFrom: options.previousFrom?.toISOString() ?? null,
      previousTo: options.previousTo?.toISOString() ?? null,
      previousDataAvailable,
      days,
    },
  };
}
