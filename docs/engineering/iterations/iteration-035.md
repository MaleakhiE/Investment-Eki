# Iteration 035: transaction API error privacy

Date: 2026-08-01
Branch: `feat/loop-engineering-35-transaction-error-privacy`
Baseline: `184c81e`

## Problem and evidence

The transaction collection and item route handlers pass caught errors directly
to `console.error`. Prisma messages can include SQL/context, while transaction
errors occur on authenticated financial-data endpoints. Goal, budget, and
investment snapshot routes already reduce this surface to an allowlisted
Prisma error code; transaction routes are inconsistent.

## User story

As an operator, I need enough taxonomy to diagnose transaction failures without
putting private database or financial details into application logs.

## Scope

- Add one shared helper that returns a Prisma-style `P####` code or
  `UNCLASSIFIED`.
- Use it in transaction collection POST/GET and item PUT/DELETE catch blocks,
  replacing the three equivalent route-local copies.
- Add regression tests proving responses stay private and logs contain no raw
  error message while preserving allowlisted codes.

## Exclusions and limits

No response, authentication, ownership, financial calculation, schema,
migration, dependency, or logging transport changes. Existing unrelated routes
remain separate slices. Production log aggregation and browser/staging smoke
are not available locally.

## Acceptance criteria

- Raw transaction error messages, SQL, IDs, and financial values never reach
  route logs.
- Valid Prisma codes remain available for operational classification.
- Unknown/error-like values classify as `UNCLASSIFIED`.
- HTTP status and standard API envelopes remain unchanged.
- Focused and full tests, typecheck, lint, Prisma validation, build, migration
  status, audit, and diff checks are recorded.
