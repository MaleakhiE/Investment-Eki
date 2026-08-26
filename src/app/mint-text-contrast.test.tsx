import fs from 'node:fs';
import path from 'node:path';

/**
 * Iteration 118 — brand-mint `#00d4aa` must not be used as TEXT on light surfaces.
 *
 * Relative-luminance math for `#00d4aa`:
 *   vs #ffffff = 1.91:1   vs #f5fbf9 = 1.82:1   vs #f3faf8 = 1.80:1
 *   vs #0d1f1c = 8.94:1   vs #16332f = 7.10:1
 *
 * So the brand mint is a genuine WCAG 1.4.3 failure whenever it renders as text on
 * the app's light card/page surfaces (it needs 4.5:1 for normal text, 3:1 for large).
 * It is perfectly accessible on the dark `--ink` surfaces and remains valid as a
 * graphical FILL (progress bars, gradients, tinted `bg-[#00d4aa]/10` chips, focus
 * borders), which is why this test only forbids the `text-` role.
 *
 * The accessible same-hue token is `#087f6b` (4.66–4.93:1 on the light surfaces),
 * already shipped as `--accent-dark` from iterations 107/116.
 *
 * This test guards that `text-[#00d4aa]` never reappears in any app route, while
 * explicitly allowing mint fills/borders to stay.
 */
const FILES = [
  'src/app/dashboard/page.tsx',
  'src/app/cashflow/page.tsx',
  'src/app/goals/page.tsx',
  'src/app/investments/page.tsx',
  'src/app/analytics/page.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/(auth)/register/page.tsx',
];

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('brand mint is never text on light surfaces (iteration 118, WCAG 1.4.3)', () => {
  for (const rel of FILES) {
    it(`no text-[#00d4aa] in ${rel}`, () => {
      expect(read(rel)).not.toMatch(/text-\[#00d4aa\]/);
    });

    it(`no hover:text-[#00d4aa] in ${rel}`, () => {
      expect(read(rel)).not.toMatch(/hover:text-\[#00d4aa\]/);
    });
  }

  it('the accessible same-hue token #087f6b is actually used in place of mint text', () => {
    // At least the dashboard and cashflow swaps must be present, otherwise the
    // "fix" could have been a silent deletion of the affected links.
    expect(read('src/app/dashboard/page.tsx')).toMatch(/text-\[#087f6b\]/);
    expect(read('src/app/cashflow/page.tsx')).toMatch(/text-\[#087f6b\]/);
  });

  it('mint remains available as a graphical fill (not regressed into a full purge)', () => {
    // Progress bars / tinted chips legitimately keep the brand mint.
    const dashboard = read('src/app/dashboard/page.tsx');
    expect(dashboard).toMatch(/(bg-\[#00d4aa\]|from-\[#00d4aa\])/);
  });
});
