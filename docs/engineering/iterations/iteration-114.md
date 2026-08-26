# Iteration 114 — Extend label-association sweep to in-app forms (WCAG 1.3.1)

## Category

Accessibility / Programmatically associated form labels.

## Executive summary

Iteration 113 fixed the auth entry forms (login/register). This iteration extends the label-association sweep to the in-app settings and management forms. The audit revealed two genuine WCAG 1.3.1 gaps in `src/app/accounts/page.tsx` where `<CurrencyInput>` (a custom component rendering a `<div>` + native `<input>`) was wrapped by a `<label>` — implicit association is **invalid** for non-native labelable elements per the HTML spec, so screen readers could not link the visible label to the input. All other in-app forms (settings, cashflow, goals, budget, investments, superadmin smtp) already used valid associations: either explicit `htmlFor`+`id` on native controls, or wrapping labels over native controls.

## Problem evidence

`src/app/accounts/page.tsx` had two invalid patterns:

```tsx
// Edit/add account form
<label className="...">Opening balance<CurrencyInput ... /></label>

// Transfer form
<label className="...">Amount<CurrencyInput ... /></label>
```

- `CurrencyInput` renders a `<div>` wrapper around a native `<input>`. The HTML spec only permits implicit label association with **native** labelable elements (`input`, `select`, `textarea`, `meter`, `progress`). A `<div>` is not labelable, so the association fails silently for AT.
- Screen readers announce the `<CurrencyInput>`'s inner input without the visible "Opening balance" / "Amount" text.

## Change

- `src/app/accounts/page.tsx` (2 fixes):
  1. "Opening balance" → separated into `<label htmlFor="account-opening-balance">Opening balance</label>` + `<CurrencyInput id="account-opening-balance" ... />`
  2. "Amount" (transfer form) → `<label htmlFor="transfer-amount">Amount</label>` + `<CurrencyInput id="transfer-amount" ... />`
- Regression test `src/app/auth-form-labels.test.tsx` extended with a `custom-component label association` suite asserting:
  - No custom component (`CurrencyInput`, `TextInput`, `DatePicker`, `PhoneInput`, `EmailInput`) is wrapped by a `<label>`.
  - Every `<label htmlFor=...>` target id resolves to a real control (native or custom).

## Non-goals

- Not touching `settings/page.tsx`, `cashflow/page.tsx`, `superadmin/smtp/page.tsx` — their wrapping labels over native controls are valid; their explicit `htmlFor`+`id` pairs are already correct.
- Not altering the `CurrencyInput` component itself (it already forwards `id` correctly).
- Not changing placeholder text or visible labels.

## Acceptance criteria

- [x] The two invalid `CurrencyInput`-in-`<label>` patterns in `accounts/page.tsx` are fixed to explicit `htmlFor`/`id`.
- [x] No `<label>` in the in-app forms wraps a custom (non-native) component.
- [x] Every `<label htmlFor=...>` in `accounts/page.tsx` targets a real control id.
- [x] Extended regression test guards against regression (custom-component suite: 2 tests on `accounts/page.tsx`; auth suite still 12 tests on 4 auth pages).
- [x] No visible/logic changes beyond association attributes.

## Validation

- `npx tsc --noEmit` — Passed (0 errors).
- `npm run lint` — Passed (0 errors; 1 pre-existing unrelated warning in `src/lib/loop-control/state.test.ts`).
- `npx jest --ci` — 140 suites / 1145 tests passed; 3 DB-env-blocked suites fail at import for missing `DATABASE_URL` — pre-existing, not regressions.
- `git diff --check` — clean.

## Review matrix

Reviewed at the exact pushed HEAD SHA (recorded on the PR):

- Accessibility Reviewer — pending
- QA / Test Engineer — pending
- Frontend Engineer — pending
- CTO / Principal Engineer — pending

## Deployment / rollback

One app page (`accounts/page.tsx`) gets two `htmlFor`/`id` attribute fixes plus the extended regression test. No data, schema, auth, or API impact. Rollback = revert the commit.

## Known risks

Minimal. Because the labels already existed and were visible, the only behavioral change is that screen readers now announce the field names correctly for the account opening-balance and transfer-amount inputs. No visual regression.