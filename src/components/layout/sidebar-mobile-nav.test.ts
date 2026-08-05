import fs from 'node:fs';
import path from 'node:path';

describe('mobile sidebar navigation semantics (iteration 056)', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/Sidebar.tsx'), 'utf8');

  it('renders the More trigger as an accessible button with expanded state wiring', () => {
    expect(source).toContain('aria-expanded={moreOpen}');
    expect(source).toContain('aria-controls="more-menu"');
    expect(source).toContain('className={`app-bottom-link app-more-button ${moreOpen ? \'is-active\' : \'\'}`}');
  });

  it('keeps the dialog title and close button available for the mobile sheet', () => {
    expect(source).toContain('id="more-title"');
    expect(source).toContain('data-dialog-initial-focus');
    expect(source).toContain('className="app-sheet-close"');
  });
});
