import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/cashflow/page.tsx'), 'utf8');

describe('cashflow account availability contract', () => {
  it('fails closed with an accessible retry when accounts cannot load', () => {
    expect(source).toContain("if (!response.ok) throw new Error('Accounts unavailable')");
    expect(source).toContain('Account data is unavailable.');
    expect(source).toContain('Retry loading accounts');
    expect(source).toContain('role="alert"');
    expect(source).toContain('void fetchAccounts().finally');
  });
});
