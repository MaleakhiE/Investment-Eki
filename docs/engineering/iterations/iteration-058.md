# Iteration 058 — Analytics mobile responsiveness and accessibility

## Category

UX, UI, and accessibility.

## Executive summary

Iteration 058 enhances the analytics module’s mobile layout. The AI recommendation breakdown metrics (`Investable`, `Gold`, `Mutual Fund`) now adaptively stack on narrow screens (`grid-cols-1 sm:grid-cols-3`), and the asset allocation section transitions smoothly from stacked vertical alignment to side-by-side (`flex-col sm:flex-row`). The SVG chart ring is marked `aria-hidden="true"` so screen readers rely entirely on the textual legend.

## User or operational problem

On mobile viewports, the side-by-side arrangement of the investment allocation chart and recommendation grid crammed the text and percentages, creating tight spacing, potential text wrapping, and poor screen-reader semantics for decorative SVG elements.

## Repository evidence

- `src/app/analytics/page.tsx` contained `grid grid-cols-3 gap-3` for recommendation metrics, which didn't collapse on mobile.
- `src/app/analytics/page.tsx` used `flex items-center gap-6` for the asset allocation container, causing the 128px SVG chart to squish the legend on narrow screens.
- The decorative SVG donut chart lacked `aria-hidden="true"`.

## Scope

- Update the recommendation metrics grid to `grid-cols-1 sm:grid-cols-3`.
- Update the asset allocation layout to `flex-col sm:flex-row`.
- Add `aria-hidden="true"` to the decorative donut chart SVG.
- Add `src/app/analytics/analytics-responsive.test.ts` to assert the responsive class contracts.

## Non-goals

- No change to calculations or analytics APIs.
- No changes to tab management logic.

## Acceptance criteria

- Analytics recommendation grid stacks vertically on screens below the `sm:` breakpoint.
- Asset allocation chart and legend stack vertically on mobile screens.
- SVG ring chart has `aria-hidden="true"`.
- Source-level regression test `analytics-responsive.test.ts` passes.
- TypeScript, ESLint, and git diff checks pass clean.

## Implementation details

In `src/app/analytics/page.tsx`:
- Changed `grid grid-cols-3 gap-3 mb-4` to `grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4`.
- Changed `flex items-center gap-6` to `flex flex-col sm:flex-row items-center gap-6`.
- Added `aria-hidden="true"` to `<svg viewBox="0 0 100 100" ...>`.

In `src/app/analytics/analytics-responsive.test.ts`:
- Added source-level assertions validating the responsive classes and ARIA attribute.

## Product and UX impact

Better mobile readability and breathing room for AI recommendation metrics and investment allocation charts on mobile devices.

## Accessibility impact

Improved screen-reader behavior by suppressing raw SVG paths and focusing screen-reader feedback on the percentage legend.

## Graph Engineering impact

### Product capability graph

Financial analytics → responsive recommendation grid & asset allocation layout → improved mobile usability → source-level responsive test.

## Validation commands and results

- `npx jest --runTestsByPath src/app/analytics/analytics-responsive.test.ts src/app/dashboard/dashboard-responsive.test.ts src/lib/format.test.ts`: passed (3 suites, 9 tests).
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed zero errors (1 pre-existing warning).
- `git diff --check`: passed.

## Pull-request reference

Pending.