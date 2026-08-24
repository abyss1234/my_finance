'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type Props = {
  id: string;
  name: string;
  options: string[];
  value: string;
  dropdownLabel: string;
  emptyMessage?: string;
  onChange: (value: string) => void;
};

export default function EditableCombobox({
  id,
  name,
  options,
  value,
  dropdownLabel,
  emptyMessage = 'No matching options.',
  onChange,
}: Props) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = value.trim().toLocaleLowerCase('en-MY');
  const visibleOptions = isSearching
    ? options.filter(
        (option) => !query || option.toLocaleLowerCase('en-MY').includes(query)
      )
    : options;

  useEffect(() => {
    if (!isOpen) return;

    function closeWhenOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('pointerdown', closeWhenOutside);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeWhenOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  function selectOption(option: string) {
    onChange(option);
    setIsOpen(false);
    setIsSearching(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      if (visibleOptions.length === 0) return;
      setActiveIndex((current) => Math.min(current + 1, visibleOptions.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      if (visibleOptions.length === 0) return;
      setActiveIndex((current) =>
        current <= 0 ? visibleOptions.length - 1 : current - 1
      );
      return;
    }

    if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      event.preventDefault();
      selectOption(visibleOptions[activeIndex]);
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? `${menuId}-option-${activeIndex}` : undefined
        }
        className="select pr-10"
        placeholder="Select or type"
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsSearching(true);
          setActiveIndex(-1);
          setIsOpen(true);
        }}
        onClick={() => {
          setIsSearching(false);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />

      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-zinc-500 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
        aria-label={`Show ${dropdownLabel}`}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (isOpen) setActiveIndex(-1);
          if (!isOpen) setIsSearching(false);
          setIsOpen(!isOpen);
          inputRef.current?.focus();
        }}
      >
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="listbox"
          aria-label={dropdownLabel}
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 shadow-lg"
        >
          {visibleOptions.map((option, index) => {
            const isSelected = option === value;
            const isActive = index === activeIndex;

            return (
              <button
                key={option}
                id={`${menuId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-sm text-zinc-700 ${isActive ? 'bg-zinc-100' : 'hover:bg-zinc-100'}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                <span className="min-w-0 truncate">{option}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}

          {visibleOptions.length === 0 && (
            <p className="px-2 py-3 text-sm text-zinc-500">{emptyMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
