import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

const PAGES = [
  'src/app/cashflow/page.tsx',
  'src/app/analytics/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/budget/page.tsx',
  'src/app/goals/page.tsx',
  'src/app/investments/page.tsx',
  'src/app/settings/page.tsx',
];

// Persistent low-contrast classes. The ONLY legitimate remaining occurrences in the codebase
// are `hover:text-red-400` on Delete buttons in goals/page.tsx and budget/page.tsx,
// and `focus:text-*/hover:text-*` on the cashflow form buttons.
const PROHIBITED = [
  'text-green-400',
  'text-red-400',
  'text-blue-400',
  'text-amber-400',
  'text-orange-400',
  'text-zinc-300',
  'bg-green-400',
  'bg-red-400',
  'bg-amber-400',
];

// Expected per-file counts for the token that has legitimate hover:text-red-400
// affordance occurrences (Delete buttons whose resting color is an accessible zinc).
const EXPECTED = {
  'src/app/goals/page.tsx': 1,      // hover:text-red-400 on Delete
  'src/app/budget/page.tsx': 1,     // hover:text-red-400 on Delete
  'src/app/settings/page.tsx': 1,   // hover:text-red-400 on Delete Custom Alert
};

describe('non-text & identity color contrast audit (iteration 110)', () => {
  it('removes all persistent low-contrast text- and bg-400 shade classes (except known hover affordances)', () => {
    for (const p of PROHIBITED) {
      let total = 0;
      const perFile: Record<string, number> = {};
      for (const rel of PAGES) {
        const src = read(rel);
        const count = (src.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        total += count;
        if (count > 0) perFile[rel] = count;
      }
      if (p === 'text-red-400') {
        expect(total).toBe(3);
        for (const [rel, cnt] of Object.entries(EXPECTED)) {
          expect(perFile[rel] || 0).toBe(cnt);
        }
        // No other files should have this token
        const unexpected = Object.keys(perFile).filter((f) => !(f in EXPECTED));
        expect(unexpected).toEqual([]);
      } else {
        // All other prohibited tokens must have ZERO occurrences
        expect(total).toBe(0);
      }
    }
  });

  it('removes the low-contrast donut SVG brand strokes', () => {
    const analytics = read('src/app/analytics/page.tsx');
    expect(analytics).not.toContain('#F59E0B');
    expect(analytics).not.toContain('#3B82F6');
    expect(analytics).toContain('#B45309'); // gold arc (>=3:1 on white)
    expect(analytics).toContain('#2563EB'); // mutual-fund arc (>=3:1 on white)
  });

  it('keeps the accessible replacements present', () => {
    const joined = PAGES.map(read).join('\n');
    expect(joined).toContain('#087f6b');
    expect(joined).toContain('#b84c49');
    expect(joined).toContain('bg-amber-700');
    expect(joined).toContain('bg-blue-600');
    expect(joined).toContain('bg-zinc-600');
  });

  it('retains the brand mint #00d4aa as the intentional non-goal', () => {
    const joined = PAGES.map(read).join('\n');
    expect(joined).toContain('#00d4aa');
  });
});