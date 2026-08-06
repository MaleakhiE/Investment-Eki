import fs from 'node:fs';
import path from 'node:path';

describe('format consistency across iterations (iteration 057)', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/format.ts'), 'utf8');

  it('exports formatCurrency, formatNumber, and formatDate functions', () => {
    expect(source).toContain('export function formatCurrency');
    expect(source).toContain('export function formatNumber');
    expect(source).toContain('export function formatDate');
  });

  it('formatCurrency accepts IDR and USD', () => {
    expect(source).toContain('formatCurrency(value: number, currency: \'IDR\' | \'USD\'');
  });

  it('formatDate defaults to id-ID with day, month, year', () => {
    expect(source).toContain("toLocaleDateString('id-ID', {");
    expect(source).toContain('day: \'numeric\'');
    expect(source).toContain('month: \'short\'');
    expect(source).toContain('year: \'numeric\'');
  });
});
