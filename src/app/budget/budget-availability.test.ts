import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/budget/page.tsx'), 'utf8');

describe('budget availability contract', () => {
  it('fails closed with an accessible retry when budget data cannot load', () => {
    expect(source).toContain("if (!res.ok) throw new Error('Budgets unavailable')");
    expect(source).toContain('Budget data is unavailable');
    expect(source).toContain('Retry loading budgets');
    expect(source).toContain('{error ? (');
    expect(source).toContain('role="alert"');
    expect(source).toContain('void fetchBudgets();');
  });
});
