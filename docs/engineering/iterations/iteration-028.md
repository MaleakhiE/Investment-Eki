# Iteration 028: goal update input integrity

Date: 2026-07-31
Branch: `feat/loop-engineering-28-cashflow-date-range`
Baseline: `f08f3ee`

## Problem and evidence

`updateGoal()` validates only target/current amounts. Explicit runtime values
for `name`, `deadline`, `category`, and `priority` can be persisted without the
same contracts enforced by `createGoal()`. Invalid dates can reach JavaScript
Date construction, priorities can be fractional/out of range, and falsy or
non-string values can be silently ignored or written. The dirty baseline tests
already cover negative and over-maximum goal additions.

## User story

As a user editing a goal, I need invalid edits to return a validation error
before encryption or persistence, while clearing a deadline and ordinary
partial updates continue to work.

## Scope and design

- Reuse the existing `FinancialInputError`, `parseCalendarDate`, and goal
  category set; do not add a schema or dependency.
- Validate every explicitly supplied update field with the create boundary:
  non-empty trimmed names up to 100 characters, valid categories, integer
  priorities 1–5, and exact MySQL-range calendar dates.
- Preserve omitted fields, explicit `deadline: null` clearing, ownership
  scoping, encrypted monetary persistence, and the API envelope.
- Keep unknown keys ignored as the existing compatibility behavior.

## Exclusions and recovery

No migration, normalization of historical rows, taxonomy change, or UI redesign.
Rollback is a code-only revert; no stored data needs restoration.

## Acceptance criteria

1. Invalid explicit goal edits fail before database reads/writes.
2. Valid partial edits and deadline clearing retain existing behavior.
3. Service and route tests cover invalid runtime types, boundaries, ownership,
   and response mapping.
4. Full tests, typecheck, lint, build, Prisma validation/generation, audit
   classification, and diff checks pass.
