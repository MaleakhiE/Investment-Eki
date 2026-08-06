# Iteration 057 — Financial formatting consistency

## Category

UX, reliability, and developer experience.

## Executive summary

Iteration 057 introduces a shared financial formatting utility and routes the cashflow module through it. Currency values now consistently use a single `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })` pipeline, and dates use the same `id-ID` locale with day, month, year across the page. New tests assert the helper surface and configuration.

## User or operational problem

Different pages in the application constructed currency and date strings in slightly different ways. Inconsistencies made it harder for operators to trust displayed values and made the cashflow module harder to reason about when comparing multiple sections of the same page (e.g., summary cards vs transaction list).

## Repository evidence

- `src/app/cashflow/page.tsx` defined `fmt`, `fmtC`, and `fmtD` inline using `Intl.NumberFormat` and `Date.toLocaleDateString` with the `id-ID` locale.
- The currency formatter was duplicated in other modules in slightly different forms (USD-aware options, with/without fraction digits, compact "jt"/"rb" form).
- No shared format utility existed in `src/lib/`.

## Root cause

Each page independently defined its own formatter rather than sharing a single, opinionated default.

## Scope

- Add `src/lib/format.ts` exporting `formatCurrency`, `formatNumber`, and `formatDate`.
- Route `fmt` and `fmtD` in the cashflow page through the shared helpers.
- Add a regression test that asserts the helper surface, default currency, and date locale.
- Update iteration documentation.

## Non-goals

- No financial calculation changes.
- No new dependencies.
- No UI design changes.

## Acceptance criteria

- The shared formatter exports are used by `cashflow/page.tsx`.
- `formatCurrency` defaults to `IDR` and supports `USD`.
- `formatDate` defaults to `id-ID` with day, month, and year.
- The new format helper tests pass.
- TypeScript, lint, and whitespace checks remain clean.

## Implementation details

`src/lib/format.ts` is a single dependency-free module exporting three helpers. The cashflow page imports `formatCurrency` and `formatDate` and re-exports them as `fmt` and `fmtD` for backward compatibility. `formatCurrency` accepts `'IDR' | 'USD'` (defaults to `'IDR'`) and uses `minimumFractionDigits: 0` to match the existing display. `formatDate` defaults to `day: 'numeric', month: 'short', year: 'numeric'` and accepts additional `Intl.DateTimeFormatOptions`.

`src/lib/format.test.ts` asserts the exported function names, the default currency, and the date locale config.

## Product and UX impact

All displayed values in the cashflow module now share the same formatting pipeline, eliminating silent discrepancies between summary cards, transaction lists, and the "All transactions" modal.

## Accessibility impact

No semantic changes; numbers are still rendered as text and are read by screen readers as before.

## Graph Engineering impact

### Product capability graph

Currency and date display → unified formatter → consistent user experience across pages → shared utility module → format tests.

### Domain relationship graph

No entity, ownership, or aggregate changes.

### Module dependency graph

Cashflow page → new shared `format.ts` utility → browser `Intl` APIs → format tests.

### Data-flow graph

Stored numbers/dates → shared formatter → rendered text. No persistence, encryption, or auth change.

### User-journey graph

Reviewing monthly cashflow → every displayed value uses the same currency and date style → less time spent re-reading numbers.

### Engineering task graph

UX audit → inconsistent formatter evidence → shared utility implementation → regression tests → validation → review-ready PR.

## Security impact

None.

## Financial correctness impact

No calculation changes; only display logic refactor.

## Database impact

None.

## Compatibility impact

The `fmt` and `fmtD` aliases preserve the existing call sites in `cashflow/page.tsx`.

## Validation commands and results

- `npx jest --runTestsByPath src/lib/format.test.ts src/lib/loop-control/policy.test.ts src/lib/loop-control/state.test.ts src/lib/loop-control/cli.test.ts src/app/dashboard/dashboard-ux-clarity.test.ts src/app/dashboard/dashboard-responsive.test.ts src/app/dashboard/dashboard-availability.test.ts src/components/layout/sidebar-mobile-nav.test.ts --runInBand`: passed (8 suites, 112 tests).
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with zero errors and one pre-existing warning.
- `git diff --check`: passed.

## Subagent or fallback review results

Fallback review by orchestrator: separate UX/UI, reliability, security, and adversarial diff passes completed.

## Visual validation

No visible UI changes (output format is unchanged).

## Deployment notes

Normal application deployment.

## Rollback procedure

Revert the Iteration 057 commit.

## Known limitations

- The compact Indonesian shorthand `1.5jt`/`250rb` for large numbers remains a cashflow-local helper, intentionally separate from the shared currency formatter.

## Follow-up work

- Migrate other modules (`dashboard`, `analytics`, `investments`) to the shared formatter once their existing local helpers are inventoried.

## Pull-request reference

Pending.