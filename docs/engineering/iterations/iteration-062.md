# Iteration 062 — Accounts empty state

## Category

UX, UI, and accessibility.

## Executive summary

Iteration 062 improves the accounts module's empty state by replacing the plain "Create your first account to start tracking balances." text with an accessible, visually consistent onboarding card.

## User or operational problem

When a user has no accounts, the accounts page shows a plain text string inside a card with no icon, heading, or clear structure. This is less polished than the Goals (059), Investments (060), and Cashflow (061) empty states and provides no scannable guidance.

## Repository evidence

- `src/app/accounts/page.tsx` line 150: `accounts.length === 0 ? <div className="card rounded-3xl p-6 text-sm text-zinc-500">Create your first account to start tracking balances.</div>`.

## Scope

- Implement an accessible empty state card for the accounts list.
- Ensure consistency with Goals/Investments/Cashflow onboarding cards.
- Add `src/app/accounts/accounts-empty-state.test.ts` asserting the empty state contract.

## Non-goals

- No changes to account calculation, archive, or transfer logic.

## Acceptance criteria

- Accounts list shows an onboarding card when empty.
- Empty state uses `role="status"` and `aria-live="polite"`.
- Source-level regression test covers the new empty state copy.

## Implementation details

In `src/app/accounts/page.tsx`:
- Replace the plain empty-state `<div>` with a structured card (icon, heading, descriptive copy, dashed border, `role="status"` + `aria-live="polite"`).

In `src/app/accounts/accounts-empty-state.test.ts`:
- Assert "Belum ada akun", `accounts.length === 0`, `role="status"`, and `aria-live="polite"`.

## Product and UX impact

Reduces new-user friction by providing a clear, consistent entry point to create the first account.

## Accessibility impact

Uses `role="status"` so screen readers announce the empty state.

## Validation commands and results

- `npx jest --runTestsByPath src/app/accounts/accounts-empty-state.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Deployment notes

Standard frontend deployment.

## Rollback procedure

Revert to the previous commit or restore the original plain empty-state `<div>`.
