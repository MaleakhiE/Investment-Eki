import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/goals/page.tsx'), 'utf8');

describe('goals empty state accessibility', () => {
  it('renders an accessible onboarding empty state with aria-live', () => {
    expect(source).toContain('No financial goals yet');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('border-dashed');
  });
});