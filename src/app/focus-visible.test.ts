import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

/**
 * Iterations 111 + 112 — WCAG 2.4.7 Focus Visible.
 *
 * Iteration 111 added the global :focus-visible indicator after the app
 * suppressed native outlines (`input:focus { outline: none }`) and only
 * investment-page controls had an explicit rule.
 *
 * Iteration 112 hardened it per iteration-111 review findings:
 *  - `[tabindex="0"]` instead of bare `[tabindex]`, so tabIndex={-1}
 *    programmatic-focus targets (AccessibleDialog container, investment
 *    form-title h2) never get an unwanted ring;
 *  - a light-ring variant for controls on dark --ink surfaces where
 *    #087f6b only reaches 2.68:1 (<3:1 non-text minimum).
 */
describe('global focus-visible indicator (iterations 111-112, WCAG 2.4.7)', () => {
  const normalized = css.replace(/\s+/g, ' ');

  it('defines a :focus-visible outline for interactive controls', () => {
    for (const sel of [
      ':where(a, button, summary):focus-visible',
      ':where([role="button"], [role="tab"], [role="switch"], [role="menuitem"], [role="link"]):focus-visible',
      ':where([tabindex="0"]):focus-visible',
      'input:focus-visible',
      'select:focus-visible',
      'textarea:focus-visible',
    ]) {
      expect(normalized).toContain(sel);
    }
  });

  it('does NOT ring tabIndex={-1} programmatic-focus targets', () => {
    // The bare attribute selector would match tabindex="-1" focus() targets.
    expect(normalized).not.toMatch(/\[tabindex\]:focus-visible/);
    expect(normalized).toContain('[tabindex="0"]');
  });

  it('uses the accessible accent-dark token for the focus ring (>=3:1 non-text contrast)', () => {
    const block = normalized.slice(normalized.indexOf(':where(a, button, summary):focus-visible'));
    expect(block).toContain('outline: 2px solid var(--accent-dark)');
  });

  it('provides a light-ring variant for dark --ink surfaces (>=3:1 there too)', () => {
    // #087f6b on #17352f is only 2.68:1; the auth-story panel and brand mark
    // must switch to the light mint ring (--accent-light, ~11:1 on ink).
    expect(normalized).toContain('.auth-story');
    expect(normalized).toContain('.app-brand-mark:focus-visible');
    const darkBlock = normalized.slice(normalized.indexOf('/* Dark-surface variant'));
    expect(darkBlock).toContain('outline-color: var(--accent-light)');
  });

  it('keeps --accent-dark mapped to the accessible #087f6b token', () => {
    expect(normalized).toContain('--accent-dark: #087f6b');
  });
});