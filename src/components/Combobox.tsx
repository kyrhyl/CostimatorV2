"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  selectedLabel?: string;
  className?: string;
  clearable?: boolean;
  onSearch?: (query: string) => void;
  searchDebounceMs?: number;
  loading?: boolean;
}

export default function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  selectedLabel,
  className = '',
  clearable = false,
  onSearch,
  searchDebounceMs = 300,
  loading = false,
}: ComboboxProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const selectedOption = options.find((option) => option.value === value);
  const displayLabel = selectedLabel ?? selectedOption?.label ?? '';

  useEffect(() => {
    if (!isOpen) {
      setInputValue(displayLabel);
    }
  }, [displayLabel, isOpen]);

  const filteredOptions = useMemo(() => {
    const query = isOpen && inputValue === displayLabel ? '' : inputValue;
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, inputValue, displayLabel, isOpen]);

  useEffect(() => {
    if (!onSearch || !isOpen || disabled) return;
    if (value && inputValue === displayLabel) return;

    const handle = window.setTimeout(() => {
      onSearch(inputValue.trim());
    }, searchDebounceMs);

    return () => window.clearTimeout(handle);
  }, [onSearch, inputValue, isOpen, disabled, searchDebounceMs, value, displayLabel]);

  const openList = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  const closeList = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        closeList();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option: ComboboxOption) => {
    onChange(option.value);
    setInputValue(option.label);
    closeList();
    inputRef.current?.focus();
  };

  const handleClear = () => {
    onChange('');
    setInputValue('');
    setHighlightedIndex(-1);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeList();
    }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.querySelector<HTMLButtonElement>(
      `[data-index="${highlightedIndex}"]`
    );
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onFocus={openList}
        onChange={(event) => {
          setInputValue(event.target.value);
          setHighlightedIndex(0);
          openList();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${clearable ? 'pr-9' : ''} ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''} ${className}`}
      />
      {clearable && !disabled && (value || inputValue) ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear selection"
        >
          ×
        </button>
      ) : null}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-auto"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                type="button"
                key={option.value}
                data-index={index}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelect(option);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                  index === highlightedIndex ? 'bg-blue-50' : ''
                } ${option.value === value ? 'font-medium text-blue-700' : 'text-gray-700'}`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
