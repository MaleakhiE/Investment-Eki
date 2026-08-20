import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

/**
 * Iteration 111 — WCAG 2.4.7 Focus Visible.
 *
 * The app previously suppressed the native focus outline on text inputs
 * (`outline: none`) and only investment-page controls had an explicit
 * :focus-visible indicator. Keyboard and assistive-technology users had no
 * reliable "where am I" cue on links, buttons, tabs, switches, and other
 * interactive roles across the rest of the app.
 *
 * These tests guard the global :focus-visible indicator so it cannot be
 * silently removed in a future refactor.
 */
describe('global focus-visible indicator (iteration 111, WCAG 2.4.7)', () => {
  const normalized = css.replace(/\s+/g, ' ');

  it('defines a :focus-visible outline for interactive controls', () => {
    for (const sel of [
      'a:focus-visible',
      'button:focus-visible',
      '[role="button"]:focus-visible',
      '[role="tab"]:focus-visible',
      '[role="switch"]:focus-visible',
      '[tabindex]:focus-visible',
    ]) {
      expect(normalized).toContain(sel);
    }
  });

  it('gives form fields an explicit :focus-visible outline (not just outline:none)', () => {
    expect(normalized).toContain('input:focus-visible');
    expect(normalized).toContain('select:focus-visible');
    expect(normalized).toContain('textarea:focus-visible');
  });

  it('uses the accessible accent-dark token for the focus ring (>=3:1 non-text contrast)', () => {
    // The focus-visible block must use var(--accent-dark) (#087f6b), which
    // measures >=3:1 against the light card/background surfaces.
    const block = normalized.slice(normalized.indexOf('a:focus-visible'));
    expect(block).toContain('outline: 2px solid var(--accent-dark)');
  });

  it('keeps --accent-dark mapped to the accessible #087f6b token', () => {
    expect(normalized).toContain('--accent-dark: #087f6b');
  });
});