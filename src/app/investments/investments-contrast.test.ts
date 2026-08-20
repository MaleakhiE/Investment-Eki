import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/investments/page.tsx'), 'utf8');

describe('investments gain/loss contrast (iteration 107)', () => {
  it('uses WCAG AA-contrast token colors for gain/loss in history tables', () => {
    // Accessible dark accent (positive) and danger (negative) tokens replace the
    // low-contrast text-green-400 / text-red-400 shades on the light table background.
    expect(source).toContain("'text-[#087f6b]'");
    expect(source).toContain("'text-[#b84c49]'");
  });

  it('does not use low-contrast green-400/red-400 for gain/loss values', () => {
    // The gain/loss numeric cells must not rely on the light 400-weight shades.
    const gainLossCells = source.match(/gain_loss >= 0 \? '[^']+' : '[^']+'/g) || [];
    expect(gainLossCells.length).toBeGreaterThan(0);
    for (const cell of gainLossCells) {
      expect(cell).not.toContain('text-green-400');
      expect(cell).not.toContain('text-red-400');
    }
  });

  it('keeps a text sign prefix so gain/loss is not conveyed by color alone', () => {
    expect(source).toContain("s.gain_loss >= 0 ? '+' : ''");
  });
});