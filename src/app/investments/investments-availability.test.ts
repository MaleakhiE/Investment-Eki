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
});
