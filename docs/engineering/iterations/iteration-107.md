# Iteration 107 — Investments history gain/loss color contrast (WCAG 1.4.3)

## Category

Accessibility / Color contrast.

## Executive summary

Iteration 106 converted the investments snapshot history to semantic tables but carried over the pre-existing low-contrast `text-green-400` / `text-red-400` Tailwind shades for the gain/loss numeric cells. On the light table background (`#f5fbf9` / white), those 400-weight shades fall below the WCAG 2.2 AA 4.5:1 contrast ratio for normal-size text. Iteration 107 replaces them with the design system's accessible tokens — `#087f6b` (accent-dark, the same positive-return color used site-wide via `.investment-return.is-positive`) and `#b84c49` (danger token, `.investment-return.is-negative`) — and adds `font-semibold` for additional legibility. The existing `+`/`-` text sign prefix is preserved so meaning is never conveyed by color alone.

## User or operational problem

Users with low vision reading the gold and mutual-fund gain/loss columns saw light green/red numbers that could be hard to distinguish from the background, failing WCAG 1.4.3 (Contrast Minimum). The accessibility reviewer on PR #116 flagged this as a non-blocking advisory for follow-up.

## Repository evidence

- `src/app/investments/page.tsx` (gold history, line ~465 and MF history, line ~488): gain/loss cell used `${s.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`.
- `src/app/globals.css` (lines 154–156): the established accessible return colors are `--accent-dark: #087f6b` (positive) and `--danger: #b84c49` (negative), applied via `.investment-return.is-positive` / `.is-negative`.
- The PR #116 accessibility review recorded: "text-green-400/text-red-400 on the light #f5fbf9/white background ... may fall short of the 4.5:1 ratio ... worth a follow-up check."

## Scope

- Replace `text-green-400` → `text-[#087f6b]` and `text-red-400` → `text-[#b84c49]` for the gain/loss numeric cells in both the gold and mutual-fund history tables.
- Add `font-semibold` to those cells for legibility.
- Preserve the `+`/`-` sign prefix (color is redundant, not sole signal).
- Leave the Delete-button `text-red-400` unchanged (it is an interactive control with hover underline, not a data value; out of scope).
- Add a source-level regression test.

## Non-goals

- No change to calculations, storage, or API behavior.
- No change to the semantic table structure introduced in iteration 106.
- No change to the Delete-button styling or other pages' color usage (tracked separately if needed).

## Acceptance criteria

- Both gold and MF gain/loss cells use `text-[#087f6b]` (positive) and `text-[#b84c49]` (negative).
- Neither gain/loss cell uses `text-green-400` or `text-red-400`.
- The `+`/`-` sign prefix remains.
- `npx tsc --noEmit` exits 0.
- `npm run lint` exits 0 (1 pre-existing warning).
- `npm test -- --runInBand` passes (3 DB-dependent suites excluded as expected).
- New source-level contrast regression test passes.

## Implementation details

In `src/app/investments/page.tsx`:

- Gold history gain/loss `<td>`: `${s.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}` → `font-semibold ${s.gain_loss >= 0 ? 'text-[#087f6b]' : 'text-[#b84c49]'}`.
- MF history gain/loss `<td>`: same replacement.

In `src/app/investments/investments-contrast.test.ts` (new):

- Asserts the accessible token colors are present for the gain/loss cells.
- Asserts the gain/loss ternaries do not use `text-green-400` / `text-red-400`.
- Asserts the `+` sign prefix is preserved (color not the sole signal).

## Accessibility impact

WCAG 1.4.3 (Contrast Minimum) — `#087f6b` and `#b84c49` provide substantially higher contrast against the light table background than the 400-weight shades, and `font-semibold` further improves legibility. WCAG 1.4.1 (Use of Color) remains satisfied via the `+`/`-` prefix and `formatCurrency` minus sign.

## Validation commands and results

- `npx tsc --noEmit`: exit 0.
- `npm run lint`: exit 0 (1 pre-existing unrelated warning).
- `npx jest --runTestsByPath src/app/investments/investments-contrast.test.ts src/app/investments/investments-a11y.test.ts src/app/a11y-regression-gate.test.tsx --runInBand`: 3 suites, 8 tests passed (axe gate green, iteration-106 semantic-table test still green).
- `git diff --check`: clean.

## Pull-request reference

Pending.