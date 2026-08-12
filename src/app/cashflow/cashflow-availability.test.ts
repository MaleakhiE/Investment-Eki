import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/cashflow/page.tsx'), 'utf8');

describe('cashflow data availability contract', () => {
  it('fails closed with an accessible retry when transactions or summary cannot load', () => {
    expect(source).toContain("if (!response.ok) throw new Error('Transactions unavailable')");
    expect(source).toContain("if (!response.ok) throw new Error('Summary unavailable')");
    expect(source).toContain('Cashflow data is unavailable.');
    expect(source).toContain('Retry loading cashflow');
    expect(source).toContain('role="alert"');
    expect(source).toContain('void Promise.all([fetchTransactions(), fetchSummary()]).finally');
  });
});
