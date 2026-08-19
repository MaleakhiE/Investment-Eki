# Iteration 064 — Analytics accessible empty states

## Category

UX, UI, and accessibility.

## Executive summary

Iteration 064 improves the analytics module's "No data" empty states (cashflow trend, investment allocation) by replacing the plain text with structured, accessible onboarding cards.

## User or operational problem

When analytics data is unavailable, the page shows plain text strings. This is inconsistent with the onboarding-card pattern established in other modules.

## Repository evidence

- `src/app/analytics/page.tsx` lines 262, 406.

## Scope

- Replace plain empty-state text with accessible onboarding cards.
- Add regression tests in `src/app/analytics/analytics-empty-states.test.ts`.

## Acceptance criteria

- Analytics module shows onboarding cards when empty.
- Empty state uses `role="status"` and `aria-live="polite"`.

## Validation commands and results

- `npx jest --runTestsByPath src/app/analytics/analytics-empty-states.test.ts`
- `npx tsc --noEmit`
- `npm run lint`
