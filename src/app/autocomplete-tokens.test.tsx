import fs from 'node:fs';
import path from 'node:path';

/**
 * Iteration 117 — WCAG 1.3.5 Identify Input Purpose.
 *
 * Form inputs that collect user info must expose a programmatic `autocomplete`
 * token (or, for non-personal local UI like a search/filter box, an explicit
 * `autoComplete="off"`) so assistive tech and browsers can identify the field's
 * purpose. The auth forms already carried correct tokens (email / new-password /
 * current-password). This iteration closes the two remaining personal-data gaps
 * and adds a regression guard:
 *
 *   - superadmin/smtp "From address" (`type="email"`) → `autoComplete="email"`
 *   - superadmin/smtp "Recipient email" (`type="email"`) → `autoComplete="email"`
 *
 * Out of scope: the cashflow "Search transactions" box is a local filter (not
 * personal data), so it keeps `aria-label` + `autoComplete="off"`; financial
 * inputs (amount/currency, goal name, transaction description) have no matching
 * WCAG 1.3.5 token, so they are intentionally left without one.
 */
const FILES = ['src/app/superadmin/smtp/page.tsx'];

describe('autocomplete tokens for personal-data inputs (iteration 117, WCAG 1.3.5)', () => {
  for (const rel of FILES) {
    const src = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

    it(`SMTP email inputs carry autoComplete="email" in ${rel}`, () => {
      // From address input
      const fromMatch = src.match(/From address<input[^>]*?type="email"[^>]*?>/);
      expect(fromMatch).not.toBeNull();
      expect(fromMatch?.[0]).toContain('autoComplete="email"');

      // Recipient email input
      const recipientMatch = src.match(/Recipient email<input[^>]*?type="email"[^>]*?>/);
      expect(recipientMatch).not.toBeNull();
      expect(recipientMatch?.[0]).toContain('autoComplete="email"');
    });
  }
});
