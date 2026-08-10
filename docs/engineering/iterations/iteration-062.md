# Iteration 062 — guided investment snapshot workspace

## Category

UX, accessibility, and financial presentation correctness.

## Executive summary

Redesign the Investments page around its primary job: recording one monthly position. Empty portfolios now use neutral language, source metadata sits beside the value it qualifies, and an explicit asset switcher leads into the unchanged snapshot workflow.

## User or operational problem

The provenance banner dominated the first viewport, every panel had similar weight, and zero-value returns appeared positive. Beginner users had to interpret calculator details before understanding the next action.

## Repository evidence and root cause

`src/app/investments/page.tsx` rendered `+Rp 0 (0%)` whenever gain/loss was non-negative and placed a large provenance card before the portfolio and form. The page had no testable distinction between an empty return and a real zero return.

## Scope

- Add a pure return-presentation helper with neutral, positive, and negative states.
- Replace the dominant provenance banner with compact source metadata beside the gold value.
- Add a compact total, portfolio overview, and Gold/Reksa dana switcher.
- Preserve all existing APIs, calculations, save/delete handlers, feedback, and history states.

## Non-goals

No schema, endpoint, provider integration, recommendation, fee calculation, or trade execution changes. The market-researched CSV import and reconciliation features remain future bounded iterations.

## Acceptance criteria

- Empty assets say `Belum ada data` without a positive prefix or green status.
- Source and update time remain visible next to the gold value.
- The snapshot form remains keyboard operable with labelled native controls.
- Existing loading, unavailable, empty, populated, save, edit, delete, and retry behavior remains intact.

## Implementation details

`getInvestmentReturnPresentation` centralizes display-only return state. The page uses a Split Studio hierarchy with a summary rail and guided workspace, while page-scoped CSS reuses the existing FinTrack tokens and native controls.

## Product, UX, and accessibility impact

The first viewport now answers “what do I have?” and “what should I do next?”. Zero state is communicated by text and neutral tone. The asset switcher exposes `aria-pressed`, controls retain 44px targets and visible focus, and the month/current-value fields have stable label associations.

## Graph Engineering impact

- Product: portfolio understanding → selected asset → snapshot review → saved history.
- Domain: presentation state reads existing user-owned snapshots; ownership boundaries are unchanged.
- Modules: page → pure presentation helper; existing routes/services/Prisma remain unchanged.
- Data flow: API response → validated history → totals → presentation-only tone → render.
- User journey: Investments → understand empty/total state → select asset → record snapshot → review history.
- Tasks: neutral return helper → guided hierarchy → responsive styling → validation → review → PR.

## Security and financial correctness

No trust boundary or persistence contract changed. Display-formatted values are not used as calculation inputs. Invalid/non-finite or non-positive invested values fail to a neutral unavailable percentage.

## Database and compatibility impact

No database or migration change. Existing route and API contracts are preserved.

## Validation commands and results

- Focused Jest (3 suites, 11 tests) — Passed.
- Full Jest (103 suites, 1,028 tests) — Passed.
- `npx tsc --noEmit` — Passed.
- `npm run lint` — Passed with one pre-existing warning in `src/lib/loop-control/state.test.ts`.
- `npm run build` plus OCR trace — Passed with safe local build-only environment values.
- `npx prisma format` and `npx prisma validate` — Passed.
- `npm run db:status` and `npm run db:verify` — Passed against disposable MySQL 8.4.
- `npm audit --omit=dev --audit-level=critical` — Passed at the critical threshold; existing high/moderate advisories remain outside this UI-only iteration.
- `git diff --check` — Passed.

## Review and visual validation

Independent diff review found and then verified repairs for historical-snapshot overcounting, an invisible focus target, an empty grid column, and header spacing. Final review found no High or Medium blockers. Authenticated browser fixture data was unavailable, so responsive validation is limited to source/CSS review and production rendering; no live screenshot pass is claimed.

## Deployment and rollback

Deploy as a frontend-only change. Roll back by reverting the Iteration 062 commit; no data rollback is required.

## Known limitations and follow-up work

The redesign does not add fees or reconciliation provenance. The research report recommends a duplicate-aware CSV transaction import as the next separate product feature, followed by investment reconciliation metadata.

## Pull-request reference

Pending publication authorization.
