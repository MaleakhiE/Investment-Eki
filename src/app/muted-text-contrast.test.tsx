import fs from 'node:fs';
import path from 'node:path';

/**
 * Iteration 121 — muted secondary text contrast to WCAG 2.x AA.
 *
 * `text-zinc-400` (Tailwind `#a1a1aa`) was used for all secondary labels,
 * captions, and form-field hints across the app. Relative-luminance math
 * shows it lands at ~2.30–2.56:1 against the app's light card/page surfaces
 * (`#ffffff`, `#f1f8f5`, `#f5fbf9`, `#e9f5f2`) — failing the 4.5:1 AA
 * threshold for normal text. Swapped every light-surface usage to
 * `text-zinc-600` (`#52525b`, 6.92–7.73:1 on those surfaces).
 *
 * Out of scope (preserved by CSS override, not class swap):
 * - `.card-elevated` (dark `--ink` hero) remaps zinc-400/500/600 → `#b9cdc8`
 *   for >=7:1 contrast on the dark surface.
 * - The compat bridge (formerly-dark backgrounds) remaps zinc-400 → `#48645f`.
 */
const FILES = [
  'src/app/goals/page.tsx',
  'src/app/cashflow/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/(auth)/register/page.tsx',
  'src/app/(auth)/forgot-password/page.tsx',
  'src/app/(auth)/reset-password/page.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/analytics/page.tsx',
  'src/app/budget/page.tsx',
  'src/components/ui/CurrencyInput.tsx',
];

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('muted secondary text contrast (iteration 121, WCAG 1.4.3)', () => {
  for (const rel of FILES) {
    it(`no text-zinc-400 in ${rel}`, () => {
      expect(read(rel)).not.toMatch(/text-zinc-400/);
    });
  }

  it('the accessible zinc-600 token is actually used in place of the muted text', () => {
    expect(read('src/app/dashboard/page.tsx')).toMatch(/text-zinc-600/);
  });

  it('dark dashboard hero card still overrides muted text to a light-on-dark token', () => {
    const css = read('src/app/globals.css');
    expect(css).toMatch(/\.dashboard-page \.card-elevated \.text-zinc-600 \{ color: #b9cdc8/);
  });
});
