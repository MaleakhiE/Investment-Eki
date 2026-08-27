import fs from 'node:fs';
import path from 'node:path';

/**
 * Iteration 123 — WCAG 2.4.1 Bypass Blocks (Level A).
 *
 * Every authenticated page renders the persistent <Sidebar /> (9+ nav links,
 * mobile header, bottom nav) ahead of its <main>. Without a bypass, keyboard
 * and screen-reader users must tab through the entire nav on every route.
 * This PR adds a single skip link in layout.tsx plus `id="main-content"`
 * on every <main>, so one activation moves focus to the content region.
 *
 * Regression contract:
 *  - layout.tsx renders an anchor with href="#main-content" (the skip link),
 *    before any page content.
 *  - every rendered <main> exposes id="main-content" so the href target exists.
 *  - the skip-link class is styled to appear on focus (not permanently hidden).
 */

const root = process.cwd();
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
const pageGlobs = [
  'src/app/settings/page.tsx',
  'src/app/goals/page.tsx',
  'src/app/superadmin/smtp/page.tsx',
  'src/app/cashflow/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/accounts/page.tsx',
  'src/app/analytics/page.tsx',
  'src/app/investments/page.tsx',
  'src/app/budget/page.tsx',
  'src/components/auth/AuthShell.tsx',
];
const globals = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');

describe('skip link / bypass block (iteration 123, WCAG 2.4.1)', () => {
  it('layout renders a skip link targeting #main-content', () => {
    expect(layout).toMatch(/<a[^>]*href="#main-content"[^>]*>/);
  });

  it('the skip link carries the skip-link class for focus styling', () => {
    expect(layout).toMatch(/<a[^>]*href="#main-content"[^>]*className="skip-link"[^>]*>/);
  });

  for (const file of pageGlobs) {
    it(`every <main> in ${file} exposes id="main-content"`, () => {
      const src = fs.readFileSync(path.join(root, file), 'utf8');
      const mains = [...src.matchAll(/<main\b[^>]*>/g)].map((m) => m[0]);
      expect(mains.length).toBeGreaterThan(0);
      for (const tag of mains) {
        expect(tag).toContain('id="main-content"');
      }
    });
  }

  it('skip-link is hidden by default and revealed on :focus-visible (not display:none)', () => {
    expect(globals).toMatch(/\.skip-link\s*\{[^}]*top:\s*-?\d+px/m);
    expect(globals).toMatch(/\.skip-link:focus-visible\s*\{[^}]*top:\s*\d+px/m);
    expect(globals).not.toMatch(/\.skip-link\s*\{[^}]*display:\s*none/m);
  });
});
