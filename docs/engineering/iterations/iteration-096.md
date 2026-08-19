# Iteration 096 — Budgets accessible empty state

## Category

UX, UI, and accessibility.

## Executive summary

Iteration 096 improves the budgets module's empty state by adding `role="status"` and `aria-live="polite"` so screen readers announce the empty state. The visual design (icon, heading, copy, CTA) was already onboarding-quality and is preserved.

## User or operational problem

When a user has no budgets, the page shows an onboarding card but without an explicit live-region role, so assistive technology may not announce the state change. This diverges from the accessibility pattern used across Goals/Investments/Cashflow/Accounts/Settings/Analytics/Dashboard.

## Repository evidence

- `src/app/budget/page.tsx` line 206: `<div className="text-center py-10">` inside the `budgets.length === 0` branch.

## Scope

- Add `role="status"` and `aria-live="polite"` to the budgets empty-state container.
- Add `src/app/budget/budgets-empty-state.test.ts` asserting the empty state contract.

## Acceptance criteria

- Budgets list shows an onboarding card when empty.
- Empty state uses `role="status"` and `aria-live="polite"`.
- Source-level regression test covers the new attributes.

## Validation commands and results

- `npx jest --runTestsByPath src/app/budget/budgets-empty-state.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Known risks

None. No calculation/auth/data-access changes.
