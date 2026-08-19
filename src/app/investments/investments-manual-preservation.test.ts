import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/investments/page.tsx'), 'utf8');

describe('investment gold manual-entry preservation', () => {
  it('keeps the current value field available when gold pricing is unverified', () => {
    expect(source).toContain("setUseGoldCalc(data.is_verified)");
    expect(source).toContain("setUseGoldCalc(false)");
    expect(source).toContain("state={goldPriceData?.is_verified ? 'verified' : 'manual'}");
    expect(source).toContain('disabled={!goldPriceData?.is_verified || goldPriceLoading}');
    expect(source).toContain('Nilai saat ini');
    expect(source).toContain('manual currentValue entry');
  });

  it('does not clear a manually entered current value on failed gold-price refresh', () => {
    expect(source).not.toContain("setCurrentValue('');\n    } catch {");
    expect(source).not.toContain("setCurrentValue('');\n    if (!data.is_verified) {");
    expect(source).toContain("setGoldPriceData(null)");
    expect(source).toContain("setGoldPrice('')");
  });
});
