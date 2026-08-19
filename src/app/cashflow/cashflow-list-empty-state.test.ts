import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/cashflow/page.tsx'), 'utf8');

describe('cashflow list empty states accessibility', () => {
  it('renders accessible onboarding empty states for the transaction list', () => {
    expect(source).toContain('Belum ada transaksi');
    expect(source).toContain('Tidak ada hasil');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('border-dashed');
    expect(source).toContain("import Link from 'next/link';");
  });
});