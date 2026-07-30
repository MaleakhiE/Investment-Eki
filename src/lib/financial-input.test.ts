import {
  MAX_FINANCIAL_AMOUNT,
  isFiniteNonNegativeAmount,
  isFinitePositiveAmount,
} from './financial-input';

describe('canonical IDR amount policy', () => {
  it.each([0, 0.25, 1.99, MAX_FINANCIAL_AMOUNT])(
    'accepts valid non-negative values: %s',
    (value) => {
      expect(isFiniteNonNegativeAmount(value)).toBe(true);
    },
  );

  it.each([0.001, 1.999, MAX_FINANCIAL_AMOUNT + 0.01, NaN, Infinity, -Infinity, '100'])(
    'rejects invalid non-negative values: %s',
    (value) => {
      expect(isFiniteNonNegativeAmount(value)).toBe(false);
    },
  );

  it.each([0.25, 1.99, MAX_FINANCIAL_AMOUNT])(
    'accepts valid positive values: %s',
    (value) => {
      expect(isFinitePositiveAmount(value)).toBe(true);
    },
  );

  expect(isFinitePositiveAmount(0)).toBe(false);
});
