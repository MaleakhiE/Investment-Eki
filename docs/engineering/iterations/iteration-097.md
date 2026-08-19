# Iteration 097 — Analytics cashflow trend accessible empty state

## Category

UX, UI, and accessibility.

## Executive summary

Iteration 097 closes a remaining plain empty-state gap in the analytics module: the "Net Cashflow Trend" card still rendered a bare `<p>No data</p>` when no trend data was present. Iteration 064 converted the cashflow-trend and investment-allocation empty states to onboarding cards, but the cashflow-trend branch was reverted/overlooked and still used the plain paragraph. This iteration restores the consistent accessible onboarding card.

## User or operational problem

Screen readers and new users received an unlabeled, visually inconsistent empty state in the analytics cashflow trend card. It diverged from the established onboarding-card pattern used across iterations 059–096.

## Repository evidence

- `src/app/analytics/page.tsx` line 297: `) : <p className="text-xs text-zinc-500 text-center py-8">No data</p>}` inside the `trend.length > 0` branch of the Net Cashflow Trend card.

## Scope

- Replace the plain `<p>No data</p>` with the established accessible onboarding card (`role="status"`, `aria-live="polite"`, `aria-hidden` decorative icon, `#f5fbf9` bg, `border-dashed border-[#dcece8]`, `#dff5ef` icon circle, localized copy + CTA guidance).
- Add `src/app/analytics/analytics-trend-empty-state.test.ts` asserting the copy + accessibility attributes.

## Acceptance criteria

- Net Cashflow Trend card shows an onboarding card when no trend data exists.
- Empty state uses `role="status"` and `aria-live="polite"`.
- Source-level regression test covers the new empty state copy.

## Validation commands and results

- `npx jest --runTestsByPath src/app/analytics/analytics-trend-empty-state.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Known risks

None. Pure frontend UI change. No calculation/auth/data-access changes.
