import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/accounts/page.tsx'), 'utf8');

describe('accounts empty state accessibility', () => {
  it('renders an accessible onboarding empty state when no accounts exist', () => {
    expect(source).toContain('Belum ada akun');
    expect(source).toContain('accounts.length === 0');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
  });
});
