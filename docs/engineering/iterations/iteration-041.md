# Iteration 041: dashboard budget overview

Date: 2026-08-01
Branch: `feat/loop-engineering-41-dashboard-budget-overview`
Baseline: `aab112e`

## User problem and evidence

The dashboard exposes income, expenses, accounts, goals, investments, and
recurring activity, but users must leave the dashboard to understand budget
usage. The existing Budget page and `/api/budgets` already provide deterministic
category spending, remaining amounts, and over-budget status; the dashboard
does not consume that capability.

## User story

As a daily user, I want to see whether my budgets are on track immediately after
opening the dashboard, with a clear next action when no budget exists.

## Scope

- Fetch the existing budget collection alongside dashboard data.
- Add a responsive budget overview card with total limit, spent amount,
  remaining/over-budget state, progress semantics, and a link to Budget.
- Add an empty state linking to budget setup and an API-failure state with a
  retry link to the Budget page.
- Preserve server-calculated `spent`, `remaining`, `percentage`, and
  `isOverBudget`; do not duplicate category-level financial calculations.

## Acceptance criteria

- Populated budgets show deterministic totals formatted as IDR and a bounded
  progress bar with `role="progressbar"`, value, label, and non-color status.
- Empty budgets explain the next action and link to `/budget`.
- The card remains usable at mobile, tablet, and desktop widths with long
  category/status text.
- Loading continues to use the existing dashboard skeleton; a failed budget
  request does not hide other dashboard sections.
- Keyboard users can reach the Budget link and status text is announced.

## Exclusions and risks

No new endpoint, schema, migration, budget semantics, recommendation logic, or
tracking. Browser screenshots are unavailable locally; source-level responsive
and accessibility review plus component tests are required.
