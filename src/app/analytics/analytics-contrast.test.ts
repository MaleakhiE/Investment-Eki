import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/analytics/page.tsx'), 'utf8');

describe('analytics financial status contrast (iteration 108)', () => {
  it('uses WCAG AA-contrast token colors for positive/negative financial status', () => {
    // Accessible dark accent (positive) and danger (negative) tokens replace the
    // low-contrast text-green-400 / text-red-400 shades on the light card background.
    expect(source).toContain("'text-[#087f6b]'");
    expect(source).toContain("'text-[#b84c49]'");
  });

  it('does not use low-contrast green-400/red-400 for financial status values', () => {
    // No positive/negative status ternary should rely on the light 400-weight shades.
    const statusTernaries = source.match(/\? 'text-(?:green|red)-400'/g) || [];
    expect(statusTernaries.length).toBe(0);
    // Static positive/negative value colors also must not use the 400 shades.
    expect(source).not.toContain('font-bold text-green-400');
    expect(source).not.toContain('font-bold text-red-400');
  });

  it('keeps a text sign prefix so portfolio/gain values are not conveyed by color alone', () => {
    expect(source).toContain("totalReturn >= 0 ? '+' : ''");
    expect(source).toContain("totalGain >= 0 ? '+' : ''");
  });
});