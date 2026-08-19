import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');

describe('dashboard budgets empty state accessibility', () => {
  it('renders an accessible onboarding empty state when no budgets exist', () => {
    expect(source).toContain('Belum ada anggaran aktif');
    expect(source).toContain('Set up your first budget');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('border-dashed');
  });
});
