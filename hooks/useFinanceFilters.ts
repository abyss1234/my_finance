'use client';

import { useMemo, useState } from 'react';
import { DatePreset, dateInputValue, rangeForPreset } from '@/lib/finance';

export function useFinanceFilters(onChange?: () => void) {
  const [preset, setPresetState] = useState<DatePreset>('THIS_MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [categoryId, setCategoryIdState] = useState('');

  const { from, to } = useMemo(() => {
    if (preset === 'CUSTOM') return { from: customFrom, to: customTo };

    const range = rangeForPreset(preset);
    return {
      from: dateInputValue(range.from),
      to: dateInputValue(range.to),
    };
  }, [preset, customFrom, customTo]);

  function setPreset(value: DatePreset) {
    if (value === 'CUSTOM' && preset !== 'CUSTOM') {
      setCustomFrom(from);
      setCustomTo(to);
    }
    setPresetState(value);
    onChange?.();
  }

  function setFrom(value: string) {
    setCustomFrom(value);
    setPresetState('CUSTOM');
    onChange?.();
  }

  function setTo(value: string) {
    setCustomTo(value);
    setPresetState('CUSTOM');
    onChange?.();
  }

  function setCategoryId(value: string) {
    setCategoryIdState(value);
    onChange?.();
  }

  function reset() {
    setPresetState('THIS_MONTH');
    setCustomFrom('');
    setCustomTo('');
    setCategoryIdState('');
    onChange?.();
  }

  return {
    preset,
    from,
    to,
    categoryId,
    setPreset,
    setFrom,
    setTo,
    setCategoryId,
    reset,
  };
}
