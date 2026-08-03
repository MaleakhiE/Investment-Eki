import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');

describe('dashboard client log privacy', () => {
  it('does not serialize fetch errors into browser logs', () => {
    expect(source).not.toContain('console.error(e)');
    expect(source).toContain("console.error('dashboard_data_fetch_failed')");
  });
});
