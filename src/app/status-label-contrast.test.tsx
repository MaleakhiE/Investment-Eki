import fs from 'node:fs';
import path from 'node:path';

/**
 * Iteration 125 — WCAG 1.4.1 / 1.4.3: secondary status labels must not rely on
 * color alone AND must meet AA contrast.
 *
 * The Settings "AI Recommendation" status rendered `Active`/`Inactive` using
 * `text-[#087f6b]` (good) vs `text-zinc-500` (#71717a). The `text-zinc-500`
 * "Inactive" state measured ~4.33:1 on the card surface — under the 4.5:1 AA
 * floor — while the text label itself already provided a non-color cue.
 *
 * Fix: "Inactive" now uses `text-zinc-600` (#52525b), which measures ~7:1 on the
 * light card surface, bringing both states to AA. The readable text word
 * (`Active`/`Inactive`) remains, so color is supplementary, not the sole cue.
 */
const settingsSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/settings/page.tsx'),
  'utf8',
);

describe('iteration 125 — AI Recommendation status label meets AA contrast', () => {
  it('the Inactive state no longer uses the failing zinc-500 token', () => {
    // The status ternary is on one line; assert the Inactive branch resolves to zinc-600.
    const statusLine = settingsSource.match(
      /ai_recommendation_enabled \? 'text-\[#087f6b\]' : '([^']+)'/,
    );
    expect(statusLine).not.toBeNull();
    expect(statusLine?.[1]).toBe('text-zinc-600');
  });

  it('the Active state keeps the AA-conformant accent token', () => {
    const statusLine = settingsSource.match(
      /ai_recommendation_enabled \? '([^']+)' : 'text-zinc-600'/,
    );
    expect(statusLine).not.toBeNull();
    expect(statusLine?.[1]).toBe('text-[#087f6b]');
  });

  it('the label text itself carries a non-color cue (Active/Inactive word)', () => {
    expect(settingsSource).toMatch(/'Active' : 'Inactive'/);
  });

  it('no zinc-500 remains in the status-label rendering path', () => {
    const branch = settingsSource.match(
      /ai_recommendation_enabled \? '([^']+)' : '([^']+)'/,
    );
    expect(branch?.[1]).not.toContain('zinc-500');
    expect(branch?.[2]).not.toContain('zinc-500');
  });
});
