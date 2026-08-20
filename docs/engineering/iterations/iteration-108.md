# Iteration 108 — Analytics financial status color contrast (WCAG 1.4.3)

## Category

Accessibility / Color contrast.

## Executive summary

Iteration 107 fixed the low-contrast gain/loss colors on the investments page. The analytics page carried the same defect on a larger surface: 14 occurrences of `text-green-400` / `text-red-400` conveying income, expense, savings, portfolio return, and per-asset return values on light `card` backgrounds. Those shades measure ≈1.66:1 (green-400) and ≈2.64:1 (red-400) against the light background — well below the WCAG 2.2 AA 4.5:1 minimum for normal text. Iteration 108 replaces every financial-status use with the design system's accessible tokens `#087f6b` (≈4.71:1) and `#b84c49` (≈4.81:1), and upgrades the savings-rate mid-state from `text-amber-400` to `text-amber-700`. Existing `+` sign prefixes are preserved so meaning is never conveyed by color alone.

## User or operational problem

The analytics page is the primary surface where a user reads their financial position: average monthly income/expense, savings rate, portfolio return, total income/expense/savings, and gold/mutual-fund returns. Users with low vision could not reliably read these values because the green and red text was too light against the near-white card backgrounds. This is the same class of defect the accessibility reviewer flagged on PR #116, applied consistently across a page with 14 affected values rather than 2.

## Repository evidence

- `src/app/analytics/page.tsx` contained 14 matches for `text-green-400` / `text-red-400`, including:
  - line 174 Avg Monthly Income, line 178 Avg Monthly Expense (static value colors);
  - line 182 Avg Savings Rate (three-state ternary with `text-amber-400` mid-state);
  - line 186 Portfolio Return, line 294 monthly net-cashflow row values;
  - lines 307/311/315/319 Total Income / Total Expense / Total Savings / Avg Monthly Savings;
  - line 344 portfolio Gain/Loss, lines 362/379 gold and mutual-fund Return;
  - line 152 the error message text.
- `src/app/globals.css` (lines 154–156) defines the accessible return colors `--accent-dark: #087f6b` and `--danger: #b84c49`, already used by `.investment-return.is-positive` / `.is-negative`.
- Iteration 107 (`docs/engineering/iterations/iteration-107.md`) established this exact token substitution as the accepted remedy, with measured ratios recorded by the accessibility reviewer on PR #117.

## Scope

- Replace `text-green-400` → `text-[#087f6b]` and `text-red-400` → `text-[#b84c49]` for every financial-status value on the analytics page (static colors and conditional ternaries).
- Replace the savings-rate mid-state `text-amber-400` → `text-amber-700`.
- Replace the error-message `text-red-400` → `text-[#b84c49]`.
- Preserve all existing `+` sign prefixes.
- Add a source-level contrast regression test.

## Non-goals

- No change to calculations, data fetching, storage, or API behavior.
- No change to the analytics tab semantics, responsive layout, or table structure from earlier iterations.
- The decorative gold/mutual-fund brand accents (`text-amber-400`, `text-blue-400` used for asset labels and the risk-profile chip) are left unchanged — they are category identity colors, not pass/fail financial status, and are tracked separately if a broader palette audit is warranted.
- The `bg-green-400` / `bg-red-400` chart bar fills are left unchanged (non-text graphical objects fall under WCAG 1.4.11, a different criterion and a separate objective).

## Acceptance criteria

- No financial-status ternary on the analytics page uses `text-green-400` or `text-red-400`.
- No static financial value uses `font-bold text-green-400` / `font-bold text-red-400`.
- Positive values use `text-[#087f6b]`; negative values use `text-[#b84c49]`.
- The savings-rate mid-state uses `text-amber-700`.
- `+` sign prefixes on portfolio return and gain/loss are preserved.
- `npx tsc --noEmit` exits 0.
- `npm run lint` exits 0 (1 pre-existing unrelated warning).
- Full Jest run passes with only the 3 known DB-environment-blocked suites failing.
- New source-level contrast regression test passes.

## Implementation details

In `src/app/analytics/page.tsx`:

- Replaced all 12 financial-status occurrences of the `'text-green-400' : 'text-red-400'` pairing and the standalone static value colors with the accessible tokens.
- Savings-rate three-state ternary: `text-green-400 / text-amber-400 / text-red-400` → `text-[#087f6b] / text-amber-700 / text-[#b84c49]`.
- Error paragraph: `text-red-400` → `text-[#b84c49]`.

In `src/app/analytics/analytics-contrast.test.ts` (new):

- Asserts the accessible tokens are present.
- Asserts zero `? 'text-green-400'` / `? 'text-red-400'` status ternaries remain and no `font-bold text-green-400` / `font-bold text-red-400` static values remain.
- Asserts the `+` sign prefixes on `totalReturn` and `totalGain` are preserved (WCAG 1.4.1).

## Accessibility impact

WCAG 1.4.3 (Contrast Minimum) — all 14 financial-status values on the analytics page now render at ≥4.5:1 against the light card background, up from 1.66:1–2.64:1. WCAG 1.4.1 (Use of Color) remains satisfied through the `+`/`-` sign prefixes and `formatCurrency`'s minus sign. The change also brings the analytics page into visual consistency with the investments page (iteration 107) and the site-wide `.investment-return` styling.

## Validation commands and results

- `npx tsc --noEmit`: exit 0.
- `npm run lint`: exit 0 (1 pre-existing unrelated warning in `src/lib/loop-control/state.test.ts`).
- `npx jest --runTestsByPath src/app/analytics/analytics-contrast.test.ts src/app/analytics/analytics-responsive.test.ts src/app/analytics/analytics-tabs.test.ts src/app/a11y-regression-gate.test.tsx --runInBand`: 4 suites, 9 tests passed (axe gate green, prior analytics tests still green).
- `npx jest --ci`: 136 suites / 1119 tests passed; 3 suites blocked by environment (missing `DATABASE_URL`), pre-existing and unrelated.
- `git diff --check`: clean.

## Pull-request reference

Pending.