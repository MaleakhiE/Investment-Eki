# Iteration 029: goal delete ID boundary

Date: 2026-07-31
Branch: `feat/loop-engineering-29-goal-delete-id-boundary`
Baseline: `876ded1`

## Problem and evidence

`PATCH /api/goals/[id]` uses a canonical positive signed-BIGINT parser, but
`DELETE /api/goals/[id]` still calls `BigInt(id)` directly. Malformed IDs such
as `abc`, `0`, `01`, `1.0`, or values above MySQL BIGINT can therefore reach a
generic 500 path instead of the private standard 400 validation envelope.

## User story and scope

As a user or caller deleting a goal, malformed identifiers should be rejected
deterministically before the scoped service is called, while valid IDs and the
existing idempotent missing/foreign delete behavior remain unchanged.

- Reuse the route's existing `parseGoalId` and `MAX_SIGNED_BIGINT` boundary.
- Add DELETE route tests for authentication ordering, malformed IDs, valid
  boundary IDs, service errors, and private response behavior.
- Do not alter database schema, deletion semantics, ownership, or response text
  for valid requests.

## Recovery and acceptance

This is application-only and rolls back by reverting the route/test commit.
Every malformed ID must return 400 before `deleteGoal`; valid signed BIGINT IDs
must be passed as internal `bigint` values after authentication. Full tests,
typecheck, lint, build, Prisma validation, audit classification, and diff checks
must pass.
