import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/api/gold-price/route.ts'), 'utf8');

describe('gold-price error privacy', () => {
  it('does not serialize upstream or route error objects', () => {
    expect(source).not.toContain("console.error('Frankfurter API error:', e)");
    expect(source).not.toContain("console.error('ExchangeRate API error:', e)");
    expect(source).not.toContain("console.error('Error fetching gold price:', error)");
    expect(source).toContain("console.error('gold_price_upstream_failed')");
    expect(source).toContain("console.error('gold_price_fallback_used')");
  });
});
