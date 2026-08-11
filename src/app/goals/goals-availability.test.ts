import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/goals/page.tsx'), 'utf8');

describe('goals availability contract', () => {
  it('fails closed with an accessible retry when goal data cannot load', () => {
    expect(source).toContain('if (!goalsRes.ok || !summaryRes.ok)');
    expect(source).toContain('Financial goal data is unavailable');
    expect(source).toContain('Retry loading financial goals');
    expect(source).toContain('{error ? (');
    expect(source).toContain('role="alert"');
    expect(source).toContain('void fetchData();');
  });
});
