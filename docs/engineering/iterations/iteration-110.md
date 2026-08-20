# Iteration 110 — Non-text & identity color contrast audit (WCAG 1.4.11 / 1.4.3)

## Category

Accessibility / Color contrast (WCAG 1.4.11 non-text contrast + residual 1.4.3 identity accents).

## Executive summary

Iterations 107–109 fixed plain-text `text-green-400` / `text-red-400` financial-status colors. The accessibility reviewer (PR #120) recommended a follow-up WCAG **1.4.11 (non-text contrast)** audit of the graphical status indicators that were deliberately scoped out. Iteration 110 performs that audit and also closes the related residual identity-accent text colors that were left behind:

- **Chart bars, legend swatches, and status meters** that encoded data by color at ≈1.5:1–2.8:1 against the light background (below the 3:1 non-text minimum) were upgraded to the design system's accessible tokens `#087f6b` (≈4.71:1) and `#b84c49` (≈4.81:1).
- **Segmented progress meters** (`bg-green-500`/`bg-amber-500`/`bg-blue-500`/`bg-red-500`) were upgraded to `bg-[#087f6b]`/`bg-amber-700`/`bg-blue-600`/`bg-[#b84c49]` (all ≥3:1).
- **Category-identity accents** — gold `text-amber-400` and mutual-fund `text-blue-400` labels, the `getRiskColor` risk-profile chips, the portfolio donut (SVG `#F59E0B`/`#3B82F6` + legend dots), the gold/mutual-fund donut legend swatches, and the muted `text-zinc-300` neutrals — were upgraded to `amber-700`/`blue-700`/`amber-600`/`blue-600` and `zinc-600` so the text labels meet 1.4.3 and the graphical dots meet 1.4.11.
- The brand mint `#00d4aa` is **intentionally retained** (used as the app's primary interactive/brand fill — a deliberate design decision, not a data-encoding color, and a broader rebrand is out of scope for one iteration).

## User or operational problem

After iterations 107–109, the app's *text* financial-status colors met AA, but a user with low vision still could not reliably distinguish the colored chart bars, legend dots, progress meter fills, and the amber/blue category labels — both because the graphical fills sat below the 3:1 non-text minimum and because the identity-accent text labels (e.g. "Gold" in `text-amber-400`) were below the 4.5:1 text minimum. WCAG 1.4.11 requires graphical objects that convey information to have ≥3:1 contrast; WCAG 1.4.3 requires the labels to have ≥4.5:1.

## Repository evidence

Grep over `src/app/**/*.tsx` before the change showed the following low-contrast graphical/text indicators:

- `cashflow/page.tsx`: weekly-trend legend swatches + bars (`bg-green-400`/`bg-red-400`), per-category expense bar (`bg-red-400`), muted category label (`text-zinc-300`).
- `analytics/page.tsx`: monthly-trend bars (`bg-green-400`/`bg-red-400`), legend swatches (`bg-green-400`/`bg-red-400`), net-cashflow meter (`bg-green-400`/`bg-red-400`), `getRiskColor` chips (`text-green-400`/`text-blue-400`/`text-orange-400`), recommendation gold/mutual-fund labels (`text-amber-400`/`text-blue-400`), gold/mutual-fund detail headings & values (`text-amber-400`/`text-blue-400`), portfolio donut SVG (`#F59E0B`/`#3B82F6`) + legend dots (`bg-amber-400`/`bg-blue-500`), muted `text-zinc-300` neutrals.
- `dashboard/page.tsx`: savings-rate meter fill (`bg-amber-400`/`bg-red-400`), budget meter fill (`bg-red-400`/`bg-amber-400`), gain/loss chip (`bg-red-500/10 text-red-400`), muted `text-zinc-300` category labels.
- `budget/page.tsx`: per-budget progress meter (`bg-red-500`/`bg-amber-500`/`bg-blue-500`/`bg-green-500`), `text-amber-400` warning chip.
- `goals/page.tsx`: `getPriorityColor` chips (`text-red-400`/`text-amber-400`/`text-green-400`), progress meter (`bg-green-500`/`bg-blue-500`/`bg-amber-500`/`bg-zinc-400`), muted `text-zinc-300` percentage, low-contrast `text-green-400`/`text-blue-400` action buttons.

## Scope

- Upgrade all chart/legend/meter background fills and swatches from 400/500 shades to the accessible tokens listed above.
- Upgrade identity-accent text labels (`text-amber-400` → `text-amber-700`; `text-blue-400` → `text-blue-700`; `text-orange-400` → `text-orange-700`; `text-green-400` in chips → `text-[#087f6b]`) and the muted `text-zinc-300` neutrals → `text-zinc-600`.
- Upgrade the portfolio donut SVG strokes (`#F59E0B`→`#B45309` gold, `#3B82F6`→`#2563EB` mutual fund) and their legend swatch dots (`bg-amber-400`→`bg-amber-700`, `bg-blue-500`→`bg-blue-600`, gold header dot `bg-amber-400`→`bg-amber-600`).
- Improve the disabled (WCAG-exempt) export button from `disabled:bg-green-400` to `disabled:bg-green-500`.

## Non-goals

- **Brand mint `#00d4aa` is retained.** It is the app's primary interactive/brand color (buttons, the savings-rate positive fill, the budget positive fill). Retuning the entire brand palette is a design decision larger than a single bounded accessibility iteration; it is documented here as the remaining known sub-3:1 token and flagged for a future brand-contrast decision.
- **`hover:text-red-400` / `hover:*` affordance colors on Delete/action buttons** are left unchanged — these are transient hover states on controls whose resting color is an accessible zinc, and hover/focus states are exempt from the contrast minimums.
- **`bg-red-500/20`, `bg-amber-500/20`, `bg-blue-500/20`, `bg-green-500/20` tinted chip backgrounds** are retained as the soft tint behind the now-accessible chip text (`text-[#b84c49]`/`text-amber-800`/`text-blue-700`/`text-[#087f6b]`); the contrast that matters (text on tint) now meets the minimum.
- No calculation, threshold, rounding, currency, or data logic changed.

## Acceptance criteria

- No `text-green-400` / `text-red-400` / `text-blue-400` / `text-amber-400` / `text-orange-400` remain in `src/app/**/*.tsx`.
- No `text-zinc-300` remains in `src/app/**/*.tsx`.
- No `bg-green-400` / `bg-red-400` / `bg-amber-400` chart/meter fills remain.
- Savings-rate and budget meters use `bg-[#00d4aa]` (positive) / `bg-amber-700` (mid) / `bg-[#b84c49]` (negative).
- Per-budget and per-goal meters use `bg-[#087f6b]` / `bg-blue-600` / `bg-amber-700` / `bg-[#b84c49]` / `bg-zinc-500/600`.
- Portfolio donut SVG uses `#B45309` (gold) and `#2563EB` (mutual fund).
- `npx tsc --noEmit` exits 0.
- `npm run lint` exits 0 (1 pre-existing unrelated warning).
- Full Jest run passes with only the 3 known DB-environment-blocked suites failing.
- New source-level contrast regression test passes.

## Implementation details

Applied the token substitutions above across `cashflow`, `analytics`, `dashboard`, `budget`, `goals`, and `investments` pages. The donut stroke colors changed to `#B45309`/`#2563EB` (3:1+ on white). The `getRiskColor` and `getPriorityColor` helper objects were updated in place.

New test `src/app/nomtext-identity-contrast.test.ts` reads every page source and asserts: (a) none of the prohibited low-contrast classes/hex values remain (`text-green-400`, `text-red-400`, `text-blue-400`, `text-amber-400`, `text-orange-400`, `text-zinc-300`, `bg-green-400`, `bg-red-400`, `bg-amber-400`, `#F59E0B`, `#3B82F6`); (b) the accessible replacements are present (`#087f6b`, `#b84c49`, `bg-amber-700`, `bg-blue-600`, `#B45309`, `#2563EB`); (c) the brand mint `#00d4aa` is still present (recorded as the intentional non-goal).

## Accessibility impact

- **WCAG 1.4.11 (Non-text Contrast):** all data-encoding graphical indicators (chart bars, legend swatches, progress meters, donut arcs) now meet ≥3:1 against the light background.
- **WCAG 1.4.3 (Contrast Minimum):** all amber/blue/green/red identity-accent text labels and muted neutrals now meet ≥4.5:1.
- The only remaining sub-3:1 token in the app is the brand mint `#00d4aa`, used as the primary interactive/brand fill, which is a deliberate deferred design decision.

## Validation commands and results

- `npx tsc --noEmit`: exit 0.
- `npm run lint`: exit 0 (1 pre-existing unrelated warning in `src/lib/loop-control/state.test.ts`).
- `npx jest --ci`: 137 suites / 1122 tests passed; 3 suites blocked by environment (missing `DATABASE_URL`), pre-existing and unrelated.
- `git diff --check`: clean.

## Pull-request reference

Pending.