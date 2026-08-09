import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/goals/page.tsx'), 'utf8');

describe('goal contribution guidance', () => {
  it('explains the projection assumption and deadline-risk state', () => {
    expect(source).toContain('Assumes equal monthly contributions');
    expect(source).toContain('Deadline passed');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuenow');
  });

  it('keeps the no-goal state actionable and announced', () => {
    expect(source).toContain('role="status"');
    expect(source).toContain('No financial goals yet');
    expect(source).toContain('Create your first goal');
    expect(source).toContain('setShowForm(true)');
  });
});
