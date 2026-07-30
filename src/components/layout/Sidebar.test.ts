import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/Sidebar.tsx'), 'utf8');

describe('mobile More navigation dialog accessibility contract', () => {
  it('uses the shared native dialog and removes the hand-built layer', () => {
    expect(source).toContain("import AccessibleDialog from '@/components/ui/AccessibleDialog';");
    expect(source).toContain('<AccessibleDialog open={moreOpen}');
    expect(source).toContain('labelledBy="more-title"');
    expect(source).toContain('data-dialog-initial-focus');
    expect(source).not.toContain('app-sheet-layer');
  });
});
