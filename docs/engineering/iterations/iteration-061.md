# Iteration 061 — Cashflow list empty state

## Category

UX, UI, and accessibility.

## Executive summary

Iteration 061 improves the cashflow module's empty state by replacing the plain "No transactions yet" text with an accessible, visually consistent onboarding card, providing a clear CTA to add the first transaction.

## User or operational problem

When a user has no transactions, the cashflow page shows a simple "No transactions yet" text. This provides no guidance on how to start tracking finances, lacks a CTA, and is less polished than the Goals and Investments empty states.

## Repository evidence

- `src/app/cashflow/page.tsx` line 398: `{... : 'No transactions yet'}</p>`.
- `src/app/cashflow/cashflow-accessibility.test.ts` lacks tests for the empty state.

## Scope

- Implement an accessible empty state card for the transactions list.
- Add a "Add Transaction" CTA in the empty state.
- Ensure consistency with Goals (Iter 059) and Investments (Iter 060).
- Update `cashflow-accessibility.test.ts` to assert the empty state contract.

## Non-goals

- No changes to transaction calculations.
- No changes to existing filter/search logic.

## Acceptance criteria

- Transactions list shows an onboarding card when empty.
- Empty state uses `role="status"` and `aria-live="polite"`.
- Contains a clear CTA.
- Source-level regression test covers the new empty state copy.

## Implementation details

In `src/app/cashflow/page.tsx`:
- Replace the `<p>` tag in line 398 with a structured card containing an icon, heading, descriptive text, and CTA button.

In `src/app/cashflow/cashflow-accessibility.test.ts`:
- Add assertions for the new onboarding card components.

## Product and UX impact

Reduces user friction by providing a clear entry point to start recording cashflow data.

## Accessibility impact

Uses `role="status"` to ensure screen readers announce the state change correctly.

## Validation commands and results

- `npx jest --runTestsByPath src/app/cashflow/cashflow-accessibility.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Deployment notes

Standard frontend deployment.

## Rollback procedure

Revert to the previous commit or restore the original `<p>` tag.
