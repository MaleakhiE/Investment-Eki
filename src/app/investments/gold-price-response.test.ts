import { parseGoldPriceResponse } from './gold-price-response';

describe('parseGoldPriceResponse', () => {
  it('accepts a valid response envelope', () => {
    expect(parseGoldPriceResponse({ responseStatus: 'SUCCESS', responseDetails: { sell_price: 1_500_000, source: 'api', updated_at: '2026-01-01T00:00:00.000Z' } })).toEqual({ sell_price: 1_500_000, source: 'api', updated_at: '2026-01-01T00:00:00.000Z' });
  });

  it('rejects an error envelope even when details look valid', () => {
    expect(parseGoldPriceResponse({ responseStatus: 'ERROR', responseDetails: { sell_price: 1_500_000, source: 'api', updated_at: 'now' } })).toBeNull();
  });

  it.each([NaN, Infinity, 0, -1, '1500000'])('rejects an invalid sell price: %p', (sell_price) => {
    expect(parseGoldPriceResponse({ responseStatus: 'SUCCESS', responseDetails: { sell_price, source: 'api', updated_at: 'now' } })).toBeNull();
  });
});
