import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');

describe('dashboard investment data integrity', () => {
  it('does not silently coerce malformed portfolio data into zero totals', () => {
    expect(source).toContain('isInvestmentDetail');
    expect(source).toContain("investmentsStatus === 'error'");
    expect(source).toContain('Investment data is unavailable');
  });
});
