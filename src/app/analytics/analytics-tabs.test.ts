import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/analytics/page.tsx'), 'utf8');

describe('analytics tabs accessibility contract', () => {
  it('connects tabs and panels with complete selection semantics', () => {
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
    expect(source).toContain('aria-selected={activeTab === tab}');
    expect(source).toContain('aria-controls={`analytics-panel-${tab}`}');
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain('aria-labelledby="analytics-tab-overview"');
    expect(source).toContain('aria-labelledby="analytics-tab-cashflow"');
    expect(source).toContain('aria-labelledby="analytics-tab-investment"');
  });
});
