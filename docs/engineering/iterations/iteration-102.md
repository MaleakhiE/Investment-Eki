# Iteration 102 — Announce client-side form-validation errors to assistive tech

## Category

Accessibility / screen-reader announcements.

## Executive summary

Iteration 102 closes an accessibility gap on the auth pages: client-side form-validation
failures (e.g. password mismatch, weak password) were rendered inside a plain
`<div>` with NO `role`/`aria-live`, so screen readers did not announce them when
they appeared. A shared `FormError` component now renders the error with
`role="alert" aria-live="assertive"` while keeping the existing red-tinted visual
styling, and the register + reset-password pages reuse it.

## User or operational problem

Without `role="alert"`/`aria-live`, assistive-technology users submitting the
register or reset-password form received no announcement when client-side
validation blocked submission, so they could not tell why the form did not
progress.

## Repository evidence

- `src/app/(auth)/register/page.tsx` lines 78–83: validation error rendered inside a plain `<div className="...bg-red-500/10..."><p>{error}</p></div>` with no role/aria-live.
- `src/app/(auth)/reset-password/page.tsx` lines 82–86: same gap.
- `src/app/(auth)/login/page.tsx`: no plain-div error — it already routes failures through `FeedbackModal` (`role="dialog"`, `aria-labelledby`/`aria-describedby`), so no change was required there.

## Scope

- Add `src/components/ui/FormError.tsx` (shared component: `role="alert"` + `aria-live="assertive"`, preserves the red-tinted container, supports an optional `className`).
- Replace the plain error `<div>` on register and reset-password pages with `<FormError>`.
- Add `src/app/(auth)/auth-form-error.test.ts` asserting the error node carries `role="alert"`, `aria-live="assertive"`, the visible message, and the retained visual classes.
- No server/auth behavior change.

## Acceptance criteria

- Register and reset-password inline validation errors use `role="alert"` + `aria-live="assertive"`.
- Visual styling (red tint, dashed-free rounded container) is preserved.
- Source-level regression test covers the alert attributes and message.

## Validation commands and results

- `npx jest --runTestsByPath src/app/(auth)/auth-form-error.test.ts` — 3 passed.
- `npx tsc --noEmit` — clean.
- `npm run lint` — 0 errors (pre-existing unrelated warning in loop-control state.test.ts).

## Known risks

None. Pure frontend UI change; login page already compliant.
