# Iteration 050 — Analytics textual data alternative

## Category and executive summary

Category: accessibility and UX. Analytics cashflow charts now have a structured table alternative for users who cannot perceive the visual bars.

## Problem and evidence

`src/app/analytics/page.tsx` represented monthly income, expense, and net cashflow only through colored bars and labels. The underlying server data was available but not exposed as a semantic data table.

## Scope and non-goals

Add a responsive, captioned table for the existing trend rows. Do not alter calculations, API contracts, chart styling, investment advice, or persistence.

## Acceptance criteria

- Table headers and row values expose month, income, expense, and net cashflow.
- Existing charts remain unchanged.
- Table is horizontally scrollable on narrow screens without page overflow.
- Currency values reuse the existing formatter and no new client-side financial logic is introduced.

## Graph engineering and risk

Financial trend API → existing `trend` state → chart and table renderers → accessibility regression test. The table reads the same server-provided values, preserving the existing domain and authorization boundaries.

## Validation, deployment, rollback

Run focused/full Jest, TypeScript, lint, build, Prisma validation, migration status, and diff checks. Browser and screen-reader runtime remain unavailable. No migration/config change; revert the commit to roll back.
