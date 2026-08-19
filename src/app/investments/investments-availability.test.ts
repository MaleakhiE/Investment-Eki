import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/investments/page.tsx'), 'utf8');

describe('investment history availability UX', () => {
  it('distinguishes loading, unavailable, and ready data', () => {
    expect(source).toContain("useState<'loading' | 'ready' | 'error'>('loading')");
    expect(source).toContain("setSnapshotStatus('error')");
    expect(source).toContain('Investment data is unavailable');
    expect(source).toContain('role="alert"');
    expect(source).toContain('role="status"');
  });

  it('validates both histories before committing them and exposes retry', () => {
    expect(source).toContain('parseInvestmentHistories(goldData, mfData)');
    expect(source).toContain('onClick={() => void fetchSnapshots()}');
    expect(source).toContain('Try again');
  });

  it('keeps empty investment histories actionable', () => {
    expect(source).toContain('No gold snapshots yet');
    expect(source).toContain('No mutual fund snapshots yet');
    expect(source).toContain('Add your first gold snapshot');
    expect(source).toContain('Add your first mutual fund snapshot');
    expect(source).toContain('role="status"');
    expect(source).toContain('investment-snapshot-form');
    expect(source).toContain('investment-snapshot-form-title');
    expect(source).toContain('focus({ preventScroll: true })');
  });

  it('presents a guided, sourced snapshot workflow', () => {
    expect(source).toContain('Catat posisi investasi');
    expect(source).toContain('Belum ada data');
    expect(source).toContain('aria-label="Pilih jenis investasi"');
    expect(source).toContain('Sumber nilai');
    expect(source).not.toContain('className="investment-provenance"');
    expect(source).toContain('goldSnapshots[0]');
    expect(source).toContain('mfSnapshots[0]');
    expect(source).not.toContain('investment-native-type');
  });

  it('forces manual gold entry when the gold price cannot be verified', () => {
    expect(source).toContain('setUseGoldCalc(false)');
    expect(source).toContain("state={goldPriceData?.is_verified ? 'verified' : 'manual'}");
    expect(source).toContain('A current gold price could not be verified. Enter a value manually or try again.');
    expect(source).toContain('disabled={!goldPriceData?.is_verified || goldPriceLoading}');
    expect(source).toContain('Use gold calculator');
    expect(source).toContain('Nilai saat ini');
    expect(source).toContain('manual currentValue entry');
  });

  it('preserves manually entered current value when gold price refresh fails', () => {
    expect(source).not.toContain("setCurrentValue('');\n    } catch {");
    expect(source).not.toContain("setCurrentValue('');\n    if (!data.is_verified) {");
    expect(source).toContain('setUseGoldCalc(data.is_verified)');
    expect(source).toContain('setGoldPrice(');
    expect(source).toContain('setGoldPriceData(null)');
  });
});
