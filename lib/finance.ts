import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export type TransactionType = 'INCOME' | 'EXPENSE';
export type DatePreset = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_WEEK' | 'TODAY' | 'ALL' | 'CUSTOM';

export const datePresetLabels: Record<DatePreset, string> = {
  THIS_MONTH: 'This Month',
  LAST_MONTH: 'Last Month',
  THIS_WEEK: 'This Week',
  TODAY: 'Today',
  ALL: 'All Time',
  CUSTOM: 'Custom',
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(value);
}

export function dateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : '';
}

export function rangeForPreset(preset: Exclude<DatePreset, 'CUSTOM'>) {
  const now = new Date();

  switch (preset) {
    case 'THIS_MONTH':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'LAST_MONTH': {
      const lastMonth = addDays(startOfMonth(now), -1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case 'THIS_WEEK':
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case 'TODAY':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'ALL':
      return { from: null, to: null };
  }
}

export function dateInputToIso(value: string, boundary: 'start' | 'end') {
  if (!value) return '';

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';

  const date = new Date(year, month - 1, day);
  if (boundary === 'end') date.setHours(23, 59, 59, 999);

  return date.toISOString();
}
