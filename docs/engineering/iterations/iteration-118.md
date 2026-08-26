# Iteration 118 — Brand mint `#00d4aa` removed from text roles on light surfaces (WCAG 1.4.3)

## Category

Accessibility / Contrast Minimum (WCAG 1.4.3, AA).

## Executive summary

The brand mint `#00d4aa` was used as *text* colour on the app's light card/page surfaces in 15 places. Measured against those surfaces it lands at **1.80–1.91:1**, far below the 4.5:1 AA threshold for normal text (and below even the 3:1 large-text threshold). This iteration swaps every text-role usage to the accessible same-hue token `#087f6b` (**4.66–4.93:1**), already shipped as `--accent-dark` from iterations 107/116, while deliberately keeping mint as a graphical fill.

## Problem evidence

Relative-luminance contrast for the mint token:

| Foreground | `#ffffff` | `#f5fbf9` | `#f3faf8` | `#0d1f1c` | `#16332f` |
|---|---|---|---|---|---|
| `#00d4aa` (mint) | **1.91** | **1.82** | **1.80** | 8.94 | 7.10 |
| `#087f6b` (accessible) | 4.93 | 4.71 | 4.66 | 3.46 | 2.75 |

Mint is only accessible on the *dark* `--ink` surfaces. Every `text-[#00d4aa]` occurrence found sat on a light surface — verified there were **zero** occurrences inside a dark container (`bg-[#16332f]`, `bg-[#0d1f1c]`, `auth-story`, sidebar).

Affected text usages fixed (15 total):

- `dashboard/page.tsx` — "View details", "View all" (×2), goal-percentage value, empty-state "Add transaction" CTA
- `cashflow/page.tsx` — "View all", "Edit" hover, empty-state "Add transaction" CTA
- `goals/page.tsx` — "Edit" hover, "Reopen" hover
- `investments/page.tsx` — "Edit" action in the gold and mutual-fund snapshot tables
- `analytics/page.tsx` — "Enable in Settings"
- `(auth)/login/page.tsx` — "Create account"
- `(auth)/register/page.tsx` — "Sign in"

## Change

Pure Tailwind colour-token swaps: `text-[#00d4aa]` → `text-[#087f6b]` and `hover:text-[#00d4aa]` → `hover:text-[#087f6b]`. No structural, handler, or logic change.

Deliberately **out of scope** (mint stays):

- Graphical fills and tints — `bg-[#00d4aa]`, `bg-[#00d4aa]/10`, `from-[#00d4aa]` gradients, progress bars, `focus:border-[#00d4aa]`. These are non-text and either exempt or already pass the 3:1 non-text threshold as adjacent-colour components against their containers.
- `#00a88a` text usages (2.85–3.01:1 on light) — a real but separate gap; recorded as the iteration-119 candidate rather than widening this iteration's scope.

## New regression test

`src/app/mint-text-contrast.test.tsx` (16 tests) — for each of the 7 affected routes asserts no `text-[#00d4aa]` and no `hover:text-[#00d4aa]`; additionally asserts the accessible `#087f6b` token is actually *present* (so the fix cannot be satisfied by deleting the affected links) and that mint is still available as a graphical fill (guards against an over-broad purge).

## Acceptance criteria

- [x] Zero `text-[#00d4aa]` / `hover:text-[#00d4aa]` remaining in `src/`.
- [x] Replacement is the accessible `#087f6b` (≥4.66:1 on all light surfaces).
- [x] Mint retained for fills/gradients/tints/focus borders (brand palette preserved).
- [x] Regression test guards both directions (no mint text; accessible token present).
- [x] No handler/logic/structural change.

## Validation

- `npx tsc --noEmit` — Passed (0 errors).
- `npm run lint` — Passed (0 errors; 1 pre-existing unrelated warning, `_branch` in `src/lib/loop-control/state.test.ts`).
- `npx jest --ci` — 144 suites / **1176 tests** passed; 3 DB-env-blocked suites fail at import for missing `DATABASE_URL` — pre-existing, not regressions.
- `git diff --check` — clean.

## Review matrix

Reviewed at the exact pushed HEAD SHA (recorded on the PR):

- Accessibility Reviewer — pending
- QA / Test Engineer — pending
- Frontend Engineer — pending
- CTO / Principal Engineer — pending

## Deployment / rollback

Colour-token swaps across 7 page files plus one new regression test. No data, schema, auth, or API impact. Rollback = revert the commit.

## Known risks

Visual only: mint-coloured links/actions become the darker teal `#087f6b`. This is the same hue family already used across the app for accessible accent text (iterations 107/116), so the change is visually consistent rather than novel. Mint remains the brand fill colour, so brand identity is unaffected.