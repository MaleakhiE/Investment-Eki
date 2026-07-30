import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/goals/page.tsx'), 'utf8');

describe('goal form dialog accessibility contract', () => {
  it('uses the shared native dialog with labelled controls and initial focus', () => {
    expect(source).toContain("import AccessibleDialog from '@/components/ui/AccessibleDialog';");
    expect(source).toContain('<AccessibleDialog open={showForm}');
    expect(source).toContain('labelledBy="goal-dialog-title"');
    expect(source).toContain('id="goal-dialog-title"');
    expect(source).toContain('data-dialog-initial-focus');
    expect(source).toContain('htmlFor="goal-target"');
    expect(source).not.toContain('fixed inset-0 bg-black/50 flex items-center justify-center z-50');
  });
});
