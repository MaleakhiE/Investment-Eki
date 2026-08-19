# Iteration 099 — Cashflow expenses per category accessible empty state

## Category

UX, UI, and accessibility.

## Executive summary

Iteration 099 improves the cashflow page's "Expenses per Category" breakdown empty state. Previously a bare `<p>No data yet</p>`, it is now the accessible onboarding-card pattern (`role="status"`, `aria-live="polite"`, `aria-hidden` decorative icon, `#f5fbf9` bg, `border-dashed border-[#dcece8]`, `#dff5ef` icon circle) with localized Indonesian copy.

## User or operational problem

When a user has no expense transactions, the "Expenses per Category" section showed a plain "No data yet" message without screen-reader announcement or the consistent visual treatment used across all other empty states (iterations 059–098).

## Repository evidence

- `src/app/cashflow/page.tsx` line 430: `) : <p className="text-xs sm:text-sm text-zinc-500 text-center py-6">No data yet</p>}` inside the `summary?.expense_by_category` conditional.

## Scope

- Replace the plain `<p>No data yet</p>` with the accessible onboarding card.
- Add `src/app/cashflow/cashflow-expenses-empty-state.test.ts` asserting the copy + accessibility attributes.

## Acceptance criteria

- Expenses per Category card shows an onboarding card when no expense data exists.
- Empty state uses `role="status"` and `aria-live="polite"`.
- Source-level regression test covers the new empty state copy.

## Validation commands and results

- `npx jest --runTestsByPath src/app/cashflow/cashflow-expenses-empty-state.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Known risks

None. Pure frontend UI change. No calculation/auth/data-access changes.