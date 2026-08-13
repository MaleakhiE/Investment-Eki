import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'src/app/api/mutual-fund/nav/route.ts'), 'utf8');

describe('mutual-fund NAV log privacy', () => {
  it('does not serialize upstream exception values', () => {
    expect(source).toContain("console.error('mutual_fund_nav_fetch_failed')");
    expect(source).toContain("console.error('mutual_fund_nav_pasardana_failed')");
    expect(source).toContain("console.error('mutual_fund_nav_infovesta_failed')");
    expect(source).not.toContain("console.error('Error fetching NAV:', error)");
    expect(source).not.toContain("console.error('Pasardana fetch error:', e)");
    expect(source).not.toContain("console.error('Infovesta fetch error:', e)");
  });
});
