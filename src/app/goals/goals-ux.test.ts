import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/goals/page.tsx'), 'utf8');

describe('goals UX clarity (iteration 059)', () => {
  it('uses a mobile-friendly header action and empty-state CTA', () => {
    expect(source).toContain('mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between');
    expect(source).toContain('w-full rounded-xl bg-[#00d4aa] px-4 py-2 text-sm font-medium text-[#16332f] hover:bg-[#00a88a] sm:w-auto');
    expect(source).toContain('Set your first financial goal');
    expect(source).toContain('New Goal');
  });

  it('renders an accessible onboarding empty state', () => {
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain('Set your first financial goal');
    expect(source).toContain('Define target amounts and deadlines for your emergency fund');
  });
});

describe('goal contribution guidance', () => {
  it('explains the projection assumption and deadline-risk state', () => {
    expect(source).toContain('Assumes equal monthly contributions');
    expect(source).toContain('Deadline passed');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuenow');
  });
});