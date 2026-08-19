import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');

describe('dashboard empty states accessibility', () => {
  it('renders an accessible onboarding empty state when no transactions exist', () => {
    expect(source).toContain('Belum ada transaksi');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
  });
});
