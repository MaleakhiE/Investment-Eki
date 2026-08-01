import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');

describe('dashboard mobile account presentation', () => {
  it('uses a two-column quick-action layout before the small breakpoint', () => {
    expect(source).toContain('grid-cols-2 sm:grid-cols-4');
    expect(source).toContain('min-w-0');
    expect(source).toContain('break-words');
  });

  it('loads accounts and renders an overflow-safe horizontal account rail', () => {
    expect(source).toContain("fetch('/api/accounts')");
    expect(source).toContain('overflow-x-auto');
    expect(source).toContain('<AccountCard');
  });

  it('surfaces budget usage with accessible populated, empty, and retry states', () => {
    expect(source).toContain("fetch('/api/budgets')");
    expect(source).toContain('Budget overview');
    expect(source).toContain('Set up your first budget');
    expect(source).toContain('Budget data is unavailable');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuenow');
  });
});
