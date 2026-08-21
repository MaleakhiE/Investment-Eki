# Iteration 112 — Focus-ring hardening (WCAG 2.4.7 / 1.4.11 follow-ups)

## Category

Accessibility / Keyboard operability (review-driven hardening of iteration 111).

## Executive summary

Iteration 111 added a global `:focus-visible` indicator for WCAG 2.4.7. Its four role-separated reviewers approved/merged it, but two flagged Low-severity refinements that were deferred rather than shipped. This iteration closes both so the defect list from 111 is fully resolved rather than left open.

## Defects addressed (from iteration 111 review)

1. **Over-broad `[tabindex]` selector.** The 111 rule used `[tabindex]:focus-visible`. The CSS attribute selector `[tabindex]` matches **any** `tabindex` value, including `tabindex="-1"`. Those are programmatic `focus()` targets (the `AccessibleDialog` container and the investment form-title `<h2>` at `src/app/investments/page.tsx:339`), not keyboard tab stops, and must never draw a visible ring — a ring on a `tabindex="-1"` element is both visually wrong and confusing for AT users. Fixed by switching to `[tabindex="0"]`, which only matches real tab stops.

2. **Ring fails ≥3:1 on dark surfaces.** The accent ring `#087f6b` (`--accent-dark`) measures 4.58:1 on `--background`, 4.93:1 on `--card`, 4.34:1 on `--mint` (all pass WCAG 1.4.11 ≥3:1), but only **2.68:1** against `--ink` (`#17352f`) — the auth story panel and the `.app-brand-mark`. That is below the 3:1 non-text minimum, so a control focused over those dark surfaces had an under-visible ring. Fixed by adding a dark-surface variant that swaps the ring to `--accent-light` (`#d8f7ef`, ≈11:1 on ink), scoped to `.auth-story` and `.app-brand-mark`.

3. **Specificity hygiene.** The original rule used plain element/attribute selectors (specificity 0,0,1,0). To prevent future `!important` wars with component-level Tailwind `focus-visible:ring-*` utilities, the selectors are now wrapped in `:where(...)`, which pins specificity to zero. Tailwind utilities (even without `!important`) therefore always win per source order, and the global ring remains the graceful fallback.

## Change

In `src/app/globals.css`:

- Interactive selector list moved under `:where(...)` with `[tabindex="0"]` replacing bare `[tabindex]`.
- `input`/`select`/`textarea:focus-visible` kept (still win over the earlier `input:focus { outline:none }` by source order).
- New dark-surface block: `.auth-story :where(...) :focus-visible` and `.app-brand-mark:focus-visible` set `outline-color: var(--accent-light)`.

## Non-goals

- Not changing focus **order** or adding tab stops (WCAG 2.4.3).
- Not removing the existing mint `box-shadow` on inputs or the investments-page-scoped `:focus-visible` rule.
- Not touching component markup — purely global CSS.
- The brand mint `#00d4aa` (sub-3:1 as a non-text data indicator) remains a deliberate, documented non-goal.

## Acceptance criteria

- [x] `tabIndex={-1}` programmatic-focus targets get no ring (selector is `[tabindex="0"]`, not `[tabindex]`).
- [x] Controls on `--ink` dark surfaces use a light ring (≥3:1 there).
- [x] Global ring uses `:where(...)` so it cannot override component ring utilities.
- [x] Regression test `src/app/focus-visible.test.ts` guards both behaviors (negative assertion on `[tabindex]:focus-visible`; positive on dark-surface variant).
- [x] No component markup or logic changed.

## Validation

- `npx tsc --noEmit` — Passed (0 errors).
- `npm run lint` — Passed (0 errors; 1 pre-existing unrelated warning in `src/lib/loop-control/state.test.ts`).
- `npx jest --ci` — 139 suites / 1131 tests passed; 3 DB-env-blocked suites fail at import for missing `DATABASE_URL` — pre-existing, not regressions.
- `git diff --check` — clean.

## Review matrix

Reviewed at the exact pushed HEAD SHA (recorded on the PR):

- Accessibility Reviewer — pending
- QA / Test Engineer — pending
- Frontend Engineer — pending
- CTO / Principal Engineer — pending

## Deployment / rollback

Pure CSS change in `src/app/globals.css` plus test/doc. Rollback = revert the commit.

## Known risks

Minimal. `:where(...)` zero-specificity means a component that *removes* its own `focus-visible:ring` but keeps `focus:outline-none` would fall back to the zero-specificity global ring — which is exactly the desired safety net.
