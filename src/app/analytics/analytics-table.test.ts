import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/analytics/page.tsx'), 'utf8');

describe('analytics textual alternative', () => {
  it('provides a structured monthly cashflow table alongside charts', () => {
    expect(source).toContain('Monthly cashflow data table');
    expect(source).toContain('<table');
    expect(source).toContain('scope="col"');
    expect(source).toContain('>Month</th>');
  });
});
