import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

// String constants for tag/attribute tokens so this .tsx file never contains
// literal JSX-like angle brackets that confuse the parser.
const LABEL_OPEN = '<label\\b';
const CONTROL = '<(?:input|select|textarea)\\b';

/**
 * Iteration 113 — WCAG 1.3.1 (Info and Relationships) / 4.1.2 (Name, Role, Value).
 *
 * Every visible <label> in an auth form must be programmatically associated with
 * its control: the label carries htmlFor={id} and the input carries id={id}.
 * Unassociated labels are invisible to screen readers — a hard AA failure on the
 * login/register entry points.
 */
const AUTH_PAGES = [
  'src/app/(auth)/login/page.tsx',
  'src/app/(auth)/register/page.tsx',
  'src/app/(auth)/forgot-password/page.tsx',
  'src/app/(auth)/reset-password/page.tsx',
];

describe('auth form label associations (iteration 113, WCAG 1.3.1)', () => {
  for (const rel of AUTH_PAGES) {
    const src = read(rel);

    it(`${rel}: every label references a control via htmlFor`, () => {
      const labelForMatches = [
        ...src.matchAll(new RegExp(`${LABEL_OPEN}[^>]*\\bhtmlFor=["']([^"']+)["']`, 'g')),
      ].map((m) => m[1]);
      const labelOpen = [...src.matchAll(new RegExp(LABEL_OPEN, 'g'))].length;
      // Auth forms use explicit htmlFor, so every <label> must have one.
      expect(labelForMatches.length).toBe(labelOpen);
    });

    it(`${rel}: every htmlFor target id exists on a control`, () => {
      const labelFors = [
        ...src.matchAll(new RegExp(`${LABEL_OPEN}[^>]*\\bhtmlFor=["']([^"']+)["']`, 'g')),
      ].map((m) => m[1]);
      const controlIds = new Set(
        [
          ...src.matchAll(
            new RegExp(`${CONTROL}[^>]*\\bid=["']([^"']+)["']`, 'g'),
          ),
        ].map((m) => m[1]),
      );
      for (const id of labelFors) {
        expect(controlIds.has(id)).toBe(true);
      }
    });

    it(`${rel}: every control has an accessible name`, () => {
      const labelFors = new Set(
        [
          ...src.matchAll(new RegExp(`${LABEL_OPEN}[^>]*\\bhtmlFor=["']([^"']+)["']`, 'g')),
        ].map((m) => m[1]),
      );
      const ariaNamed = new RegExp(`${CONTROL}[^>]*\\b(?:aria-label|aria-labelledby)=`);
      const allControls = [
        ...src.matchAll(new RegExp(`${CONTROL}[^>]*>`, 'g')),
      ].map((m) => m[0]);
      for (const ctrl of allControls) {
        const idMatch = ctrl.match(/\bid=["']([^"']+)["']/);
        const named = (idMatch && labelFors.has(idMatch[1])) || ariaNamed.test(ctrl);
        expect(named).toBe(true);
      }
      expect(allControls.length).toBeGreaterThan(0);
    });
  }
});
