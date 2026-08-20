# Iteration 103 — Guarantee exactly one `<h1>` per page

## Category

Accessibility / document outline (WCAG 2.4.6, 1.3.1).

## Executive summary

Iteration 103 closes an accessibility gap in the document outline: several primary
routes rendered their page heading as an `<h2>` (or had none), so assistive-technology
users had no consistent, single top-level heading per page. Authenticated pages
(budget, goals, analytics, cashflow, settings) now standardize on the existing
`PageHeader` component (which renders exactly one `<h1>`), and the root route carries a
visually hidden `<h1>`. Auth pages already render a single `<h1>` through `AuthShell`,
so no change was required there. A source-level regression test asserts each targeted
route module declares exactly one `<h1>` (counting shared-component usage).

## User or operational problem

Without exactly one `<h1>` per page, screen-reader users and heading-navigation
tooling could not reliably identify the primary page title. Authenticated pages used
`<h2>` for the page title while `PageHeader` (used elsewhere) renders `<h1>`, producing
an inconsistent outline.

## Repository evidence

- `src/app/(auth)/login/page.tsx`, `register/page.tsx`, `reset-password/page.tsx`,
  `forgot-password/page.tsx`: render through `AuthShell`, which already emits a single
  `<h1>` from its `title` prop — no change required.
- `src/app/budget/page.tsx`, `goals/page.tsx`, `analytics/page.tsx`, `cashflow/page.tsx`,
  `settings/page.tsx`: used `<h2>` for the page title — replaced with `<PageHeader>`.
- `src/app/page.tsx`: redirect-only server component with no rendered heading — added a
  visually hidden `<h1>` (no behavioral change; the page still always redirects).
- `src/components/ui/PageHeader.tsx`: already renders exactly one `<h1>`; reused.
- `src/components/auth/AuthShell.tsx`: already renders exactly one `<h1>`; unchanged.

## Scope

- Replace the inline `<h2>` page headers on budget, goals, analytics, cashflow, and
  settings with `<PageHeader eyebrow title description action? />` (preserving the
  existing title, description, and action button).
- Add a visually hidden `<h1>` to the root `app/page.tsx` redirect component.
- Add `src/app/route-heading-contract.test.ts` asserting each targeted route module
  declares exactly one `<h1>` (literal `<h1>` + `<PageHeader` usage + `<AuthShell`
  usage = 1).
- No behavioral change; all interaction logic and styling preserved.

## Acceptance criteria

- Every targeted route (budget, goals, analytics, cashflow, settings, root, and the 4
  auth pages) exposes exactly one `<h1>`.
- Authenticated pages use the shared `PageHeader` contract; auth pages keep `AuthShell`.
- Source-level regression test covers the single-`<h1>` invariant.

## Validation commands and results

- `npx jest --runTestsByPath src/app/route-heading-contract.test.ts --runInBand` — 10 passed.
- `npx tsc --noEmit` — clean.
- `npm run lint` — 0 errors (pre-existing unrelated warning in loop-control state.test.ts).

## Known risks

None. Pure frontend UI change with no behavioral or financial-calculation impact.
