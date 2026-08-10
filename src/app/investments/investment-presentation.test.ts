import { getInvestmentReturnPresentation } from './investment-presentation';

describe('getInvestmentReturnPresentation', () => {
  it('keeps an empty investment neutral', () => {
    expect(getInvestmentReturnPresentation(0, 0)).toEqual({
      tone: 'neutral', amountPrefix: '', percentage: null,
    });
  });

  it.each([
    [1_000_000, 100_000, 'positive', '+', '10.0'],
    [1_000_000, -100_000, 'negative', '-', '-10.0'],
  ] as const)('classifies non-zero returns', (invested, gainLoss, tone, amountPrefix, percentage) => {
    expect(getInvestmentReturnPresentation(invested, gainLoss)).toEqual({ tone, amountPrefix, percentage });
  });
});
