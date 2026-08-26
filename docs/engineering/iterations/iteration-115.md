# Iteration 115 — Target size on settings notification controls (WCAG 2.5.8)

## Category

Accessibility / Target Size (Minimum) — touch operability.

## Executive summary

WCAG 2.5.8 (Target Size (Minimum), AA) requires interactive controls to present a target of at least 24×24 CSS px unless a documented exception applies. An audit of the primary app surfaces found the Settings **Notification settings** panel carried several compact action buttons sized well under 24px tall — `py-0.5`/`py-1` with `text-[9px]`/`text-[10px]` renders at roughly 16–18px. On a touch-first layout these are hard to hit accurately, especially the "Save" threshold button wedged between a `CurrencyInput` and a toggle. This iteration raises those controls to a compliant minimum height and adds a regression test that fails if any settings button drops below 24px again.

## Problem evidence

In `src/app/settings/page.tsx`, five buttons lacked any minimum-height affordance:

| Location | Before | Rendered height |
|---|---|---|
| Low-balance "Save" | `px-2 py-1 text-[9px]` | ≈16px |
| Custom-alerts "Add"/"Cancel" toggle | `text-[10px]` (no padding min) | ≈14px |
| Custom-alert "Save" | `py-1 text-[10px]` | ≈18px |
| Notification "Retry loading" | `font-semibold underline` (no min) | text-height only |
| "Sign Out" | `px-3 py-1.5 text-xs` | ≈28px but no guaranteed min |

The JSON/CSV export buttons, date filters, and the custom-alert Delete button already used `min-h-11` (44px) and were compliant.

## Change

`src/app/settings/page.tsx` — added explicit minimum-height affordances (no layout or logic change):

- Low-balance threshold "Save" → `min-h-[32px]`, padding `px-3 py-1.5`, text `text-xs` (was `text-[9px]`); color darkened to `text-[#008f78]` (already AA).
- Custom-alerts "Add"/"Cancel" toggle → `min-h-[32px]`, `text-xs`, `text-[#008f78]`, added explicit `type="button"`.
- Custom-alert "Save" → `w-full min-h-[36px]`, `text-xs`.
- Notification "Retry loading" inline button → `min-h-11`.
- "Sign Out" → `min-h-11`.

## New regression test

`src/app/settings-target-size.test.tsx` — scans every `<button>` opening tag in the settings page (brace-depth-aware so `onClick={() => …}` arrows don't truncate the tag) and asserts:

1. Every button carries a compliant minimum height (`min-h-11` = 44px, or an arbitrary `min-h-[NNpx]` where NN ≥ 24).
2. No button pairs sub-legible micro text (`text-[9px]`/`text-[10px]`) with a missing min-height.

## Non-goals

- Not resizing the `ToggleSwitch` component (already ≥24px) or the compact filter `<select>`s (already `min-h-11`).
- Not touching other pages' action buttons in this iteration — the settings notification panel was the concentrated 2.5.8 gap; a broader per-page sweep can follow.
- Not changing any handler, submission, or notification-persistence logic.

## Acceptance criteria

- [x] Every `<button>` in `settings/page.tsx` meets the 24px minimum target height.
- [x] The three sub-24px notification buttons are raised to `min-h-[32px]`/`min-h-[36px]`.
- [x] Micro-text (`text-[9px]`) upgraded to at least `text-xs` on the resized controls.
- [x] Regression test guards against reintroducing a sub-24px settings button.
- [x] No layout break, no logic/handler change.

## Validation

- `npx tsc --noEmit` — Passed (0 errors).
- `npm run lint` — Passed (0 errors; 1 pre-existing unrelated warning in `src/lib/loop-control/state.test.ts`).
- `npx jest --ci` — 141 suites / 1148 tests passed; 3 DB-env-blocked suites fail at import for missing `DATABASE_URL` — pre-existing, not regressions.
- `git diff --check` — clean.

## Review matrix

Reviewed at the exact pushed HEAD SHA (recorded on the PR):

- Accessibility Reviewer — pending
- QA / Test Engineer — pending
- Frontend Engineer — pending
- CTO / Principal Engineer — pending

## Deployment / rollback

One app page (`settings/page.tsx`) gets minimum-height utility-class additions plus a new regression test. No data, schema, auth, or API impact. Rollback = revert the commit.

## Known risks

Minimal. The changes only enlarge tap targets and enlarge micro text slightly; the flex/grid containers already accommodate the taller controls (`items-center` rows). No visual regression expected beyond the intended larger touch targets.