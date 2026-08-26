import fs from 'node:fs';
import path from 'node:path';

/**
 * Iteration 116 — Accent text/border contrast to WCAG 2.x AA.
 *
 * The revenue/accent color `#008f78` was reused in many places for text and
 * focus rings. Relative-luminance math shows it lands at 3.62–4.04:1 against the
 * app's light surfaces (`#f5fbf9`, `#f3faf8`, `#f1f8f5`, `#ffffff`), which fails the
 * 4.5:1 threshold for normal-size text (WCAG 1.4.3) and the 3:1 threshold for the
 * compact savings-pill / uppercase-label text too. The same hue is already shipped
 * as the accessible token `#087f6b` (≈4.42–4.93:1) from the iteration-107 contrast
 * sweep and as the `--accent-dark` CSS variable. This iteration swaps every
 * `text-[#008f78]` / `ring-[#008f78]` for `#087f6b`.
 *
 * This test guards that the non-conformant token `#008f78` never reappears in
 * text or focus-ring roles (it may still be used for large graphical fills, which
 * are out of scope for this iteration).
 */
const FILES = [
  'src/app/dashboard/page.tsx',
  'src/app/settings/page.tsx',
  'src/app/superadmin/smtp/page.tsx',
  'src/app/analytics/page.tsx',
  'src/app/investments/page.tsx',
];

describe('accent contrast token (iteration 116, WCAG 1.4.3 / 1.4.11)', () => {
  for (const rel of FILES) {
    const src = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

    it(`no text-[#008f78] in ${rel}`, () => {
      expect(src).not.toMatch(/text-\[#008f78\]/);
    });

    it(`no ring-[#008f78] in ${rel}`, () => {
      expect(src).not.toMatch(/ring-\[#008f78\]/);
    });
  }

  it('accent-dark variable is the accessible token #087f6b', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(css).toMatch(/--accent-dark:\s*#087f6b/);
  });
});
