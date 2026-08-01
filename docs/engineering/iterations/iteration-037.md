# Iteration 037: investment API error privacy

Date: 2026-08-01
Branch: `feat/loop-engineering-37-investment-error-privacy`
Baseline: `f555639`

## Problem and evidence

Investment list, detail, history, and snapshot-write routes still pass raw
errors to `console.error`. These endpoints handle encrypted portfolio values
and generated financial transactions; account/cashflow and transaction routes
already use the shared safe error taxonomy.

## Scope and acceptance

- Reuse `safeDatabaseErrorCode` in the four investment route catch blocks.
- Add focused tests for sanitized unknown and allowlisted errors while keeping
  status/envelope and financial service calls unchanged.
- Preserve authentication, user scoping, atomic snapshot accounting, and
  review-first behavior.

## Exclusions and limits

No service, schema, migration, dependency, logging transport, or external data
provider changes. Browser/staging log aggregation remains outside local scope.
