'use client';

/**
 * Currency Input Component
 * 
 * Input field that formats numbers as Indonesian Rupiah
 * Shows formatted value WHILE TYPING (1000 -> 1.000)
 */

import { useCallback } from 'react';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  min?: number;
}

export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

export function parseFormattedNumber(value: string): string {
  return value.replace(/[^\d]/g, '');
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  required = false,
  disabled = false,
  className = '',
}: CurrencyInputProps) {
  
  const displayValue = value ? formatNumber(value) : '';

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const rawValue = parseFormattedNumber(inputValue);
    onChange(rawValue);
  }, [onChange]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`pl-10 text-zinc-900 ${className}`}
      />
    </div>
  );
}
