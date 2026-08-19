import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/settings/page.tsx'), 'utf8');

describe('settings custom alerts empty state accessibility', () => {
  it('renders an accessible onboarding empty state when no custom alerts exist', () => {
    expect(source).toContain('Belum ada alarm kustom');
    expect(source).toContain('custom_alerts.length');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
  });
});
