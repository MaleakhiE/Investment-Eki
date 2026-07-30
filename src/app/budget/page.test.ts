import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/budget/page.tsx'), 'utf8');

describe('budget form dialog accessibility contract', () => {
  it('uses the shared native dialog with a labelled title and initial focus', () => {
    expect(source).toContain("import AccessibleDialog from '@/components/ui/AccessibleDialog';");
    expect(source).toContain('<AccessibleDialog open={showForm}');
    expect(source).toContain('labelledBy="budget-dialog-title"');
    expect(source).toContain('id="budget-dialog-title"');
    expect(source).toContain('data-dialog-initial-focus');
    expect(source).not.toContain('fixed inset-0 bg-black/50 flex items-center justify-center z-50');
  });
});
