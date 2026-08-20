import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/investments/page.tsx'), 'utf8');

describe('investments history tables (iteration 106)', () => {
  it('renders gold snapshot history as a semantic table', () => {
    expect(source).toContain('<table');
    expect(source).toContain('<caption className="sr-only">Gold investment snapshots</caption>');
    expect(source).toContain('<th scope="col"');
    expect(source).toContain('<th scope="row"');
    expect(source).toContain('overflow-x-auto');
    expect(source).toContain('max-h-[300px]');
  });

  it('renders mutual fund snapshot history as a semantic table', () => {
    expect(source).toContain('<table');
    expect(source).toContain('<caption className="sr-only">Mutual fund investment snapshots</caption>');
    // Total column headers across both tables: 5 (gold) + 7 (mf) = 12
    const headerCount = (source.match(/<th scope="col"/g) || []).length;
    expect(headerCount).toBe(12);
    expect(source).toContain('overflow-x-auto');
    expect(source).toContain('max-h-[300px]');
  });

  it('preserves empty-state status role', () => {
    expect(source).toContain('role="status"');
  });
});