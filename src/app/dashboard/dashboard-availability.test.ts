import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');

describe('dashboard core availability', () => {
  it('tracks independent core resources and renders unavailable states', () => {
    expect(source).toContain("summaryStatus === 'error'");
    expect(source).toContain("accountsStatus === 'error'");
    expect(source).toContain("transactionsStatus === 'error'");
    expect(source).toContain('Monthly summary unavailable');
    expect(source).toContain('Account data is unavailable');
    expect(source).toContain('Recent transactions are unavailable');
  });
});
