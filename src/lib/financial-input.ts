export const MAX_FINANCIAL_AMOUNT = 90_000_000_000_000;

export class FinancialInputError extends Error {}

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  const [coefficient, exponentText] = value.toString().toLowerCase().split('e');
  const decimalPlaces = (coefficient.split('.')[1]?.length ?? 0) - Number(exponentText ?? 0);
  return decimalPlaces <= 2;
}

export function isFiniteNonNegativeAmount(value: unknown): value is number {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= MAX_FINANCIAL_AMOUNT
    && hasAtMostTwoDecimalPlaces(value)
  );
}

export function isFinitePositiveAmount(value: unknown): value is number {
  return isFiniteNonNegativeAmount(value) && value > 0;
}

export function parseCalendarDate(value: unknown): Date | null {
  if (
    typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || value < '1000-01-01'
    || value > '9999-12-31'
  ) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date
    : null;
}
