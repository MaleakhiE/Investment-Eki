# Iteration 098 — Dashboard budgets accessible empty state

## Category

UX, UI, and accessibility.

## Executive summary

Iteration 098 improves the dashboard's budgets summary empty state. When a user has no active budgets, the card previously showed a plain text message ("You have no active budgets yet.") without an explicit live-region role. This iteration upgrades it to the established accessible onboarding-card pattern (`role="status"`, `aria-live="polite"`, `aria-hidden` decorative icon, `#f5fbf9` bg, `border-dashed border-[#dcece8]`, `#dff5ef` icon circle) with localized Indonesian copy and a CTA link.

## User or operational problem

The dashboard budgets empty state diverged from the onboarding-card pattern used across iterations 059–097. It lacked `role="status"` / `aria-live`, so screen readers would not reliably announce the empty state, and it lacked the consistent dashed-border + icon-circle visual treatment.

## Repository evidence

- `src/app/dashboard/page.tsx` lines 269–273: `{budgets.length === 0 && budgetStatus === 'ready' ? <div className="rounded-2xl bg-[#f5fbf9] p-4 ...><p>You have no active budgets yet.</p>...</div>`.

## Scope

- Replace the plain empty state with the accessible onboarding card pattern.
- Add `src/app/dashboard/dashboard-budgets-empty-state.test.ts` asserting the copy + accessibility attributes.

## Acceptance criteria

- Dashboard budgets card shows an onboarding card when no budgets exist.
- Empty state uses `role="status"` and `aria-live="polite"`.
- Source-level regression test covers the new empty state copy.

## Validation commands and results

- `npx jest --runTestsByPath src/app/dashboard/dashboard-budgets-empty-state.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Known risks

None. Pure frontend UI change. No calculation/auth/data-access changes.
