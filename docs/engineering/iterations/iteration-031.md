# Iteration 031: budget DELETE ID boundary

Date: 2026-07-31
Branch: `feat/loop-engineering-31-budget-delete-id-boundary`
Baseline: `36e06ab`

## Problem and evidence

`DELETE /api/budgets/[id]` calls `BigInt(id)` directly. Noncanonical,
negative, zero, fractional, scientific-notation, and overflow route IDs can
therefore reach a generic 500 or an incorrectly coerced service call. The
repository already has the bounded `parseDatabaseId` utility used by the
account and goal mutation routes.

## Scope and acceptance

- Authenticate first, then reuse `parseDatabaseId` and return the standard
  private 400 validation envelope for malformed IDs.
- Preserve user-scoped `deleteBudget` calls, missing/foreign idempotent success,
  and existing private 500 behavior for service failures.
- Add focused route tests for ordering, malformed forms, both valid BIGINT
  boundaries, and private errors; no schema or data changes.
- Full tests, typecheck, lint, build, Prisma checks, audit classification, and
  diff checks must pass. Rollback is a code-only revert.
