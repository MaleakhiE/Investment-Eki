import { parseGoldPriceResponse } from './gold-price-response';

describe('parseGoldPriceResponse', () => {
  it('accepts a verified success envelope', () => {
    expect(parseGoldPriceResponse({ responseStatus: 'SUCCESS', responseDetails: { sell_price: 1_500_000, source: 'api', updated_at: '2026-01-01T00:00:00.000Z', is_verified: true } })).toEqual({ sell_price: 1_500_000, source: 'api', updated_at: '2026-01-01T00:00:00.000Z', is_verified: true });
  });

  it('rejects an error envelope even when details look valid', () => {
    expect(parseGoldPriceResponse({ responseStatus: 'ERROR', responseDetails: { sell_price: 1_500_000, source: 'api', updated_at: 'now', is_verified: false } })).toBeNull();
  });

  it.each([NaN, Infinity, 0, -1, '1500000'])('rejects an invalid sell price: %p', (sell_price) => {
    expect(parseGoldPriceResponse({ responseStatus: 'SUCCESS', responseDetails: { sell_price, source: 'api', updated_at: 'now', is_verified: true } })).toBeNull();
  });

  it('rejects envelopes without verification metadata', () => {
    expect(parseGoldPriceResponse({ responseStatus: 'SUCCESS', responseDetails: { sell_price: 1_500_000, source: 'api', updated_at: 'now' } })).toBeNull();
  });
});
