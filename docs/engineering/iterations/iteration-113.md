# Iteration 113 — Associate auth form labels (WCAG 1.3.1 / 4.1.2)

## Category

Accessibility / Programmatically associated form labels.

## Executive summary

The auth entry forms (`login`, `register`, `forgot-password`, `reset-password`) rendered visible `<label>` elements but never associated them with their `<input>` controls via `htmlFor` + `id`. Screen readers therefore announce the input without its visible label, leaving the email and password fields unnamed — a WCAG 1.3.1 (Info and Relationships) and 4.1.2 (Name, Role, Value) failure on the two most security-critical surfaces (credential entry). `forgot-password` and `reset-password` were already correct; `login` and `register` were not.

## Problem evidence

`src/app/(auth)/login/page.tsx` and `src/app/(auth)/register/page.tsx` had markup like:

```tsx
<label className="... font-medium text-zinc-400 mb-2">Email</label>
<input type="email" ... placeholder="name@email.com" />
```

- `<label>` with **no `htmlFor`**, `<input>` with **no `id`** → no programmatic association.
- Reliance on `placeholder` as the sole name source is explicitly disallowed (WCAG 1.3.1 / 3.3.2): placeholders are not a substitute for a label and disappear on focus.
- The `password` field's visible label sat in a flex `<div>` with a "Forgot password?" link, compounding the risk: without association, AT users hear only the placeholder.

`forgot-password` and `reset-password` already paired `<label htmlFor="email">` with `<input id="email">`, confirming the intended pattern in the codebase.

## Change

- `src/app/(auth)/login/page.tsx`: added `htmlFor="email"` to the Email label and `id="email"` to the input; `htmlFor="password"` / `id="password"` on the Password pair.
- `src/app/(auth)/register/page.tsx`: same pairing for Email, Password, and Confirm-password.
- No visible text, no CSS, no placeholder text, no handler/logic changes — only label-for/control-id association attributes.

## Non-goals

- Not adding new fields or changing the auth flow, validation, or API behavior.
- Not touching `forgot-password`/`reset-password` (already correct).
- Not altering the placeholder text — placeholders are kept for visual hint only; the label is now the authoritative accessible name.

## Acceptance criteria

- [x] Every visible `<label>` in `login` and `register` carries `htmlFor`; every associated `<input>` carries the matching `id`.
- [x] No `<label>` in the auth forms is missing an association.
- [x] No control is left unnamed (each `<input>` has an id referenced by its label, or an `aria-*` name).
- [x] Regression test `src/app/auth-form-labels.test.tsx` guards all four auth pages against association drift.
- [x] No visible/logic changes — diff is association attributes only.

## Validation

- `npx tsc --noEmit` — Passed (0 errors).
- `npm run lint` — Passed (0 errors; 1 pre-existing unrelated warning in `src/lib/loop-control/state.test.ts`).
- `npx jest --ci` — 140 suites / 1143 tests passed; 3 DB-env-blocked suites fail at import for missing `DATABASE_URL` — pre-existing, not regressions.
- `git diff --check` — clean.

## Review matrix

Reviewed at the exact pushed HEAD SHA (recorded on the PR):

- Accessibility Reviewer — pending
- QA / Test Engineer — pending
- Frontend Engineer — pending
- CTO / Principal Engineer — pending

## Deployment / rollback

Two auth form pages get only `htmlFor`/`id` attributes plus one regression test. No data, schema, auth, or API impact. Rollback = revert the commit.

## Known risks

Minimal. Because the labels already existed and were visible, the only behavioral change is that screen readers now announce the field names. No visual regression.
