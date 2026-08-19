import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/api/gold-price/route.ts'), 'utf8');

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('gold-price error privacy', () => {
  it('does not serialize upstream or route error objects', () => {
    expect(source).not.toContain("console.error('Frankfurter API error:', e)");
    expect(source).not.toContain("console.error('ExchangeRate API error:', e)");
    expect(source).not.toContain("console.error('Error fetching gold price:', error)");
    expect(source).toContain("console.error('gold_price_upstream_failed')");
    expect(source).toContain("console.error('gold_price_fallback_used')");
  });
});

describe('gold-price route trust boundary', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks an exchange-rate-derived estimate as unverified', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse({ rates: { IDR: 16_000 } }) as Response);

    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.responseStatus).toBe('SUCCESS');
    expect(body.responseDetails).toEqual(expect.objectContaining({
      source: 'frankfurter.app',
      is_verified: false,
      sell_price: expect.any(Number),
      buy_price: expect.any(Number),
    }));
    expect(body.responseDetails.sell_price).toBeGreaterThan(0);
    expect(body.responseDetails.buy_price).toBeGreaterThan(0);
  });

  it.each([
    ['too low', 1_000],
    ['too high', 1_000_000],
  ])('falls back to unverified offline pricing when the exchange rate is %s', async (_label, rate) => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ rates: { IDR: rate } }) as Response)
      .mockResolvedValueOnce(jsonResponse({ rates: { IDR: rate } }) as Response);

    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.responseStatus).toBe('SUCCESS');
    expect(body.responseDetails).toEqual(expect.objectContaining({
      source: 'default (offline)',
      is_verified: false,
      sell_price: expect.any(Number),
      buy_price: expect.any(Number),
    }));
    expect(body.responseDetails.sell_price).toBeGreaterThan(0);
    expect(body.responseDetails.buy_price).toBeGreaterThan(0);
  });
});
