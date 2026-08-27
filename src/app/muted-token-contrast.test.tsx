import fs from 'node:fs';
import path from 'node:path';

/**
 * Iteration 122 — the shared `--muted` token must meet WCAG 2.x AA.
 *
 * `--muted` is the app-wide secondary/caption text color. It is applied two ways:
 *   1. Directly via `color: var(--muted)` in ~24 globals.css rules
 *      (app shell, nav, page headers, auth footer, finance/investment captions).
 *   2. Indirectly through the compatibility bridge
 *      `.text-zinc-500, .text-zinc-600 { color: var(--muted) !important; }`,
 *      which remaps every Tailwind `text-zinc-500` usage (63 across 10 files)
 *      onto the token.
 *
 * Relative-luminance math for the surfaces `--muted` text sits on
 * (white `#ffffff`, page `#f1f8f5`, card `#f5fbf9`, chip `#e9f5f2`, input `#f3faf8`):
 *   - old `#6a817c` → 3.73–4.16:1  (FAILS the 4.5:1 AA minimum for normal text)
 *   - new `#52655f` → 5.56–6.20:1  (PASSES AA on every surface)
 *
 * The dark dashboard hero (`.card-elevated`) keeps its own higher-specificity
 * `!important` remap to `#b9cdc8`, so this token change does not affect it.
 */

const globals = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

function relLum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const [r, g, b] = c.map(f);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [L1, L2] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (L1 + 0.05) / (L2 + 0.05);
}

describe('shared --muted token contrast (iteration 122, WCAG 1.4.3)', () => {
  const match = globals.match(/--muted:\s*(#[0-9a-fA-F]{6})/);

  it('defines the --muted custom property', () => {
    expect(match).not.toBeNull();
  });

  const surfaces = ['#ffffff', '#f1f8f5', '#f5fbf9', '#e9f5f2', '#f3faf8'];
  it('renders --muted at >=4.5:1 against every light surface it is used on', () => {
    const muted = match![1];
    for (const bg of surfaces) {
      expect(contrast(muted, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('does not regress to the previous failing token #6a817c', () => {
    expect(match![1].toLowerCase()).not.toBe('#6a817c');
  });

  it('preserves the dark-hero remap so muted text stays light-on-dark there', () => {
    expect(globals).toMatch(/\.dashboard-page \.card-elevated \.text-zinc-500[^}]*#b9cdc8/);
  });

  it('keeps the zinc-500/600 → --muted compatibility bridge intact', () => {
    expect(globals).toMatch(/\.text-zinc-500,\s*\.text-zinc-600\s*\{\s*color:\s*var\(--muted\)\s*!important/);
  });
});
