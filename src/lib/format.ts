export function formatCurrency(value: number, currency: 'IDR' | 'USD' = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = {}): string {
  const date = new Date(value);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}