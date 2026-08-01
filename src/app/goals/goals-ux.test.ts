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
});
