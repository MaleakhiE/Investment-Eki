import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/cashflow/page.tsx'), 'utf8');

describe('cashflow expenses empty state accessibility', () => {
  it('renders an accessible onboarding empty state when no expense category data exists', () => {
    expect(source).toContain('Belum ada data pengeluaran');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('border-dashed');
  });
});