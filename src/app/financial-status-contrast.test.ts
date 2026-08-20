import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

const PAGES = [
  'src/app/dashboard/page.tsx',
  'src/app/budget/page.tsx',
  'src/app/cashflow/page.tsx',
  'src/app/goals/page.tsx',
  'src/app/settings/page.tsx',
  'src/app/(auth)/register/page.tsx',
];

describe('financial status color contrast sweep (iteration 109)', () => {
  it('has no low-contrast text-* financial-status color left as a plain text value', () => {
    // Plain-text financial values / status text must not use the light 400-weight
    // shades. Interactive hover states (hover:text-*), chip/badge colors on tinted
    // backgrounds (bg-*-500/NN text-*-400), and button controls are out of scope.
    for (const rel of PAGES) {
      const src = read(rel);
      // Conditional status ternaries: `? 'text-green-400'` / `? 'text-red-400'`
      expect(src).not.toMatch(/\? '(?:text-green-400|text-red-400)'/);
      // Static status values on light card backgrounds.
      expect(src).not.toContain('font-bold text-green-400');
      expect(src).not.toContain('font-bold text-red-400');
      expect(src).not.toContain('text-sm text-red-400 text-center');
      expect(src).not.toContain('text-xs text-green-400"');
    }
  });

  it('uses the accessible design-system tokens for positive/negative status', () => {
    const dashboard = read('src/app/dashboard/page.tsx');
    expect(dashboard).toContain("'text-[#b84c49]'");
    const budget = read('src/app/budget/page.tsx');
    expect(budget).toContain("'text-[#087f6b]'");
    expect(budget).toContain("'text-[#b84c49]'");
    const cashflow = read('src/app/cashflow/page.tsx');
    expect(cashflow).toContain("'text-[#087f6b]'");
    expect(cashflow).toContain("'text-[#b84c49]'");
  });

  it('keeps non-color cues (Untung/Rugi label) on the dashboard portfolio delta', () => {
    const dashboard = read('src/app/dashboard/page.tsx');
    expect(dashboard).toContain("gainLoss >= 0 ? 'Untung' : 'Rugi'");
  });
});