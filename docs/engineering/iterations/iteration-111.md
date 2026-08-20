# Iteration 111 — Global keyboard focus-visible indicator (WCAG 2.4.7)

## Category

Accessibility / Keyboard operability.

## Executive summary

The app suppressed the native focus outline on text inputs (`input:focus { outline: none }`) and only the investments page defined an explicit `:focus-visible` indicator (`globals.css:165`). Everywhere else — links, buttons, tabs, the mobile bottom-nav, toggle switches, `[role]` controls, and every non-investments form field — keyboard and assistive-technology users had no reliable indication of which control held focus. That is a WCAG 2.4.7 (Focus Visible, Level AA) failure on the primary navigation and action surfaces.

## Problem evidence

- `src/app/globals.css:325` — `input:focus, select:focus, textarea:focus { … outline: none; box-shadow: 0 0 0 2px rgba(0,212,170,.2); }`. The only focus cue for fields was a low-contrast mint glow (~1.7:1), and it was keyed off `:focus` (not `:focus-visible`), so it also fired on mouse clicks.
- `src/app/globals.css:165` — a proper `:focus-visible` outline existed but was **scoped to `.investments-page` only**. No global rule covered the dashboard, budget, cashflow, goals, settings, analytics, accounts, or auth routes.
- Result: tabbing through the bottom navigation, header actions, or any button showed nothing.

## Change

Added a global `:focus-visible` indicator in `src/app/globals.css`:

- `a`, `button`, `[role="button"|"tab"|"switch"|"menuitem"|"link"]`, `summary`, and `[tabindex]` get `outline: 2px solid var(--accent-dark); outline-offset: 2px; border-radius: 6px`.
- `input`, `select`, `textarea` get `outline: 2px solid var(--accent-dark); outline-offset: 1px` in addition to the existing mint border, so fields now have a real outline instead of `outline: none` alone.
- The ring uses `var(--accent-dark)` = `#087f6b`, which measures ≥3:1 against the light card/background surfaces (WCAG 1.4.11 non-text contrast), so the indicator itself is perceivable.
- `:focus-visible` (not `:focus`) is used so pointer interaction stays visually clean while keyboard/AT navigation always shows focus.

## Non-goals

- Not changing focus **order** or adding new tab stops (WCAG 2.4.3) — out of scope.
- Not altering the existing mint `box-shadow` on inputs or the investments-page-scoped rule — the new global rule is additive and the investments rule remains as a slightly tighter local override.
- Not touching component markup — this is a purely global CSS addition.

## Acceptance criteria

- [x] A global `:focus-visible` outline covers links, buttons, role-based controls, and `[tabindex]` elements.
- [x] Form fields (`input`/`select`/`textarea`) receive an explicit `:focus-visible` outline, not just `outline: none`.
- [x] The focus ring uses the accessible `#087f6b` token (≥3:1 non-text contrast).
- [x] Regression test `src/app/focus-visible.test.ts` guards the indicator against silent removal.
- [x] No component markup or logic changed; no focus-order change.

## Validation

- `npx tsc --noEmit` — Passed (0 errors).
- `npm run lint` — Passed (0 errors; 1 pre-existing unrelated warning in `src/lib/loop-control/state.test.ts`).
- `npx jest --ci` — 139 suites / 1130 tests passed; 3 DB-env-blocked suites (`user-identity.service.test.ts`, `proxy.test.ts`, `savings-suggestion.service.test.ts`) fail at import for missing `DATABASE_URL` — pre-existing, not regressions.
- `git diff --check` — clean.

## Review matrix

Reviewed at the exact pushed HEAD SHA (recorded on the PR):

- Accessibility Reviewer — pending
- QA / Test Engineer — pending
- Frontend Engineer — pending
- CTO / Principal Engineer — pending

## Deployment / rollback

Pure CSS addition in `src/app/globals.css` plus one test file. Rollback = revert the commit; no data, schema, or API impact.

## Known risks

Minimal. The `:focus-visible` outline could visually overlap tightly-packed custom controls; offset and radius are tuned to stay inside container padding. No functional risk.
