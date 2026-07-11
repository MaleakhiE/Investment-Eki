import {
  getMonthlySummary,
  type MonthlySummary,
} from '@/services/transaction.service';

export const OVERSPEND_THRESHOLD_RATIO = 0.1;
const REQUIRED_HISTORY_MONTHS = 3;

export interface ExpenseMonth {
  month: string;
  expense_by_category: Record<string, number>;
}

export interface SavingsSuggestion {
  category: string;
  current_amount: number;
  historical_average: number;
  potential_saving: number;
  message: string;
}

type SummaryLoader = (userId: bigint, month: string) => Promise<MonthlySummary>;

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
});

function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function compareSuggestions(left: SavingsSuggestion, right: SavingsSuggestion): number {
  const savingDifference = right.potential_saving - left.potential_saving;
  if (savingDifference !== 0) return savingDifference;
  if (left.category === right.category) return 0;
  return left.category < right.category ? -1 : 1;
}

export function generateSavingsSuggestions(
  current: ExpenseMonth,
  historical: ExpenseMonth[]
): SavingsSuggestion[] {
  if (historical.length !== REQUIRED_HISTORY_MONTHS) return [];

  return Object.entries(current.expense_by_category)
    .flatMap(([category, currentAmount]) => {
      const historicalAmounts = historical.map(
        ({ expense_by_category: expenses }) => expenses[category]
      );

      if (
        !Number.isFinite(currentAmount) ||
        currentAmount <= 0 ||
        historicalAmounts.some(
          (amount) => !Number.isFinite(amount) || amount <= 0
        )
      ) {
        return [];
      }

      const historicalAverage =
        historicalAmounts.reduce((total, amount) => total + amount, 0) /
        REQUIRED_HISTORY_MONTHS;

      if (
        currentAmount <
        historicalAverage * (1 + OVERSPEND_THRESHOLD_RATIO)
      ) {
        return [];
      }

      const potentialSaving = currentAmount - historicalAverage;
      const overspendPercentage = Math.round(
        (potentialSaving / historicalAverage) * 100
      );

      return [
        {
          category,
          current_amount: currentAmount,
          historical_average: historicalAverage,
          potential_saving: potentialSaving,
          message: `Pengeluaran ${category} bulan ini Rp${rupiahFormatter.format(currentAmount)}, lebih tinggi ${overspendPercentage}% dari rata-rata 3 bulan. Kurangi Rp${rupiahFormatter.format(potentialSaving)} agar kembali ke rata-rata.`,
        },
      ];
    })
    .sort(compareSuggestions);
}

export async function getSavingsSuggestions(
  userId: bigint,
  now: Date = new Date(),
  loadSummary: SummaryLoader = getMonthlySummary
): Promise<SavingsSuggestion[]> {
  const months = Array.from(
    { length: REQUIRED_HISTORY_MONTHS + 1 },
    (_, index) => {
      const offset = index - REQUIRED_HISTORY_MONTHS;
      return formatMonth(new Date(now.getFullYear(), now.getMonth() + offset, 1));
    }
  );
  const summaries = await Promise.all(
    months.map((month) => loadSummary(userId, month))
  );
  const current = summaries.at(-1)!;

  return generateSavingsSuggestions(current, summaries.slice(0, -1));
}
