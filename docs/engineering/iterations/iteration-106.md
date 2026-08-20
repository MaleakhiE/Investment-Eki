# Iteration 106 — Investments history tables (semantic HTML for accessibility)

## Category

Accessibility / Semantic HTML.

## Executive summary

The investments page (`src/app/investments/page.tsx`) displayed monthly investment snapshots using `<div>` elements stacked vertically, which lack proper table semantics. Iteration 106 replaces the gold and mutual fund snapshot lists with semantically correct `<table>` elements (`<caption>`, `<thead>`, `<th scope="col">`, `<tbody>`) so screen readers, keyboard navigation, and assistive technologies can correctly convey row/column structure, headers, and data relationships — meeting WCAG 1.4.1 and 2.4.3.

## User or operational problem

When a user with a screen reader navigated to the investments history section, the data was presented as generic `<div>` blocks with no row/column association. There were no `<th>` elements to label months, invested amounts, current values, gain/loss, or actions. Users relying on assistive technology could not determine which value corresponded to which metric, nor navigate the table efficiently. Sighted users also experienced poorer visual scanning compared to a real table layout.

## Repository evidence

- `src/app/investments/page.tsx` (lines 449–521) contained gold snapshot history rendered as `<div className="flex items-center justify-between p-3 bg-[#f5fbf9] rounded-xl">` blocks with no `<table>` markup.
- `src/app/investments/page.tsx` (lines 487–521) contained mutual fund snapshot history rendered identically as `<div>` blocks.
- The analytics page (`src/app/analytics/page.tsx` lines 270–275) already used semantic tables with `<caption>`, `<thead>`, `<th scope="col">`, `<tbody>` — a established pattern in the codebase.
- No existing tests asserted table structure for the investments page history.

## Scope

- Convert gold snapshot history from `<div>` blocks to a `<table>` with `<caption>`, `<thead>`, `<th scope="col">`, `<tbody>`.
- Convert mutual fund snapshot history from `<div>` blocks to a `<table>` with `<caption>`, `<thead>`, `<th scope="col">`, `<tbody>`.
- Both tables must include an `overflow-x-auto` wrapper for horizontal scroll on small screens and a `max-h-[300px]` container.
- Empty-state (`role="status"`) remains unchanged.
- Keep all existing `onClick` edit/delete handlers intact.
- Add a regression test asserting the table markup exists in source.

## Non-goals

- No change to calculations, snapshot storage, or API behavior.
- No refactoring of unrelated page sections.
- No new Jest test runner configuration.

## Acceptance criteria

- Gold snapshot history renders as a semantic `<table>` with `<caption>` (sr-only), `<thead>` with `<th scope="col">` headers, and `<tbody>` rows with `<th scope="row">` for the first column.
- Mutual fund snapshot history renders as a semantic `<table>` with analogous structure.
- Both tables are wrapped in `overflow-x-auto rounded-lg border border-[#dcece8] max-h-[300px] overflow-y-auto`.
- Empty-state `div role="status"` remains unchanged.
- `npx tsc --noEmit` exits 0.
- `npm run lint` exits 0 (1 pre-existing warning).
- `npm test -- --runInBand` passes all suites (3 DB-dependent excluded as expected).
- Source-level regression test passes.

## Implementation details

In `src/app/investments/page.tsx`:

- Gold history: replaced `<div className="space-y-2 max-h-[300px] overflow-y-auto"> {goldSnapshots.map(...)}</div>` with `<div className="overflow-x-auto rounded-lg border border-[#dcece8] max-h-[300px] overflow-y-auto"> <table>...</table> </div>`.
- MF history: same pattern, with 7 `<th scope="col">` headers (Product, Platform, Month, Invested, Current value, Gain/Loss, Actions).
- Empty-state guards (`goldSnapshots.length === 0`, `mfSnapshots.length === 0`) remain unchanged.

In `src/app/investments/investments-a11y.test.ts` (new):

- Asserts the gold table markup: `<caption className="sr-only">Gold investment snapshots</caption>`, `<th scope="col">`, `<th scope="row"`.
- Asserts the MF table markup: `<caption className="sr-only">Mutual fund investment snapshots</caption>`, and that the two tables together declare 12 `<th scope="col">` headers (5 gold + 7 mutual fund).
- Asserts empty-state `role="status"` preserved.

## Product and UX impact

Screen readers can now announce table headers and row relationships. Keyboard users can navigate rows/columns with standard table commands (e.g., JAWS/NVDA table review). Sighted users get a more compact, scrollable layout with clear column alignment.

## Accessibility impact

WCAG 1.4.1 (Use of Color) — data is now perceivable via table structure, not solely by position or color. WCAG 2.4.3 (Focus Order) — focusable elements inside the table maintain correct tab order. The tables inherit the page's existing `role="status"` empty-state behavior.

## Graph Engineering impact

### Product capability graph

Investment tracking → semantic HTML tables → improved a11y → source-level a11y regression test.

### Module dependency graph

UI components → table markup → screen reader compatibility → test assertion.

## Validation commands and results

- `npx jest --runTestsByPath src/app/investments/investments-a11y.test.ts src/app/dashboard/dashboard-responsive.test.ts src/lib/format.test.ts src/lib/loop-control/policy.test.ts src/lib/loop-control/state.test.ts src/lib/loop-control/cli.test.ts src/app/dashboard/dashboard-ux-clarity.test.ts src/components/layout/sidebar-mobile-nav.test.ts --runInBand`: 133 suites, 1110 tests passed (3 DB-dependent suites skipped as expected).
- `npx tsc --noEmit`: exit 0.
- `npm run lint`: exit 0 (1 pre-existing warning).
- `git diff --check`: clean.

## Pull-request reference

Pending.