import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/analytics/page.tsx'), 'utf8');

describe('analytics cashflow trend empty state accessibility', () => {
  it('renders an accessible onboarding empty state when no trend data exists', () => {
    expect(source).toContain('No cashflow trend yet');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('border-dashed');
  });
});
