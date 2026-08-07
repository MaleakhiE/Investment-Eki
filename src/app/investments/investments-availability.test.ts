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

  it('renders accessible onboarding cards when investment history is empty', () => {
    expect(source).toContain('Belum ada riwayat emas');
    expect(source).toContain('Belum ada riwayat reksa dana');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
  });
});
