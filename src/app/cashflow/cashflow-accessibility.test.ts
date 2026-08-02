import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/cashflow/page.tsx'), 'utf8');

describe('cashflow entry and filter accessibility', () => {
  it('associates transaction fields with their visible labels', () => {
    for (const id of ['transaction-date', 'transaction-category', 'transaction-amount', 'transaction-description', 'transaction-account']) {
      expect(source).toContain(`htmlFor="${id}"`);
      expect(source).toContain(`id="${id}"`);
    }
  });

  it('exposes transaction type selection and named history filters', () => {
    expect(source).toContain("aria-pressed={type === 'EXPENSE'}");
    expect(source).toContain("aria-pressed={type === 'INCOME'}");
    for (const label of ['Search transactions', 'Filter by transaction type', 'Filter by category']) {
      expect(source).toContain(`aria-label="${label}"`);
    }
  });
});
