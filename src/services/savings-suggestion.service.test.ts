import {
  generateSavingsSuggestions,
  getSavingsSuggestions,
  type ExpenseMonth,
} from './savings-suggestion.service';

const history = (...expenses: Array<Record<string, number>>): ExpenseMonth[] =>
  expenses.map((expense_by_category, index) => ({
    month: `2026-0${index + 1}`,
    expense_by_category,
  }));

describe('generateSavingsSuggestions', () => {
  it('suggests a concrete saving when current spending exceeds three-month history by at least 10%', () => {
    const result = generateSavingsSuggestions(
      { month: '2026-04', expense_by_category: { Food: 150_000 } },
      history({ Food: 100_000 }, { Food: 100_000 }, { Food: 100_000 })
    );

    expect(result).toEqual([
      {
        category: 'Food',
        current_amount: 150_000,
        historical_average: 100_000,
        potential_saving: 50_000,
        message:
          'Pengeluaran Food bulan ini Rp150.000, lebih tinggi 50% dari rata-rata 3 bulan. Kurangi Rp50.000 agar kembali ke rata-rata.',
      },
    ]);
  });

  it('does not suggest savings for underspending', () => {
    expect(
      generateSavingsSuggestions(
        { month: '2026-04', expense_by_category: { Food: 90_000 } },
        history({ Food: 100_000 }, { Food: 100_000 }, { Food: 100_000 })
      )
    ).toEqual([]);
  });

  it('requires the category to have all three historical months', () => {
    expect(
      generateSavingsSuggestions(
        { month: '2026-04', expense_by_category: { Food: 150_000 } },
        history({ Food: 100_000 }, { Food: 100_000 })
      )
    ).toEqual([]);
  });

  it('does not treat zero-valued history as spending history', () => {
    expect(
      generateSavingsSuggestions(
        { month: '2026-04', expense_by_category: { Food: 150_000 } },
        history({ Food: 100_000 }, { Food: 0 }, { Food: 100_000 })
      )
    ).toEqual([]);
  });

  it('orders multiple categories by potential saving then category', () => {
    const result = generateSavingsSuggestions(
      {
        month: '2026-04',
        expense_by_category: { Transport: 180_000, Food: 150_000, Bills: 150_000 },
      },
      history(
        { Transport: 100_000, Food: 100_000, Bills: 100_000 },
        { Transport: 100_000, Food: 100_000, Bills: 100_000 },
        { Transport: 100_000, Food: 100_000, Bills: 100_000 }
      )
    );

    expect(result.map(({ category }) => category)).toEqual(['Transport', 'Bills', 'Food']);
  });
});

describe('getSavingsSuggestions', () => {
  it('loads the current month and preceding three calendar months in chronological order', async () => {
    const loadSummary = jest.fn(async (_userId: bigint, month: string) => ({
      month,
      total_income: 0,
      total_expense: 0,
      net_cashflow: 0,
      expense_by_category: {},
    }));

    await getSavingsSuggestions(BigInt(7), new Date(2026, 0, 15), loadSummary);

    expect(loadSummary.mock.calls.map(([, month]) => month)).toEqual([
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
    ]);
  });
});
