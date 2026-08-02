import { parseInvestmentHistories } from './investment-history';

describe('parseInvestmentHistories', () => {
  it('returns both verified histories together', () => {
    const gold = [{ id: 'gold-1' }];
    const mutualFund: unknown[] = [];
    expect(parseInvestmentHistories({ responseDetails: gold }, { responseDetails: mutualFund })).toEqual({ gold, mutualFund });
  });

  it.each([
    [{ responseDetails: null }, { responseDetails: [] }],
    [{ responseDetails: [] }, { responseDetails: {} }],
    [{}, { responseDetails: [] }],
  ])('fails closed when either history is malformed', (gold, mutualFund) => {
    expect(parseInvestmentHistories(gold, mutualFund)).toBeNull();
  });
});
