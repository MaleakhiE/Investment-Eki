import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/budget/page.tsx'), 'utf8');

describe('budgets empty state accessibility', () => {
  it('renders an accessible empty state when no budgets exist', () => {
    expect(source).toContain('No budgets set');
    expect(source).toContain('Create your first budget');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
  });
});
