'use client';

/**
 * Currency Input Component
 * 
 * Input field that formats numbers as Indonesian Rupiah
 * Shows formatted value WHILE TYPING (1000 -> 1.000)
 */

import { useCallback } from 'react';

interface CurrencyInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  min?: number;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

export function parseFormattedNumber(value: string): string {
  return value.replace(/[^\d]/g, '');
}

export default function CurrencyInput({
  id,
  name,
  value,
  onChange,
  placeholder = '0',
  required = false,
  disabled = false,
  className = '',
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: CurrencyInputProps) {
  
  const displayValue = value ? formatNumber(value) : '';

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const rawValue = parseFormattedNumber(inputValue);
    onChange(rawValue);
  }, [onChange]);

  // Remove any px-* or pl-* classes from className to avoid conflicts
  const cleanedClassName = className.replace(/\b(px-\d+|pl-\d+)\b/g, '').trim();

  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none select-none">
        Rp
      </span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className={`pl-7 pr-2 text-zinc-900 ${cleanedClassName}`}
      />
    </div>
  );
}
