# Iteration 102 — Announce auth form-validation errors to assistive technology

## Category

Accessibility / form validation UX.

## Executive summary

Iteration 102 makes client-side validation errors on the auth pages perceivable to screen readers. The register and reset-password pages render validation failures inside a plain colored `<div>` with no `role` or `aria-live`, so screen readers did not announce them. This iteration adds `role="alert"` + `aria-live="assertive"` to both error containers, matching the established contract already used by settings/cashflow/accounts error regions.

## User or operational problem

When a user submits an invalid form (e.g., "Passwords do not match", bcrypt-boundary errors), the error message was visually shown but not announced by assistive technology, leaving screen-reader users unaware of the failure.

## Repository evidence

- `src/app/(auth)/register/page.tsx` lines 78–81: `<div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20"><p className="text-sm text-red-400 text-center">{error}</p></div>` — no `role`/`aria-live`.
- `src/app/(auth)/reset-password/page.tsx` lines 82–85: same plain `<div>` pattern.
- Contrast: `settings/page.tsx:227` and `cashflow/page.tsx:273` correctly use `role="alert"`.

## Scope

- Add `role="alert" aria-live="assertive"` to the error containers in `register/page.tsx` and `reset-password/page.tsx`.
- Add `src/app/(auth)/auth-form-errors.test.ts` asserting the attributes.

## Acceptance criteria

- Both auth error containers carry `role="alert"` and `aria-live="assertive"`.
- Source-level regression test covers the new attributes.

## Validation commands and results

- `npx jest --runTestsByPath src/app/(auth)/auth-form-errors.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Known risks

None. No API or calculation change; purely client-side ARIA enhancement.
