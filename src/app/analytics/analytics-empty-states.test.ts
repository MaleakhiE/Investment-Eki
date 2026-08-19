import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/analytics/page.tsx'), 'utf8');

describe('analytics empty states accessibility', () => {
  it('renders accessible onboarding empty states for analytics', () => {
    expect(source).toContain('Belum ada data arus kas');
    expect(source).toContain('Belum ada data investasi');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
  });
});
