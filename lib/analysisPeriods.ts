import { dateInputToIso, malaysiaDateKey } from '@/lib/finance';

export type AnalysisPeriodMode = 'full-period' | 'month-to-date' | 'matched-days';

function keyDate(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFromKeys(from: string, to: string) {
  return {
    from: new Date(dateInputToIso(from, 'start')),
    to: new Date(dateInputToIso(to, 'end')),
  };
}

function previousRange(from: Date | null, to: Date | null, preset: string | null, mode: AnalysisPeriodMode) {
  if (!from || !to) return { from: null, to: null };
  const fromKey = malaysiaDateKey(from);
  const toKey = malaysiaDateKey(to);

  if (preset === 'THIS_WEEK') {
    const start = keyDate(fromKey);
    const end = keyDate(toKey);
    start.setUTCDate(start.getUTCDate() - 7);
    end.setUTCDate(end.getUTCDate() - 7);
    return rangeFromKeys(dateKey(start), dateKey(end));
  }
  if (preset === 'THIS_MONTH' || preset === 'LAST_MONTH') {
    const start = keyDate(`${fromKey.slice(0, 7)}-01`);
    start.setUTCMonth(start.getUTCMonth() - 1, 1);
    const end = new Date(start);
    if (mode === 'full-period') end.setUTCMonth(end.getUTCMonth() + 1, 0);
    else end.setUTCDate(Number(toKey.slice(-2)));
    return rangeFromKeys(dateKey(start), dateKey(end));
  }
  if (preset === 'LAST_3_MONTHS') {
    const end = keyDate(fromKey);
    end.setUTCDate(end.getUTCDate() - 1);
    const start = keyDate(fromKey);
    start.setUTCMonth(start.getUTCMonth() - 3, 1);
    return rangeFromKeys(dateKey(start), dateKey(end));
  }
  if (preset === 'THIS_YEAR') {
    const year = Number(fromKey.slice(0, 4)) - 1;
    return rangeFromKeys(`${year}-01-01`, `${year}-12-31`);
  }

  const duration = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - 1);
  return { from: new Date(previousTo.getTime() - duration), to: previousTo };
}

export function resolveAnalysisPeriods(
  from: Date | null,
  to: Date | null,
  preset: string | null,
  compare: boolean,
  now = new Date()
) {
  let current = { from, to };
  let mode: AnalysisPeriodMode = 'full-period';
  const today = malaysiaDateKey(now);

  if (
    preset === 'THIS_MONTH' && from && to &&
    malaysiaDateKey(from) === `${today.slice(0, 7)}-01` &&
    malaysiaDateKey(to) > today
  ) {
    let lastDay = Number(today.slice(-2));
    mode = 'month-to-date';
    if (compare) {
      const previousMonthEnd = keyDate(`${today.slice(0, 7)}-01`);
      previousMonthEnd.setUTCDate(0);
      // A shorter previous month needs an equally short current comparison window.
      if (lastDay > previousMonthEnd.getUTCDate()) {
        lastDay = previousMonthEnd.getUTCDate();
        mode = 'matched-days';
      }
    }
    const endKey = `${today.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
    current = rangeFromKeys(malaysiaDateKey(from), endKey);
  }

  return {
    current,
    previous: compare ? previousRange(current.from, current.to, preset, mode) : { from: null, to: null },
    mode,
  };
}
