import fs from 'node:fs';
import path from 'node:path';

/**
 * Iteration 124 — WCAG 4.1.3 Status Messages (Level AA).
 *
 * Form-submission error banners must be announced by assistive technology
 * without moving focus. Every inline `{error && ...}` banner therefore needs
 * `role="alert"` (implicit `aria-live="assertive"`), matching the pattern the
 * auth pages already use (`register`, `reset-password`).
 *
 * Gap found in iteration 124: the settings page and the cashflow
 * add-transaction form rendered their submit errors as plain <div>s with no
 * role, so a screen-reader user submitting a bad form got silence.
 *
 * Pages whose error banners already carried role="alert" before this iteration
 * (goals, budget, analytics, accounts, and the auth pages) are asserted too, so
 * the guarantee cannot silently regress anywhere.
 */

const read = (relative: string): string =>
  fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

const FIXED_IN_124: ReadonlyArray<readonly [string, string]> = [
  ['src/app/settings/page.tsx', 'mb-3 p-2 bg-red-500/20'],
  ['src/app/cashflow/page.tsx', 'mb-2 p-2 bg-red-500/20'],
];

const ALREADY_COMPLIANT: readonly string[] = [
  'src/app/goals/page.tsx',
  'src/app/budget/page.tsx',
  'src/app/analytics/page.tsx',
  'src/app/accounts/page.tsx',
  'src/app/(auth)/register/page.tsx',
  'src/app/(auth)/reset-password/page.tsx',
];

describe('iteration 124 — form-submission errors are announced (WCAG 4.1.3)', () => {
  it.each(FIXED_IN_124)(
    '%s renders its submit-error banner with role="alert" and aria-live="assertive"',
    (file, classFragment) => {
      const source = read(file);
      const banner = new RegExp(
        `\\{error && <div role="alert" aria-live="assertive" className="${classFragment.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        )}`,
      );
      expect(source).toMatch(banner);
    },
  );

  it.each(FIXED_IN_124)('%s has no role-less inline error banner left', (file) => {
    const source = read(file);
    // A `{error && <div className=` with no role attribute is the failing shape.
    expect(source).not.toMatch(/\{error && <div className=/);
  });

  it.each(ALREADY_COMPLIANT)('%s keeps an announced error region', (file) => {
    const source = read(file);
    expect(source).toMatch(/role="alert"/);
  });

  it('every page that renders an inline {error} banner announces it', () => {
    const pages = [...FIXED_IN_124.map(([file]) => file), ...ALREADY_COMPLIANT];
    const unannounced = pages.filter((file) => !read(file).includes('role="alert"'));
    expect(unannounced).toEqual([]);
  });
});
