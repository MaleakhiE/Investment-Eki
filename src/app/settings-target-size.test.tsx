import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

/**
 * Iteration 115 — WCAG 2.5.8 Target Size (Minimum), AA.
 *
 * Interactive controls must present a target of at least 24x24 CSS px (unless a
 * spacing/inline/essential exception applies). The Settings notification panel
 * previously had three compact action buttons sized well under 24px tall
 * (`py-0.5`/`py-1` with `text-[9px]`/`text-[10px]`, ≈16-18px), a real AA gap on a
 * touch-first layout.
 *
 * This test guards that every <button> opening tag in the settings page carries an
 * explicit minimum-height affordance — either the shared `min-h-11` (44px) touch
 * target or an explicit `min-h-[NNpx]` of at least 24px — so a future edit cannot
 * silently reintroduce a sub-24px tap target.
 */
const SETTINGS = 'src/app/settings/page.tsx';

// Native token min-h utilities considered compliant: min-h-11 (44px) and any
// arbitrary min-h-[NNpx] where NN >= 24.
function hasCompliantMinHeight(cls: string): boolean {
  if (/\bmin-h-11\b/.test(cls)) return true;
  const arb = [...cls.matchAll(/\bmin-h-\[(\d+)px\]/g)].map((m) => Number(m[1]));
  return arb.some((px) => px >= 24);
}

/**
 * Extract every <button ...> opening tag's className. A naive `<button[^>]*>`
 * regex breaks on `onClick={() => ...}` because the arrow contains `>`, so we scan
 * with brace-depth awareness: the opening tag ends at the first `>` encountered at
 * brace depth 0.
 */
function buttonClassNames(src: string): string[] {
  const out: string[] = [];
  const marker = '<button';
  let i = 0;
  while ((i = src.indexOf(marker, i)) !== -1) {
    let depth = 0;
    let j = i + marker.length;
    for (; j < src.length; j++) {
      const ch = src[j];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
    }
    const tag = src.slice(i, j);
    const clsMatch = tag.match(/className="([^"]*)"/);
    out.push(clsMatch ? clsMatch[1] : '');
    i = j + 1;
  }
  return out;
}

describe('settings target size (iteration 115, WCAG 2.5.8)', () => {
  const src = read(SETTINGS);
  const buttons = buttonClassNames(src);

  it('finds the settings buttons', () => {
    expect(buttons.length).toBeGreaterThan(5);
  });

  it('every settings button meets the 24px minimum target height', () => {
    const undersized = buttons.filter((cls) => !hasCompliantMinHeight(cls));
    expect(undersized).toEqual([]);
  });

  it('no interactive button uses sub-legible micro text without a min-height', () => {
    // text-[9px]/text-[10px] paired with no min-height was the exact regression.
    const microNoHeight = buttons.filter(
      (cls) => /\btext-\[(9|10)px\]/.test(cls) && !hasCompliantMinHeight(cls),
    );
    expect(microNoHeight).toEqual([]);
  });
});
