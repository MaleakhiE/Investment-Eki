import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/cashflow/page.tsx'), 'utf8');

describe('cashflow client log privacy', () => {
  it('does not serialize fetch errors into browser logs', () => {
    expect(source).toContain("console.error('cashflow_transactions_fetch_failed')");
    expect(source).toContain("console.error('cashflow_summary_fetch_failed')");
    expect(source).not.toContain('console.error(err)');
  });
});
