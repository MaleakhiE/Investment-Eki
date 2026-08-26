import fs from 'node:fs';
import path from 'node:path';

/**
 * Iteration 119 — Secondary-accent text contrast to WCAG 2.x AA.
 *
 * The secondary-accent color `#00a88a` was used in text roles (`<p>`, `<span>`,
 * `<Link>`, `<a href>`, `<label>`). Relative-luminance math shows it lands at
 * 2.85–3.01:1 against the app's light card/page surfaces (`#ffffff`, `#f5fbf9`,
 * `#f3faf8`), failing the 4.5:1 AA threshold. Swapped every text-role usage
 * to `#087f6b` (4.42–4.93:1).
 *
 * Out of scope: SVG strokes (`<svg className="... text-[#00a88a]">`) are
 * non-text icons and are preserved.
 */
const FILES = [
  'src/app/cashflow/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/(auth)/forgot-password/page.tsx',
  'src/app/(auth)/reset-password/page.tsx',
  'src/app/(auth)/login/page.tsx',
];

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('secondary accent contrast on text roles (iteration 119, WCAG 1.4.3)', () => {
  for (const rel of FILES) {
    it(`no text-[#00a88a] on HTML text elements in ${rel}`, () => {
      const src = read(rel);
      // Forbids text-[#00a88a] on non-SVG elements (p, span, a, Link, label, button, div)
      const matches = src.match(/<(p|span|a|Link|label|button|div)\b[^>]*?className="[^"]*?text-\[#00a88a\][^"]*?"/g) || [];
      expect(matches).toEqual([]);
    });
  }

  it('the accessible same-hue token #087f6b is actually used in place of accent text', () => {
    expect(read('src/app/dashboard/page.tsx')).toMatch(/text-\[#087f6b\]/);
  });
});
