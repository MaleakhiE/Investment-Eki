# Iteration 100 — Cashflow list accessible empty states

## Category

UX, UI, and accessibility.

## Executive summary

Iteration 100 improves the cashflow transaction-list empty states. Previously a single bare `<p>` toggled between "No results" (when filtering) and "No transactions yet" (when empty). This iteration splits it into two accessible states: a neutral filtered "No results" card and an onboarding "Belum ada transaksi" card with a CTA — both using `role="status"`, `aria-live="polite"`, `aria-hidden` decorative icons, and the established `#f5fbf9` / `border-dashed` / `#dff5ef` styling tokens.

## User or operational problem

The cashflow list's empty state lacked screen-reader announcement and the consistent onboarding-card treatment used across iterations 059–099. The "No transactions yet" message also lacked a clear next action.

## Repository evidence

- `src/app/cashflow/page.tsx` line 406: `) : <p className="text-xs sm:text-sm text-zinc-500 text-center py-6">{searchQuery || filterCategory !== 'all' || filterType !== 'all' ? 'No results' : 'No transactions yet'}</p>}`.

## Scope

- Replace the single `<p>` with a conditional: filtered "No results" card and empty "Belum ada transaksi" onboarding card (with `Link` CTA to add a transaction; added `import Link from 'next/link'`).
- Add `src/app/cashflow/cashflow-list-empty-state.test.ts` asserting the copy + accessibility attributes.

## Acceptance criteria

- Transaction list shows an onboarding card when empty (no filter).
- Filtered view shows a neutral "No results" card.
- Both states use `role="status"` and `aria-live="polite"`.
- Source-level regression test covers the new empty state copy.

## Validation commands and results

- `npx jest --runTestsByPath src/app/cashflow/cashflow-list-empty-state.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Known risks

None. Pure frontend UI change. No calculation/auth/data-access changes.
