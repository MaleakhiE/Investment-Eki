import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/analytics/page.tsx'), 'utf8');

describe('analytics availability contract', () => {
  it('fails closed with an accessible retry when core analytics data cannot load', () => {
    expect(source).toContain("if (!settingsRes.ok || !trendRes.ok || !compRes.ok) throw new Error('Analytics unavailable')");
    expect(source).toContain('Analytics data is unavailable.');
    expect(source).toContain('Retry loading analytics');
    expect(source).toContain('role="alert"');
    expect(source).toContain('void fetchData();');
  });
});
