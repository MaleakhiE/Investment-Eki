# Iteration 101 — Goals empty state aria-live alignment

## Category

Accessibility / consistency.

## Executive summary

Iteration 101 closes a one-line consistency gap: the Goals "Active Goals" empty state had `role="status"` but was missing `aria-live="polite"`, making it the only empty state in the app that does not announce itself to screen readers. This is exactly the regression class fixed across iterations 062–100.

## User or operational problem

Without `aria-live="polite"`, screen readers do not reliably announce the Goals empty state when it appears, diverging from the standardized pattern used on every other module's empty state.

## Repository evidence

- `src/app/goals/page.tsx` line 340: `<div role="status" className="rounded-2xl border border-dashed border-[#b9ddd4] bg-[#f5fbf9] p-6 text-center">` — missing `aria-live`.

## Scope

- Add `aria-live="polite"` to the Goals empty-state container.
- Add `src/app/goals/goals-empty-state.test.ts` asserting `role="status"` + `aria-live="polite"` + dashed border.

## Acceptance criteria

- Goals empty state uses `role="status"` and `aria-live="polite"`.
- Source-level regression test covers the attribute pair.

## Validation commands and results

- `npx jest --runTestsByPath src/app/goals/goals-empty-state.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Known risks

None. Pure frontend UI change.
