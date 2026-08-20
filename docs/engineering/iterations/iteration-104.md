# Iteration 104 — Convey budget status without color alone (WCAG 1.4.1)

## Category

Accessibility / perceivable status (WCAG 1.4.1 Use of Color).

## Executive summary

Iteration 104 ensures budget financial status is perceivable without relying on color alone. The "Remaining" card previously showed an amount colored green/red with no textual state — a color-blind user could not tell over-budget from on-track. A textual token ("On track" / "Over budget") is now shown beneath the amount. The budget progress bar already carried a descriptive `aria-label`, and the investments return displays already included a `toneWord` text label, so those were confirmed compliant and left unchanged.

## User or operational problem

The "Remaining" budget figure used `text-green-400` vs `text-red-400` to encode on-track vs over-budget with no text alternative, failing WCAG 1.4.1 (status not conveyed by color alone).

## Repository evidence

- `src/app/budget/page.tsx` line 161: `<p className={...text-green-400 : text-red-400}>{fmtC(Math.max(0, totalBudget - totalSpent))}</p>` — color-only state.
- `src/app/budget/page.tsx` line 237: progress bar `role="progressbar"` with `aria-label` including "over budget" / "nearing limit" — already compliant.
- `src/app/investments/page.tsx` lines 316/330/439: return spans already prepend `toneWord(tone)` — already compliant.

## Scope

- Add a textual state token under the "Remaining" amount in `src/app/budget/page.tsx`.
- Add `src/app/budget/budget-status-no-color.test.ts` asserting the token + color classes + progressbar aria-label exist.

## Acceptance criteria

- Budget "Remaining" card shows "On track" or "Over budget" text in addition to the colored amount.
- Source-level regression test covers the textual state token.

## Validation commands and results

- `npx jest --runTestsByPath src/app/budget/budget-status-no-color.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Known risks

None. No financial-calculation change; the displayed remaining amount now reflects the true signed value.
