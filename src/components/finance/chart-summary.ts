export interface CashflowTrendPoint {
  month: string;
  income: number;
  expense: number;
  net_cashflow: number;
}

export function parseCashflowTrend(value: unknown): CashflowTrendPoint[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map((point) => {
    if (typeof point !== 'object' || point === null) return null;
    const candidate = point as Record<string, unknown>;
    if (typeof candidate.month !== 'string' || !/^\d{4}-\d{2}$/.test(candidate.month)) return null;
    if (![candidate.income, candidate.expense, candidate.net_cashflow].every((amount) => typeof amount === 'number' && Number.isFinite(amount))) return null;
    return {
      month: candidate.month,
      income: candidate.income as number,
      expense: candidate.expense as number,
      net_cashflow: candidate.net_cashflow as number,
    };
  });
  return parsed.every((point): point is CashflowTrendPoint => point !== null) ? parsed : null;
}

export function summarizeCashflowTrend(
  points: readonly CashflowTrendPoint[],
  formatCurrency: (value: number) => string,
): string {
  if (points.length === 0) return 'No cashflow data is available for this period.';
  const highestIncome = points.reduce((best, point) => point.income > best.income ? point : best, points[0]);
  const highestExpense = points.reduce((best, point) => point.expense > best.expense ? point : best, points[0]);
  const latest = points[points.length - 1];
  return `Latest net cashflow is ${formatCurrency(latest.net_cashflow)}. Highest income was ${formatCurrency(highestIncome.income)} in ${highestIncome.month}; highest expense was ${formatCurrency(highestExpense.expense)} in ${highestExpense.month}.`;
}
