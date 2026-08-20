import fs from 'node:fs';
import path from 'node:path';

const budgetSource = fs.readFileSync(path.join(process.cwd(), 'src/app/budget/page.tsx'), 'utf8');

describe('budget remaining status is not color-only (WCAG 1.4.1)', () => {
  it('communicates over/under budget with a textual state token, not color alone', () => {
    // The "Remaining" card must show a text label ('On track' / 'Over budget')
    // alongside the colored amount, so the state is perceivable without color.
    expect(budgetSource).toMatch(/On track|Over budget/);
    expect(budgetSource).toContain("text-green-400");
    expect(budgetSource).toContain("text-red-400");
  });

  it('progress bar carries an aria-label describing usage and state', () => {
    expect(budgetSource).toContain('role="progressbar"');
    expect(budgetSource).toContain('aria-label=');
  });
});