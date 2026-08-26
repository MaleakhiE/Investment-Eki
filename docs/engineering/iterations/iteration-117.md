# Iteration 117 — `autocomplete` tokens on personal-data email inputs (WCAG 1.3.5)

## Category

Accessibility / Identify Input Purpose (WCAG 1.3.5, AA).

## Executive summary

WCAG 1.3.5 requires that inputs collecting user information expose a programmatic purpose via the `autocomplete` attribute so browsers, password managers, and assistive tech can identify the field. The auth forms (login/register/forgot/reset) already carried correct tokens (`email`, `new-password`, `current-password`). A fresh audit of the in-app forms found two remaining personal-data `type="email"` inputs in the superadmin SMTP configuration that lacked any `autoComplete` token: the "From address" field and the "Send Test Email" "Recipient email" field. This iteration adds `autoComplete="email"` to both, and adds a regression test guarding them.

## Problem evidence

Before this iteration, `src/app/superadmin/smtp/page.tsx` had:

- Line 209 — `From address<input required type="email" ... />` — **no `autoComplete`** (the adjacent Username/Password inputs had `username` / `new-password`, but the email field was missed)
- Line 223 — `Recipient email<input required type="email" ... />` — **no `autoComplete`**

Both collect an actual email address (the "From address" becomes the mail `From:` header; the recipient is where the test message is sent). Per WCAG 1.3.5 these must declare `autoComplete="email"`.

Inputs intentionally left without a token (verified out of scope):

- `cashflow/page.tsx` "Search transactions" — a local client-side filter, not personal data; keeps `aria-label` + `autoComplete="off"`.
- Financial inputs (amount via `CurrencyInput`, goal name, transaction description) — no matching WCAG 1.3.5 token exists, so adding a token would be meaningless.

## Change

`src/app/superadmin/smtp/page.tsx` — two attribute additions only, no structural/handler/logic change:

- `From address` input: added `autoComplete="email"`.
- `Recipient email` input: added `autoComplete="email"`.

## New regression test

`src/app/autocomplete-tokens.test.tsx` — asserts both SMTP `type="email"` inputs carry `autoComplete="email"`. Mutation-sensitive: deleting either token fails the assertion.

## Acceptance criteria

- [x] SMTP "From address" input has `autoComplete="email"`.
- [x] SMTP "Recipient email" input has `autoComplete="email"`.
- [x] Auth forms' existing autocomplete tokens untouched (no regression).
- [x] Regression test guards against token removal.
- [x] No handler/logic change.

## Validation

- `npx tsc --noEmit` — Passed (0 errors).
- `npm run lint` — Passed (0 errors; 1 pre-existing unrelated warning in `src/lib/loop-control/state.test.ts`).
- `npx jest --ci` — 143 suites / 1160 tests passed; 3 DB-env-blocked suites fail at import for missing `DATABASE_URL` — pre-existing, not regressions.
- `git diff --check` — clean.

## Review matrix

Reviewed at the exact pushed HEAD SHA (recorded on the PR):

- Accessibility Reviewer — pending
- QA / Test Engineer — pending
- Frontend Engineer — pending
- CTO / Principal Engineer — pending

## Deployment / rollback

One app page gets two attribute additions plus a new regression test. No data, schema, auth, or API impact. Rollback = revert the commit.

## Known risks

Minimal. `autoComplete="email"` is the correct WCAG 1.3.5 token for any email-entry field; the change only improves browser/password-manager/AT identification. No visual or behavioral change.