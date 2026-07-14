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

const malaysiaTimeZone = 'Asia/Kuala_Lumpur';
const malaysiaOffsetMs = 8 * 60 * 60 * 1000;
const malaysiaDateTimeFormatter = new Intl.DateTimeFormat('en-MY', {
  timeZone: malaysiaTimeZone,
  dateStyle: 'medium',
  timeStyle: 'short',
});
const malaysiaDateFormatter = new Intl.DateTimeFormat('en-MY', {
  timeZone: malaysiaTimeZone,
  dateStyle: 'medium',
});
const malaysiaTimeFormatter = new Intl.DateTimeFormat('en-MY', {
  timeZone: malaysiaTimeZone,
  timeStyle: 'short',
});
const malaysiaDatePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: malaysiaTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

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

export function formatMalaysiaDateTime(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : malaysiaDateTimeFormatter.format(date);
}

export function formatMalaysiaDate(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : malaysiaDateFormatter.format(date);
}

export function formatMalaysiaTime(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : malaysiaTimeFormatter.format(date);
}

export function malaysiaDateKey(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = malaysiaDatePartsFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : '';
}

export function dateInputValue(date: Date | null) {
  return date ? malaysiaDateKey(date) : '';
}

export function dateTimeInputValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Date(date.getTime() + malaysiaOffsetMs).toISOString().slice(0, 16);
}

export function dateTimeInputToIso(value: string) {
  const malaysiaWallTime = new Date(`${value}Z`);
  if (Number.isNaN(malaysiaWallTime.getTime())) return '';

  return new Date(malaysiaWallTime.getTime() - malaysiaOffsetMs).toISOString();
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

  let timestamp = Date.UTC(year, month - 1, day) - malaysiaOffsetMs;
  if (boundary === 'end') timestamp += 24 * 60 * 60 * 1000 - 1;

  return new Date(timestamp).toISOString();
}
