import type { TransactionKind } from '@/lib/transactionTypes';

export type AnalysisGrouping = 'DAY' | 'WEEK' | 'MONTH';
export type GroupingSelection = 'AUTO' | AnalysisGrouping;

export type AnalysisTotals = {
  income: number;
  expense: number;
  net: number;
  savingsRate: number | null;
  incomeCount: number;
  expenseCount: number;
  totalCount: number;
};

export type AnalysisChanges = {
  income: number | null;
  expense: number | null;
  net: number | null;
  savingsRate: number | null;
};

export type TrendPoint = {
  date: string;
  endDate: string;
  income: number;
  expense: number;
  net: number;
  previousIncome?: number;
  previousExpense?: number;
  previousNet?: number;
};

export type AnalysisCategoryRow = {
  categoryId: number;
  name: string;
  kind: TransactionKind;
  amount: number;
  count: number;
  percentage: number;
  average: number;
  previousAmount: number;
  change: number | null;
};

export type MerchantAnalysisRow = {
  name: string;
  kind: TransactionKind;
  amount: number;
  count: number;
  average: number;
  previousAmount: number;
  change: number | null;
};

export type InsightTone = 'positive' | 'warning' | 'negative' | 'neutral';

export type AnalysisInsight = {
  id: string;
  title: string;
  description: string;
  tone: InsightTone;
  type?: TransactionKind;
  categoryId?: number;
  counterparty?: string;
};

export type AnalysisResponse = {
  totals: AnalysisTotals;
  previousTotals: AnalysisTotals | null;
  changes: AnalysisChanges;
  byDay: TrendPoint[];
  trend: TrendPoint[];
  byCategory: AnalysisCategoryRow[];
  merchants: MerchantAnalysisRow[];
  insights: AnalysisInsight[];
  secondary: {
    averageDailySpending: number;
    largestExpense: number;
    highestSpendingCategory: string | null;
  };
  meta: {
    grouping: AnalysisGrouping;
    compare: boolean;
    from: string | null;
    to: string | null;
    previousFrom: string | null;
    previousTo: string | null;
    previousDataAvailable: boolean;
    days: number;
  };
};

export type AnalysisDetailFilter = {
  label: string;
  type?: TransactionKind;
  categoryIds?: string[];
  counterparty?: string;
  from?: string;
  to?: string;
};

export type BudgetRecord = {
  id: number;
  period: string;
  scopeKey: string;
  amount: string;
  categoryId: number | null;
  category: {
    id: number;
    name: string;
    kind: TransactionKind;
  } | null;
};
