import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/analytics/page.tsx'), 'utf8');

describe('analytics responsive presentation (iteration 058)', () => {
  it('stacks recommendation metrics on small screens', () => {
    expect(source).toContain('grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4');
  });

  it('stacks the asset allocation chart vertically on mobile', () => {
    expect(source).toContain('flex flex-col sm:flex-row items-center gap-6');
    expect(source).toContain('aria-hidden="true"');
  });

  it('keeps the analytics tablist horizontally scrollable', () => {
    expect(source).toContain('role="tablist"');
    expect(source).toContain('overflow-x-auto');
  });
});
