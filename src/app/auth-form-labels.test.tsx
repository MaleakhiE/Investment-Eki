import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

// String constants for tag/attribute tokens so this .tsx file never contains
// literal JSX-like angle brackets that confuse the parser.
const LABEL_OPEN = '<label\\b';
const CONTROL = '<(?:input|select|textarea)\\b';
const CUSTOM_CONTROL = '<(?:CurrencyInput|TextInput|DatePicker|PhoneInput|EmailInput)\\b';

/**
 * Iteration 113 — WCAG 1.3.1 (Info and Relationships) / 4.1.2 (Name, Role, Value).
 *
 * Every visible <label> in an auth form must be programmatically associated with
 * its control: the label carries htmlFor={id} and the input carries id={id}, OR
 * (for native controls only) the label wraps the control.
 *
 * Unassociated labels are invisible to screen readers — a hard AA failure on the
 * login/register entry points.
 *
 * Iteration 114 addendum: custom (non-native) components such as <CurrencyInput>
 * must NOT be wrapped by a <label> for association (HTML spec only allows
 * implicit association with native labelable elements). The accounts form must use
 * explicit htmlFor + id instead.
 */
const AUTH_PAGES = [
  'src/app/(auth)/login/page.tsx',
  'src/app/(auth)/register/page.tsx',
  'src/app/(auth)/forgot-password/page.tsx',
  'src/app/(auth)/reset-password/page.tsx',
];

const FORM_PAGES = [
  'src/app/accounts/page.tsx',
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

describe('custom-component label association (iteration 114, WCAG 1.3.1)', () => {
  for (const rel of FORM_PAGES) {
    const src = read(rel);

    it(`${rel}: no custom (non-native) component is wrapped by a <label>`, () => {
      // HTML implicit label association only works with native labelable
      // elements (input/select/textarea). A <CurrencyInput> or similar custom
      // component must be associated explicitly via htmlFor+id, never nested
      // inside a <label>.
      const labelRe = new RegExp(`${LABEL_OPEN}([^>]*)>([\\s\\S]*?)<\\/label>`, 'g');
      let m: RegExpExecArray | null;
      while ((m = labelRe.exec(src))) {
        const inner = m[2];
        const wrapped = new RegExp(CUSTOM_CONTROL).test(inner);
        expect(wrapped).toBe(false);
      }
    });

    it(`${rel}: every <label htmlFor=...> id pair resolves to a real control`, () => {
      const labelFors = [
        ...src.matchAll(new RegExp(`${LABEL_OPEN}[^>]*\\bhtmlFor=["']([^"']+)["']`, 'g')),
      ].map((m) => m[1]);
      const nativeIds = new Set(
        [...src.matchAll(new RegExp(`${CONTROL}[^>]*\\bid=["']([^"']+)["']`, 'g'))].map(
          (m) => m[1],
        ),
      );
      const customIds = new Set(
        [...src.matchAll(new RegExp(`${CUSTOM_CONTROL}[^>]*\\bid=["']([^"']+)["']`, 'g'))].map(
          (m) => m[1],
        ),
      );
      const allIds = new Set([...nativeIds, ...customIds]);
      for (const id of labelFors) {
        expect(allIds.has(id)).toBe(true);
      }
    });
  }
});
